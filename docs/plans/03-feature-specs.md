# Feature Specs — Phase 1–3 (everything except email/notifications)

Concrete specs for the other features called out in `01-roadmap.md`. Each one has: what it is, why it matters, what to build (schema + UI + components), estimated effort.

Email + Notifications has its own doc (`02-email-notifications.md`) because it's by far the biggest piece.

---

## Onboarding wizard

**Effort:** ~3 days

**Why:** Right now a new signup lands on the home page cold — no project, no work-type set, no avatar, no first session booked. Activation rate is the metric every other feature multiplies against. The first 10 minutes is when commitment forms.

**Where it lives:** Replace the current `OnboardingModal` (which only asks for display name). New route or modal that fires on first login when `profile.onboarding_completed = false`.

**Steps** (each skippable but pushes the next):

1. **Welcome + display name + photo** — single screen, takes 30s. Avatar upload via existing pipeline.
2. **Work type** — pick from existing curated list (designer / developer / writer / founder / etc.). Single select. Reuses existing chip UI.
3. **Timezone + city** — country picker + city input. Reuses existing location UI.
4. **First project** — "What's the macro goal you're chipping at?" — title only (description optional). Uses ProjectService.createProject.
5. **First session** — opens DeclareSessionModal pre-populated with their just-created project pinned, default 25-min, single-tap to schedule for the next aligned 30-min slot. Or "skip for now" → home.

**On completion:** Sets `profile.onboarding_completed = true`, navigates to `/home` with the momentum chips already lit, fires `onboarding_day_1` notification deferred for 24h.

**Skip behaviour:** Every step has a "Skip for now" link. Skipping all 5 still flips `onboarding_completed = true` so it doesn't re-fire, but the user lands on home with a partly-empty profile. The Onboarding Checklist component on the home page already handles this — it'll show the missing steps as incomplete.

**Build order:**
1. New file `src/core/features/onboarding/OnboardingWizard.tsx` (5-step modal pattern matching IntentionWizard.tsx)
2. Mount in CoreApp instead of `OnboardingModal` when `profile.onboarding_completed === false`
3. Step 4 reuses ProjectEditorModal logic
4. Step 5 reuses DeclareSessionModal with pre-populated props

**Open question:** Should step 4 (project) and step 5 (session) be combined into a single "What are you focused on, and want to start a session?" screen? Probably yes — keeps the funnel tighter. Test with one user first.

---

## End-of-session feedback

**Effort:** ~2 days

**Why:** Sessions currently capture outcome (`finished` / `partially` / `something_came_up`) but never capture whether the pairing worked. Without this data, the future matching engine has nothing to learn from.

**Schema:**

```sql
create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.focus_sessions(id) on delete cascade,
  -- Who gave the feedback
  rater_user_id uuid not null references public.profiles(id) on delete cascade,
  -- Optional: who the feedback is about (null for group-energy feedback)
  about_user_id uuid references public.profiles(id) on delete cascade,
  -- 'pair' rating: 👍 / 👎 (for 1-on-1, about the partner)
  pair_rating text check (pair_rating in ('thumbs_up', 'thumbs_down')),
  -- 'energy' rating: 1-5 stars (for group, about the room overall)
  energy_rating smallint check (energy_rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, rater_user_id, about_user_id)
);

create index session_feedback_about_user_idx on public.session_feedback(about_user_id);

alter table public.session_feedback enable row level security;
create policy "session_feedback_select_own_or_about_me"
  on public.session_feedback for select
  using (rater_user_id = auth.uid() or about_user_id = auth.uid());
create policy "session_feedback_insert_self"
  on public.session_feedback for insert
  with check (rater_user_id = auth.uid());
```

**UI:** Extend `SessionSummaryPage.tsx`. After the existing outcome question is answered:

- For 1-on-1 sessions where the partner showed up: small card "How was it with [partner name]?" with two pill buttons — 👍 Great fit / 👎 Not a great fit, plus an optional one-line "Anything you want to note?" textarea.
- For group sessions: "How was the energy?" 1-5 stars.
- Skip is fine — feedback is optional.

**Doesn't show twice:** Use the unique constraint on `(session_id, rater_user_id, about_user_id)`. If feedback already exists, hide the question.

