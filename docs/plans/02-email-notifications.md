# Email + Notifications — Implementation Plan

The single biggest piece of foundational work before anything else compounds. Combines in-app notifications (bell icon inbox) and transactional/scheduled email into **one unified pipeline** sharing the same notifications table.

---

## Why unified, not separate

A naive build would have one system for in-app notifications (bell icon) and a separate system for emails. That doubles maintenance, breaks read-state sync, and makes digest mode impossible.

**This plan: notifications are events, channels are delivery.** One write to `notifications` fans out to:
- The in-app inbox (reads directly from the table)
- The email channel (triggered via DB webhook → Edge Function → Resend)
- Future channels (web push, SMS, Slack) — same pipeline, just more workers

---

## Email types — what we're sending

12 distinct emails, priority-ranked:

| # | Email | Trigger | Priority |
|---|---|---|---|
| 1 | Welcome / verify | Signup (Supabase Auth handles) | Critical |
| 2 | Session reminder — 24h before | Cron, for any scheduled session you've joined | Critical |
| 3 | Session reminder — 15min before | Cron, joined sessions | Critical |
| 4 | Weekly review prompt | Sunday 18:00 local | High |
| 5 | Onboarding drip — Day 1 | "Book your first session" | High |
| 6 | Onboarding drip — Day 3 | "Complete your profile, add a project" (if incomplete) | High |
| 7 | Onboarding drip — Day 7 | "Your first week — set 3 intentions" (if incomplete) | High |
| 8 | New DM | When inactive 24h+ and message arrives | Medium |
| 9 | Reply to your community post | Real-time, throttled per-thread | Medium |
| 10 | Project invite (email-link) | When generated | Medium |
| 11 | Connection request | Real-time | Medium |
| 12 | Recurring community session — next instance | 6h before | Medium |

**Already handled by Supabase Auth**: signup confirmation, magic link, password reset. Configure the templates in Supabase dashboard — don't rebuild.

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Sending | **Resend** | Stripe-quality DX, React Email native, $20/mo for 50k emails (free up to 3k/mo), handles DKIM/SPF/DMARC when you verify the domain |
| Templates | **React Email** | JSX components, version-controlled, type-safe, `npm run preview` to render in browser |
| Trigger (reactive) | **Supabase DB Webhook → Edge Function** | DB-driven sends (someone replied → fire email) |
| Trigger (scheduled) | **Supabase Edge Function + pg_cron** | Session reminders, weekly prompts, drip campaigns |
| Source of truth | `notifications` table | Powers both in-app inbox AND email queue |
| Per-user prefs | `notification_preferences` table | Per-category opt-in/out + master kill switch |

I considered Postmark (great for transactional), SendGrid (too enterprise-y), AWS SES (cheap but you build templates from scratch). At SharedMinds' scale, **Resend wins on speed-to-build**.

---

## Schema

```sql
-- ============================================================
-- 1. notifications — events, denormalised for emails
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'session_reminder_24h',
    'session_reminder_15min',
    'weekly_review_prompt',
    'onboarding_day_1',
    'onboarding_day_3',
    'onboarding_day_7',
    'new_dm',
    'post_reply',
    'post_reaction',
    'connection_request',
    'connection_accepted',
    'project_invite',
    'community_session_reminder'
  )),
  title text not null,          -- denormalised so emails don't re-query
  body text not null,
  related_id uuid,              -- session/post/dm id depending on type
  deep_link text,               -- '/messages/abc', '/community#post-xyz'
  read_at timestamptz,          -- when user opened it in-app
  email_sent_at timestamptz,
  email_status text check (email_status in ('queued', 'sent', 'failed', 'skipped', 'digest_queued')),
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_self"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_self"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts come from triggers + service-role, not user-driven
-- (no INSERT policy = no direct user inserts)


-- ============================================================
-- 2. notification_preferences — per-user channel + category prefs
-- ============================================================
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_session_reminders boolean not null default true,
  email_messages boolean not null default true,
  email_post_replies boolean not null default true,
  email_connection_requests boolean not null default true,
  email_weekly_review boolean not null default true,
  email_onboarding boolean not null default true,
  email_community_sessions boolean not null default true,
  email_marketing boolean not null default false,  -- opt-in
  digest_mode text not null default 'realtime'
    check (digest_mode in ('realtime', 'daily', 'off')),
  -- "Send DM email only if inactive for X hours"
  dm_inactivity_threshold_hours int not null default 24 check (dm_inactivity_threshold_hours >= 0),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "notif_prefs_all_self"
  on public.notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bootstrap on profile create
create or replace function public.create_notification_prefs_for_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_preferences (user_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notif_prefs on public.profiles;
create trigger profiles_create_notif_prefs
after insert on public.profiles
for each row execute function public.create_notification_prefs_for_profile();


-- ============================================================
-- 3. email_events — Resend webhook tracking
-- ============================================================
create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  provider_id text,             -- Resend message id
  event_type text not null,     -- delivered, bounced, complained, opened, clicked
  payload jsonb,
  created_at timestamptz not null default now()
);

create index email_events_notification_idx on public.email_events(notification_id);
```

