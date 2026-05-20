-- Unified notifications + email pipeline
--
-- One write to `notifications` fans out to two delivery channels:
--   * In-app inbox — bell-icon dropdown reads from this table directly
--   * Email — DB webhook fires an Edge Function that renders + sends via Resend
--
-- Per-user preferences gate each channel + type. Digest mode bundles
-- daily into one email instead of firing per-event.


-- ============================================================
-- 1. notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    -- Scheduled
    'session_reminder_24h',
    'session_reminder_15min',
    'weekly_review_prompt',
    'onboarding_day_1',
    'onboarding_day_3',
    'onboarding_day_7',
    'community_session_reminder',
    -- Reactive
    'new_dm',
    'post_reply',
    'post_reaction',
    'connection_request',
    'connection_accepted',
    'project_invite',
    'stuck_help_offered'
  )),
  -- Denormalised payload so the email render doesn't need to re-join
  title text not null,
  body text not null,
  -- Optional links for richer rendering
  related_id uuid,             -- session/post/dm/connection/project id
  deep_link text,              -- in-app navigation target, e.g. '/messages/abc'
  -- Channel delivery state
  read_at timestamptz,
  email_sent_at timestamptz,
  email_status text check (email_status in ('queued', 'sent', 'failed', 'skipped', 'digest_queued')),
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_all_idx
  on public.notifications(user_id, created_at desc);

-- Pending-email queue index (for the dispatcher Edge Function)
create index if not exists notifications_email_queue_idx
  on public.notifications(created_at)
  where email_sent_at is null and (email_status is null or email_status = 'queued');

alter table public.notifications enable row level security;

-- Read your own
create policy "notifications_select_self"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

-- Update only the read flag on your own
create policy "notifications_update_self"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- No direct user INSERT. Inserts come from triggers (SECURITY DEFINER)
-- and from service-role keys (admin / Edge Functions).


-- ============================================================
-- 2. notification_preferences
-- ============================================================
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Per-category email opt-out (defaults all on except marketing)
  email_session_reminders boolean not null default true,
  email_messages boolean not null default true,
  email_post_replies boolean not null default true,
  email_connection_requests boolean not null default true,
  email_weekly_review boolean not null default true,
  email_onboarding boolean not null default true,
  email_community_sessions boolean not null default true,
  email_marketing boolean not null default false,
  -- 'realtime' = send each event as it happens
  -- 'daily'    = bundle into one digest email at 19:00 local
  -- 'off'      = no emails at all (in-app still works)
  digest_mode text not null default 'realtime'
    check (digest_mode in ('realtime', 'daily', 'off')),
  -- Only send DM email if user has been inactive this long (in hours).
  -- 0 = always send. Prevents spamming people who are actively in-app.
  dm_inactivity_threshold_hours int not null default 24
    check (dm_inactivity_threshold_hours >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notif_prefs_select_self"
on public.notification_preferences for select
to authenticated
using (user_id = auth.uid());

create policy "notif_prefs_upsert_self"
on public.notification_preferences for insert
to authenticated
with check (user_id = auth.uid());

create policy "notif_prefs_update_self"
on public.notification_preferences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 3. Bootstrap notification_preferences for new profiles
-- ============================================================
create or replace function public.create_notification_prefs_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notif_prefs on public.profiles;
create trigger profiles_create_notif_prefs
after insert on public.profiles
for each row execute function public.create_notification_prefs_for_profile();

-- Backfill for any existing profiles missing prefs
insert into public.notification_preferences (user_id)
select p.id from public.profiles p
where not exists (
  select 1 from public.notification_preferences np where np.user_id = p.id
)
on conflict (user_id) do nothing;


-- ============================================================
-- 4. email_events — Resend webhook tracking
-- ============================================================
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  provider_id text,            -- Resend message id
  event_type text not null,    -- 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked' | 'unsubscribed'
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_events_notification_idx
  on public.email_events(notification_id);
create index if not exists email_events_type_idx
  on public.email_events(event_type, created_at desc);

alter table public.email_events enable row level security;

-- Users can see email events for their own notifications (debugging / transparency)
create policy "email_events_select_own"
on public.email_events for select
to authenticated
using (
  exists (
    select 1 from public.notifications n
    where n.id = email_events.notification_id
      and n.user_id = auth.uid()
  )
);

-- Admins can see everything (deliverability dashboards later)
create policy "email_events_select_admin"
on public.email_events for select
to authenticated
using (public.is_admin());

-- Inserts only from service role / Edge Functions (no user-facing policy)


-- ============================================================
-- 5. Helper: total unread count (avoids round-tripping)
-- ============================================================
create or replace function public.fetch_unread_notification_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications
  where user_id = auth.uid()
    and read_at is null;
$$;

grant execute on function public.fetch_unread_notification_count() to authenticated;