**Privacy:** The `about_user_id` user can see their own ratings via `select_own_or_about_me`. This is intentional — being able to see your own reputation matters. Aggregate scores stay private to the matching engine; raw thumbs-down notes never surface to the rated user (just the aggregate counts).

**Build order:**
1. SQL migration + RLS
2. Add `submitSessionFeedback()` to `SessionService`
3. Extend `SessionSummaryPage` to show the feedback card after outcome submission
4. Done

---

## Drop-in matching ("Match me now")

**Effort:** ~3 days

**Why:** Focusmate's killer feature. For users with 15 free minutes RIGHT NOW, the calendar interface is friction. Without drop-in, we're "Focusmate but slower."

**UX:** Prominent button on `/sessions` (and home page) — "Find me a partner now." Tapping:

1. Opens a small modal: pick duration (25/50/90), mode (group / 1-on-1), quiet preference
2. Inserts a row into `drop_in_requests` with these params
3. Server-side function looks for any other open request from the last 5 minutes matching params (with relaxed criteria — see below)
4. If match found: spin up a 1-on-1 session, both users get navigated into it, both `drop_in_requests` marked `matched`
5. If no match yet: show "Waiting for someone…" UI for up to 90s with a live count of users currently looking, then "Nobody matched in 90s — your session is now an open public slot, share the link or wait"

**Schema:**

```sql
create table public.drop_in_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_minutes smallint not null check (duration_minutes in (25, 50, 90)),
  preferred_mode text not null check (preferred_mode in ('group', 'one_on_one')),
  quiet_mode boolean not null default false,
  status text not null default 'searching'
    check (status in ('searching', 'matched', 'expired', 'cancelled')),
  matched_session_id uuid references public.focus_sessions(id) on delete set null,
  matched_with_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now()
);

create index drop_in_requests_searching_idx
  on public.drop_in_requests(status, expires_at)
  where status = 'searching';

alter table public.drop_in_requests enable row level security;
create policy "drop_in_requests_select_searching"
  on public.drop_in_requests for select
  to authenticated using (true);  -- everyone sees waiting requests for matching
create policy "drop_in_requests_all_self"
  on public.drop_in_requests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

**Matching RPC:**

```sql
create function public.find_drop_in_match(p_request_id uuid)
returns uuid as $$
declare
  v_req drop_in_requests;
  v_match drop_in_requests;
begin
  select * into v_req from drop_in_requests where id = p_request_id for update;
  if v_req.status != 'searching' then return null; end if;

  -- Find another searching request, same duration ±0, preferred_mode='one_on_one',
  -- not the same user, expires_at not yet passed.
  -- Tiebreaker: longest-waiting.
  select * into v_match
  from drop_in_requests
  where status = 'searching'
    and user_id != v_req.user_id
    and duration_minutes = v_req.duration_minutes
    and preferred_mode = v_req.preferred_mode
    and quiet_mode = v_req.quiet_mode
    and expires_at > now()
  order by created_at asc
  limit 1
  for update;

  if v_match.id is null then return null; end if;

  -- Create the session and mark both requests matched
  -- (insert into focus_sessions, etc — full body omitted for brevity)
  -- ...

  return v_session_id;
end $$ language plpgsql security definer;
```

**UI flow:**
1. `src/core/features/sessions/DropInMatchButton.tsx` — the big primary button
2. `src/core/features/sessions/DropInMatchModal.tsx` — picker + waiting state
3. Realtime subscription on `drop_in_requests` filtered to the user's id — when status flips to `matched`, navigate to the new session

**"Why this match" — show transparently:**
After matching, the modal shows: *"Matched with Sarah — both wanted 25min, both writing this morning, both quiet mode."* This is the seed for Phase 3's compatibility surface — keep the same pattern.

**Edge case:** If a user backs out of the modal while searching, set `status='cancelled'`. If their request expires without a match, `status='expired'` and the modal offers "Schedule one instead" → opens DeclareSessionModal pre-populated.

---

## Camera modes (camera-on / audio-only / presence-only)

**Effort:** ~1 day

**Why:** The "Invisible Presence" idea minus the AI theatre. Lowers activation energy for showing up — body doubling works even without video.

**Schema:**

```sql
alter table public.focus_sessions
  add column if not exists video_mode text
    check (video_mode in ('video_on', 'audio_only', 'presence_only'))
    default 'video_on';