---

## Build phasing

### Phase 1.A — Foundations (3 days)

**Day 1**
- [ ] Resend account + verify `sharedminds.app` domain — kick this off FIRST, DNS propagation takes hours
  - Add SPF TXT record (`v=spf1 include:_spf.resend.com ~all`)
  - Add DKIM CNAME records (Resend gives you 3)
  - Add DMARC TXT record (`v=DMARC1; p=none; rua=mailto:dmarc@sharedminds.app`)
- [ ] Schema migration `20260520000001_notifications.sql` (the SQL above)
- [ ] Backfill: insert one `notification_preferences` row per existing profile
- [ ] `NotificationService` (src/core/services/NotificationService.ts):
  - `listNotifications(opts: { unread?, limit? })`
  - `markRead(id)` / `markAllRead()`
  - `getPreferences()` / `updatePreferences(patch)`
  - `subscribeToNew(onInsert)` — Supabase realtime channel

**Day 2**
- [ ] Bell icon + dropdown component in Layout's nav (between avatar dropdown and notification icon)
  - Red dot with unread count
  - 360px dropdown showing last 20 notifications grouped by date
  - Click notification → mark read + navigate to deep_link
  - "Mark all read" link in header
  - Empty state copy
- [ ] Settings → Notifications panel
  - All toggles from the table above
  - "Daily digest at 7pm" radio
  - "Send test email" button (admin only initially)

**Day 3**
- [ ] React Email scaffold under `emails/` directory:
  ```
  emails/
    components/  (Footer, Header, Button, FooterUnsubscribe)
    templates/   (one tsx per email type)
    index.ts     (template registry)
  ```
- [ ] Supabase Edge Function `send-notification-email`:
  - Receives `{ notification_id }` payload
  - Loads notification + user + prefs in one query
  - Checks: is the relevant `email_*` pref true? Is digest_mode = 'realtime'?
  - Renders the right template via React Email's render
  - Calls Resend `emails.send()`
  - Updates `notifications.email_sent_at` + `email_status`
- [ ] DB webhook on `notifications` INSERT calling the Edge Function
- [ ] First 3 templates: Welcome, DM, Post reply

### Phase 1.B — Reactive emails (2 days)

**Day 4**
- [ ] Wire existing reactive events to ALSO insert `notifications`:
  - `dm_messages` INSERT trigger → notification of type `new_dm`
  - `community_post_replies` INSERT trigger → notification of type `post_reply`
  - `community_post_reactions` INSERT trigger → notification of type `post_reaction` (throttle: max 1 per post per hour)
  - `connections` INSERT trigger (status='pending') → notification of type `connection_request`
  - `connections` UPDATE trigger (status flipped to 'accepted') → notification of type `connection_accepted`
  - `project_invites` INSERT trigger → notification of type `project_invite` to the invited email's account if found

**Day 5**
- [ ] Templates: Connection request, Connection accepted, Project invite, Post reaction (digest only)
- [ ] DM inactivity gating in Edge Function: skip email if `auth.users.last_sign_in_at < dm_inactivity_threshold_hours` ago