```

**UI in DeclareSessionModal:** Next to the existing Quiet Mode toggle, a 3-option segmented picker:

```
Video mode:
  [Camera on] [Audio only] [Presence only]
```

With helper text under each:
- Camera on: "Show face and presence"
- Audio only: "Mic only, no video tile"
- Presence only: "No mic or video — just an 'I'm here' indicator"

**In ActiveSessionPage:**
- `video_mode = 'video_on'`: current Jitsi embed behaviour
- `video_mode = 'audio_only'`: Jitsi embed configured with `startWithVideoMuted: true` + hide the video tile, show a simple "Mic is live" indicator
- `video_mode = 'presence_only'`: NO Jitsi embed. Instead, a simple page showing both participants' avatars with a "✓ Here" indicator that pings every 30s via realtime. Tap the partner's avatar to send a quick text reaction (👋 ✓ 🔥 — written via dm_messages with a special metadata flag).

**Defaults:** `video_on` for backwards compat. Could later add a profile-level default preference if useful.

**Compatibility with quiet_mode:** Quiet mode + audio_only = mic muted by default in Jitsi. Quiet mode + presence_only = no audio path at all, just text reactions.

---

## Stuck → Help match flow

**Effort:** ~2 days

**Why:** Right now "Stuck" is just a post type. It can sit there with one 🙏 and no actual help. Closes a half-built loop into a real value loop that's unique to SharedMinds.

**UX:** On any `community_posts` row where `post_type = 'stuck'`, show a "Help out" button next to the reaction row. Visible to anyone except the original poster.

**Tapping "Help out":**
1. Opens DeclareSessionModal pre-populated:
   - `initialGoal` = the post's content (e.g. "Help with: stuck on auth flow")
   - `sessionMode` = `'one_on_one'`
   - `initialPartnerUserId` = the original poster (NEW prop)
   - `initialDuration` = 25 (small block makes it easy to offer)
2. On schedule, the session is created with the partner already filled in (no need for the poster to "claim" the open slot)
3. Notification fires to the poster: "[Helper] offered to help with your stuck post — they've scheduled a 25-min session for [time]"
4. Notification gives the poster an "Accept" / "Reschedule" / "Decline" choice
5. If accept: session moves to confirmed status. If decline: session is cancelled and helper is notified gently.

**Schema:** Existing `focus_sessions` table supports this — `user_id` is the helper, `partner_user_id` is the poster. We just need to:
- Add `originating_post_id` column to track provenance (nullable)
- Maybe add `partner_accept_status` text ('pending' / 'accepted' / 'declined') for the gate

**UI side:**
- `PostCard` gains the "Help out" button (only for `stuck` posts, only when viewer is not the author)
- `DeclareSessionModal` accepts `initialPartnerUserId` (new prop) which pre-fills the partner field (need to add a partner-picker UI — currently the modal only has goal/duration/mode/etc but not "who's the partner")
- Notification template for the "offered to help" alert

**Optional polish:** Show in the community feed under the original stuck post — "Tom is helping out, session at 3pm" as a small inline marker once the session is accepted.

---

## Preference tags

**Effort:** ~1 day

**Why:** Foundation for the transparent matching system. A single 30-second decision drives every matching surface afterwards.

**Schema:**

```sql
alter table public.profiles
  add column if not exists pref_energy text[]
    check (pref_energy <@ array['deep_work', 'admin', 'creative']),
  add column if not exists pref_chattiness text
    check (pref_chattiness in ('silent', 'light_chat', 'collaborative')),
  add column if not exists pref_default_duration smallint
    check (pref_default_duration in (25, 50, 90))
    default 50;
```

**UI:** Add to Settings → Profile section as a new "Working preferences" card:

```
Working preferences

When I focus best:
  □ Deep work    □ Admin    □ Creative

How I like sessions:
  ○ Silent — just presence
  ● Light chat at start and end
  ○ Collaborative — talking through work

My default session length:
  ○ 25 min    ● 50 min    ○ 90 min
```

Also surface in the onboarding wizard (step 2 or 3).

**Where it's used:** Suggested-connections sorting, drop-in matching filters, the compatibility "why" surface (next section).

---

## Compatibility "why" surface

**Effort:** ~2 days

**Why:** Suggestions feel arbitrary right now. *Why* is this person suggested? If users can't see reasoning, they don't trust the suggestion. Transparent rule-based wins vs. ML black-box at small scale.

**Implementation:** No new table. A `getCompatibilityReasons(userIdA, userIdB)` service function returns an ordered array of reason strings based on cheap SQL:

```typescript
// src/core/services/CompatibilityService.ts

export interface CompatibilityReason {
  emoji: string;
  text: string;
}

export async function getCompatibilityReasons(
  userIdA: string,
  userIdB: string,
): Promise<CompatibilityReason[]> {
  const reasons: CompatibilityReason[] = [];

  // 1. Past sessions together — strongest signal
  const sharedSessions = await countSharedSessions(userIdA, userIdB);
  const positiveRatings = await countPositiveRatings(userIdA, userIdB);
  if (sharedSessions >= 2 && positiveRatings === sharedSessions) {
    reasons.push({ emoji: '👍', text: `Last ${sharedSessions} sessions: all great` });
  } else if (sharedSessions >= 1) {
    reasons.push({ emoji: '🔁', text: `${sharedSessions} session${sharedSessions === 1 ? '' : 's'} together` });
  }

  // 2. Same timezone hour-window
  const tzMatch = await sameWorkingHours(userIdA, userIdB);
  if (tzMatch) reasons.push({ emoji: '🕐', text: 'Same working hours' });

  // 3. Same work type
  const workMatch = await sameWorkType(userIdA, userIdB);
  if (workMatch) reasons.push({ emoji: '🤝', text: `Both ${workMatch}` });

  // 4. Same chattiness preference
  const chatMatch = await sameChattiness(userIdA, userIdB);
  if (chatMatch) reasons.push({ emoji: '🗣️', text: `Both prefer ${chatMatch.replace('_', ' ')} sessions` });

  // 5. Same energy preference
  const energyMatch = await sharedEnergyPrefs(userIdA, userIdB);
  if (energyMatch.length > 0) {
    reasons.push({ emoji: '⚡', text: `Both ${energyMatch.join(' + ')}` });
  }

  // Cap at 2-3 most relevant
  return reasons.slice(0, 3);
}
```

**Where it's used:**
- `/people` Suggested for you cards: show reasons under the avatar
- Drop-in matching modal: show during the match-success animation
- Profile page when viewing someone else: small "Why you might pair well" card
- Connection request UI: surface 2 reasons in the suggested-connection cards

**Visual:** Compact pill-row:

```
🕐 Same working hours  ·  🤝 Both founders  ·  👍 Last 2 sessions: great
```

**Why no score number:** Triggers gaming and makes people feel computed. Reasons feel like a thoughtful human matched you.

---

## Regulars (past-session memory)

**Effort:** ~2 days

**Why:** This IS the small-N compatibility scoring. Just past behaviour. Hard to game, easy to trust. Re-booking is 10x easier than first-time matching and is the metric that drives real accountability relationships.

**Definition of a Regular:** A user with whom you've completed 2+ sessions where both:
- Sessions completed with status `'completed'`
- Both `session_feedback.pair_rating = 'thumbs_up'` (or no thumbs-down)

**Implementation:** Pure SQL view or service function:

```typescript
// In CompatibilityService or new RegularsService

export async function fetchRegulars(): Promise<RegularUser[]> {
  // Get users I've sessioned with 2+ times, no thumbs-down from either side
  const { data } = await supabase.rpc('get_my_regulars');
  return data ?? [];
}
```

```sql
create or replace function public.get_my_regulars()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  work_type text,
  shared_session_count int,
  last_session_at timestamptz
) as $$
  with my_id as (select auth.uid() as id)
  select
    other.id, other.display_name, other.avatar_url, other.work_type,
    count(*)::int as shared_session_count,
    max(fs.start_time) as last_session_at
  from focus_sessions fs
  join profiles other on other.id = case
    when fs.user_id = (select id from my_id) then fs.partner_user_id
    else fs.user_id
  end
  where ((fs.user_id = (select id from my_id) and fs.partner_user_id is not null)
      or (fs.partner_user_id = (select id from my_id)))
    and fs.status = 'completed'
    -- Exclude any session that got a thumbs-down from either party
    and not exists (
      select 1 from session_feedback sf
      where sf.session_id = fs.id and sf.pair_rating = 'thumbs_down'
    )
  group by other.id, other.display_name, other.avatar_url, other.work_type
  having count(*) >= 2
  order by max(fs.start_time) desc;