### Phase 1.C — Scheduled emails (3 days)

**Day 6**
- [ ] Edge Function `cron-scheduled-emails` (runs every 5 min)
- [ ] pg_cron schedule: `select cron.schedule('scheduled-emails', '*/5 * * * *', 'select net.http_post(...)')`
- [ ] Session reminder logic:
  - Every 5 min, find `focus_sessions` where `scheduled_at` is in [now+23h55m, now+24h05m] and status='scheduled' → insert `session_reminder_24h` notifications for the user and any partner
  - Same with [now+13min, now+17min] for `session_reminder_15min`
  - Idempotency: don't insert if a notification of that type already exists for the session/user pair

**Day 7**
- [ ] Weekly review Sunday prompt
  - Find users where current local time is Sunday 18:00 (±5 min) AND no `weekly_review_prompt` notification this week → insert
- [ ] Recurring community session reminder
  - Find materialized sessions starting in [now+5h55m, now+6h05m] with `session_purpose IS NOT NULL` → notify all users
- [ ] Templates: Session reminder 24h, Session reminder 15min, Weekly review, Community session reminder

**Day 8**
- [ ] Onboarding drip
  - For each user where `created_at` ≈ now() - interval '1 day' (±12h) → insert `onboarding_day_1`
  - For each user where `created_at` ≈ now() - interval '3 days' (±12h) AND `projects.count(user) = 0` → insert `onboarding_day_3`
  - For each user where `created_at` ≈ now() - interval '7 days' (±12h) AND no weekly_reflections row → insert `onboarding_day_7`
- [ ] Templates: Day 1, Day 3, Day 7 (each opinionated, see voice guide below)

### Phase 1.D — Polish (1–2 days)

- [ ] Daily digest mode: separate cron job runs 19:00 local per user, bundles unread last-24h notifications into one digest email
- [ ] Unsubscribe links per category: signed token, no auth required, updates `notification_preferences`
- [ ] Resend webhook endpoint for delivered/bounced/complained — writes to `email_events`
- [ ] Bounce handling: if a user's email bounces 3 times in 30 days, auto-set `digest_mode='off'` and add an admin alert

---

## Resend setup checklist

```
☐ Sign up for Resend account
☐ In Resend dashboard → Add domain: sharedminds.app
☐ Add the DNS records to your domain registrar:
    - SPF (TXT @): v=spf1 include:_spf.resend.com ~all
    - DKIM (CNAME x3): provided by Resend
    - DMARC (TXT _dmarc): v=DMARC1; p=none; rua=mailto:dmarc@sharedminds.app
☐ Wait for verification (usually <1h, can take up to 24h)
☐ Configure default sender identities:
    - hello@sharedminds.app  → "Matthew at SharedMinds"  (transactional, onboarding)
    - notify@sharedminds.app → "SharedMinds"             (system, digests)
☐ Set reply-to addresses to a real inbox you actually check
☐ Get the API key, store as RESEND_API_KEY in Supabase secrets:
    supabase secrets set RESEND_API_KEY=re_xxx
```

---

## Sender voice guide

Most products email like robots. SharedMinds is a community accountability product — emails should sound like *you* wrote them.

**Good** (Day 1 onboarding):

> Hi —
>
> Matt here, founder of SharedMinds. Welcome.
>
> You signed up yesterday. The question I'd ask before anything else: what's the one thing you want to finish this week?
>
> If you've got an answer, [book a 25-min focus block now]. If you don't, that's the better thing to figure out first.
>
> — Matt
> ps. reply to this email and I'll see it.

**Bad** (the SaaS default):

> Welcome to SharedMinds! 🎉
> We're excited to have you join our community of focused professionals.
> Get started by exploring our features...

The founding cohort needs to feel founded *for*. Sender name = "Matthew at SharedMinds" for transactional + onboarding. System emails (session reminders, digests) can be from "SharedMinds".

**Reply behaviour**: Reply-to = a real inbox. People will reply. Reply back. Founding-100 relationships compound.

---

## Edge Function — code outline

```typescript
// supabase/functions/send-notification-email/index.ts

import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderTemplate } from './templates'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

serve(async (req) => {
  const { notification_id } = await req.json()

  // 1. Load notification + user + prefs in one query
  const { data: row } = await supabase
    .from('notifications')
    .select(`
      id, type, title, body, deep_link, related_id, email_sent_at,
      user:profiles!notifications_user_id_fkey(id, display_name, email:auth_users(email))
      prefs:notification_preferences!user_id(*)
    `)
    .eq('id', notification_id)
    .single()

  if (!row || row.email_sent_at) return new Response('skipped', { status: 200 })

  // 2. Check pref for this type
  const prefKey = mapTypeToPrefKey(row.type)  // e.g. session_reminder_24h → email_session_reminders
  if (!row.prefs[prefKey]) {
    await markStatus(notification_id, 'skipped')
    return new Response('user opted out', { status: 200 })
  }

  // 3. If digest mode, defer to digest cron
  if (row.prefs.digest_mode === 'daily') {
    await markStatus(notification_id, 'digest_queued')
    return new Response('queued for digest', { status: 200 })
  }
  if (row.prefs.digest_mode === 'off') {
    await markStatus(notification_id, 'skipped')
    return new Response('digest off', { status: 200 })
  }

  // 4. Render + send
  const { subject, html } = await renderTemplate(row.type, {
    user: row.user,
    notification: row,
  })

  const { error, data: sendData } = await resend.emails.send({
    from: senderFor(row.type),
    to: row.user.email,
    subject,
    html,
    reply_to: 'matt@sharedminds.app',
    tags: [{ name: 'type', value: row.type }],
  })

  if (error) {
    await markStatus(notification_id, 'failed')
    return new Response(JSON.stringify(error), { status: 500 })
  }

  await supabase.from('notifications').update({
    email_sent_at: new Date().toISOString(),
    email_status: 'sent',
  }).eq('id', notification_id)

  return new Response('sent', { status: 200 })
})
```

---

## Vercel vs Supabase Edge Functions

**Recommendation: Supabase Edge Functions.**

| | Supabase Edge | Vercel API routes |
|---|---|---|
| Latency to DB | Same region, <10ms | Cross-network, 50–200ms |
| Free tier | 500k invocations/mo | 100k GB-h/mo (~50k short invocations) |
| Deploy speed | `supabase functions deploy` (~5s) | Git push, slower |
| Cold start | ~150ms | ~300ms (worse if Node, better on Edge) |
| Cron | Native via pg_cron | Need Vercel Cron addon |

The only reason to keep it Vercel-side is if you want a single deploy story. For email infra specifically, the DB-locality of Supabase Edge wins.

---

## Test plan for the first end-to-end

After Phase 1.A is done:
1. Open the app → bell icon visible in nav (empty state)
2. Open Settings → Notifications → toggle "Email me about session reminders" → confirm UI saves
3. SQL editor: `insert into notifications(user_id, type, title, body, deep_link) values ('<your-id>', 'session_reminder_24h', 'Test', 'Hello', '/sessions')` → confirm:
   - Bell icon shows red dot + count = 1
   - Email arrives in your inbox within ~30s
   - Click email link → lands on `/sessions`
4. Open bell dropdown → click the notification → bell empties, `read_at` populates

If those 4 steps work, the foundation is solid.

---

## What to skip in v1

- **SMS notifications** — premature unless you discover a real demand signal
- **Slack/Discord webhook integrations** — paid-tier candidate
- **In-app live toasts** — the bell dropdown is enough at small scale, toasts add complexity
- **Per-thread email muting** — overkill until people complain
- **Multi-language templates** — single language until international users are >10% of base

---

## Tomorrow's first move

1. Sign up for Resend, kick off DNS verification (do this BEFORE the schema work — DNS propagation eats 1–4 hours of wall-clock time)
2. While DNS propagates, write the schema migration (Phase 1.A Day 1 tasks)
3. By the time the bell icon UI is built, the domain is verified and you can send the first test email