$$ language sql security definer;
```

**Where it's used:**
- New "Regulars" section in DeclareSessionModal — when picking partner, your Regulars surface at the top with a small ⭐ badge
- New section on the Sessions page sidebar: "Book a Regular" with 3-5 cards
- Optional: weekly digest email — "You haven't sessioned with Sarah in 3 weeks. Catch up?"

**The compound effect:** Two users who become Regulars are dramatically more retained than two users who sessioned once. This metric will be the single best leading indicator of LTV.

---

## Streak weekly target

**Effort:** ~1 day

**Why:** Cheap behavioural anchor. Duolingo / Strava playbook: visible weekly target, visible progress, gentle nudges.

**Schema:**

```sql
alter table public.profiles
  add column if not exists weekly_session_target smallint not null default 3
    check (weekly_session_target between 1 and 14);
```

**UI:**

1. **Settings → Working preferences** — add a row: "How many sessions do you want to aim for each week?" with a 1–7 slider.
2. **Home page** — replace existing day-streak chip with a weekly-progress chip: `2 / 3 sessions this week` with a small progress bar.
3. **Sunday evening nudge** (already covered by the weekly review prompt notification, but the email can include "you finished X of Y" inline).

**Done state:** When the user hits their target, the chip shows `✓ 3 / 3 sessions this week — goal hit` in green for the rest of the week.

---

## Pattern reflection

**Effort:** ~2 days

**Why:** Users do sessions and finish them but never *learn* anything systematic about their own patterns. The product collects rich data and gives nothing back. This is where SharedMinds feels smarter than the user's own awareness — purely from SQL, no AI.

**Implementation:** A `getWeeklyPatterns(userId, weekStart)` service function returns a structured object:

```typescript
export interface WeeklyPatterns {
  sessionCount: number;
  totalMinutes: number;
  averageDuration: number;
  finishRate: number;
  bestDay: { day: string; count: number };
  mostFinishedProject: { id: string; title: string; count: number } | null;
  longestStreak: number;
  topPartner: { id: string; name: string; count: number } | null;
}
```

All from existing tables (`focus_sessions` + `projects`). No new data needed.

**UI:** Add to `/reflection`'s "Last week" tab as a new "Patterns" card above the intentions review:

```
PATTERNS — week of May 12-18
──────────────────────────────
• You finished 7 sessions (3h 25m total)
• Best day: Tuesday (3 sessions)
• Most-finished project: Q4 Pitch Deck
• Most-frequent partner: Sarah (4 sessions)
• Average session: 49 min · 82% finish rate
```

Plain text, dense, no charts. Feels like a friend who's been paying attention.

**Optional polish:** A weekly auto-summary card on the home page in the first 24 hours after the previous Monday (so the patterns are fresh for the review).

---

## Build sequence summary

Recommended order across the 3 weeks (assuming email infra is happening in parallel, see `02-email-notifications.md`):

| Day | Build |
|---|---|
| 1-3 | Email + Notifications Phase 1.A (foundations) |
| 4-6 | Onboarding wizard |
| 7 | End-of-session feedback (small, can slot in here) |
| 8-10 | Email + Notifications Phase 1.B + 1.C (reactive + scheduled) |
| 11-13 | Drop-in matching |
| 14 | Camera modes |
| 15-16 | Stuck → Help match flow |
| 17 | Preference tags |
| 18-19 | Compatibility "why" surface |
| 20-21 | Regulars |

Phase 4 features (streak target, pattern reflection) slot in as small wins between bigger pieces.

---

## What each feature depends on

- Stuck → Help match flow depends on **email/notifications** (the "Tom offered to help" alert)
- Drop-in matching depends on **realtime subscription infrastructure** (already in place)
- Compatibility "why" surface depends on **end-of-session feedback** existing (for past-session signals)
- Regulars depends on **end-of-session feedback**
- Pattern reflection depends on **end-of-session feedback** (for partner data) but works without it (degrades gracefully)
- Streak target depends on nothing — can build any time

So end-of-session feedback (Day 7) is a load-bearing piece for half of Phase 3.

Email/Notifications is foundational for the Stuck → Help loop, session reminders, and onboarding drips.

**The critical path: email + feedback. Get those done in the first week.**
