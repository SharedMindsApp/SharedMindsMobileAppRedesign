# Changelog

All notable changes to SharedMinds. Format inspired by [Keep a Changelog](https://keepachangelog.com/).

Pre-1.0 versioning: each numbered release groups a day of meaningful work.
Bug fixes and small UX polish that ride alongside a feature ship are folded
into that release rather than getting their own entry.

**v1.0.0 is reserved for the public launch.** Pre-launch, all releases
stay in the 0.x.y range — semver convention treats `0.x` as pre-release
and uses the minor segment for breaking changes.

To cut a release: add entries under `[Unreleased]` as you ship, then run
`npm run bump:patch` (bug fix) or `npm run bump:minor` (feature, including
breaking changes pre-1.0). The script stamps the section with today's date
+ the new version and tags the commit. `npm run bump:launch` is the
explicit opt-in to cross the v1.0.0 boundary on launch day.


## [Unreleased]

### Added
- **Editable templates** — every weekly template is now fully editable: rename
  it and add / edit / delete blocks on any day (start time, duration, type,
  project). Adopting a preset drops you straight into the editor so it becomes
  genuinely yours, and you can build a template from scratch with "New blank
  template".
- **Planner settings** — a single gear (showing your current hours, e.g.
  "7am–10pm") on the home planner opens a settings sheet (popup on web,
  bottom-sheet on mobile) with the **day window** and **weekly templates**
  in one place. Also reachable from Settings → Account → "Planner & calendar".
- **Weekly time-block templates** — apply a saved template to this week or
  next (additive + idempotent, today-onward by default), or adopt a curated
  starter preset by mapping its project slots to your real projects and
  naming it. Applying reloads the planner grid in place.

### Changed
- **Sessions are camera-on** — removed the "Real world · away from screen"
  (no-camera, offline) option from the declare modal. Solo focus, body-double
  (camera required), and live modes remain.
- **"Match me now" actually matches you now** — it used to only ever open your
  own door (ignoring everyone already working), so it never paired you with
  anyone. It now opens a chooser that surfaces **live open doors to drop into**
  first (instant match via `claim_open_session`), with "Open my own door" as
  the fallback when nobody's available. The declare modal also shows a clear
  "your door's open" banner when hosting an open-to-match session.
- **Fewer auth round-trips on load** — globally-mounted shells (chat dock, layout,
  regulation context) each fired a network `auth.getUser()` (a `/auth/v1/user`
  request) on every page load. They now read the cached local session instead,
  cutting redundant calls — easier on the backend and faster to paint.
- **Day window is now universal** — the visible hour range you set applies to
  both the home planner *and* the sessions calendar, so the two views no
  longer contradict each other. (Previously the sessions calendar was a fixed
  6am–11pm regardless of your planner setting.)
- **Task detail sheet** — moved the Edit action down beside Delete in the
  footer, and Delete now arms an "are you sure?" confirm (matching "Let it
  go") instead of deleting on the first tap.

### Fixed
- **Declare-session modal: "Start" button was unreachable** — step 2's controls
  weren't in a scroll region, so on shorter viewports the modal overflowed its
  max height and clipped the footer, making it impossible to start the session.
  Step 2 now scrolls with the Back/Start footer pinned.
- **App-wide data stalls / infinite spinners** — supabase-js serialises auth
  token access through the Web Locks API and the default waits forever, so a
  stale lock held by another tab / a zombie context / rapid reloads could
  deadlock *every* authenticated query: home dashboard, "this week's sessions",
  templates and more spun indefinitely with no error. Replaced it with a
  process-local (in-tab) lock that can't be blocked by a stale cross-tab lock
  and times out rather than hanging.
- **Home page hanging on the loading skeleton** — the day-zero gate now always
  resolves (resolved-null + safety timeout), and returning users render
  instantly from a cached flag.
- **Week planner project tags** — fixed a scope bug where the week grid
  couldn't resolve project names for time blocks (the lookup map is now
  threaded into the week timeline).


## [v0.6.0] — 2026-05-28

Projects grow up: a real "+ New project" wizard, a planning board with
deadlines and difficulty, and a focused mobile add-task flow — plus a
round of home / PWA polish.

> **Migration required** (apply via Supabase dashboard, in order):
> `20260528000010_task_steps`, `20260528000011_session_state_of_mind`,
> `20260528000012_session_captures`, `20260528000020_phase_milestone_deadlines`.
> Reads degrade gracefully without them; writes (steps, deadlines, captures)
> need the columns/tables to exist.

### Added
- **Full guided New Project wizard.** "+ New project" now opens the complete
  setup flow (revived from onboarding): macro goal, colour, AI roadmap, and
  first tasks — not the old stub popup.
- **Bring-your-own-AI roadmap + tasks.** Copy a tailored prompt → paste the
  reply back. The AI can *validate* or *write* the milestones/phases, and
  *generate* the first tasks. Prompts carry completed milestones + overall
  progress so a "70% done but nothing ticked" mismatch can't happen.
- **New Project draft autosave** — the wizard persists to localStorage, so a
  refresh or lost connection no longer wipes your progress.
- **Project cover images** in the wizard (optional final step) — reuses the
  existing project-covers bucket; the colour gradient is the default.
- **Per-task cognitive load (Light / Medium / Deep)** captured in the wizard,
  shown on every task surface (home, board, backlog, detail sheet) and
  editable in the detail + add sheets.
- **Per-task start-day scheduling** in the wizard (Today / Tomorrow / This
  week / Backlog) so first steps land on a day, not in a void.
- **Dedicated Add-task sheet** on the project board: capture by hand, focus
  the AI on a milestone/phase, or "Help me figure out what to do" — which
  asks your mood and suggests next steps matched to your energy.
- **Project Week view as a vertical kanban** — each day shows To do → Active →
  Done lanes; tasks move with explicit, labelled buttons.
- **Phase + milestone deadlines** — an optional date plus a *flexible* (soft
  aim) or *hard* (firm) type, with on-target chips (On track / Due soon /
  Past aim / Overdue) at the phase, milestone, and project level.
- **In-session distraction parking lot** — capture a stray thought mid-session,
  triage it at debrief or from the home inbox.

### Changed
- **Home hero decluttered** — removed the passive identity/momentum chip row
  (Founding member · role · streak · session count); identity lives on
  Profile, counts live in the Stats tab.
- **Task detail sheet** — discoverable "✎ Edit", taller sheet, 140-char title
  limit with counter; backlog rows are now tappable to edit.
- **Project backlog rows** restructured into two rows (title, then actions)
  with controls always visible on mobile.
- **Curated project colour palette** — dropped near-duplicates, added neutrals
  (grey / taupe / cream), and flags a colour already used by another project.
- **Tasks decoupled from sessions** — tapping a task opens a "work on this"
  sheet (scheduling a session is one optional action), never forced.

### Fixed
- **Mobile PWA home planner** header no longer squashes its controls into
  vertical-text slivers; the "Today" day-strip badge no longer wraps.
- **"Pick day" menu** offers the next 7 days from today instead of surfacing
  days already past.

## [v0.5.0] — 2026-05-27

The community-coworking flywheel: open-to-match, real notifications, and the
mobile redesign pass. Plus the route-level code splitting that finally gets
cold-load time under control.

### Added
- **Open-to-match flow.** "Match me now" no longer drops you into a waiting
  room. Clicking it starts a real solo session flagged `open_to_match=true`;
  other online users see it in the new "Drop in · live now" lane (FindSessionsSheet
  + a passive home-page strip) and claim a slot via the race-safe
  `claim_open_session` RPC. No more wasted-wait failure mode.
- **Matched-session choreography.** Synthesised join / leave / knock /
  phase-transition chimes (Web Audio, no asset weight). Music ducks to 20%
  during the intro phase. Intro overlay with vibe-aware countdown
  (silent / brief_hi / chatty). Mics auto-mute on the intro→work boundary
  when the host's vibe isn't "chatty".
- **Reminder scheduler.** `session_reminder_5min` and `session_missed`
  notifications actually fire now — the schema defined them but no code
  ever created them. Plus a `session_now` ping if a scheduled session
  passes its start time without being kicked off.
- **Streak nudges + UI.** Daily `streak_at_risk` notification at 19:00 UTC
  for opt-in users with a ≥2-day streak. Home-page streak chip ("3-day
  streak") via new `current_streak()` RPC.
- **In-app notification preferences.** 10 categories × 2 channels (in-app,
  email) matrix in Settings. Quiet-hours window for habit nudges. BEFORE
  INSERT gate at the DB level so disabled categories never bloat the unread
  badge.
- **Full-screen `/notifications` page.** Tapping the bell on mobile
  navigates here instead of opening a cramped dropdown — iOS-style.
- **People page filters redesigned.** Three horizontal-scroll chip rows
  collapsed into a single bar with pop-out pickers (search-within for skills
  and countries). Active filter shown inline on the pill; ✕ to clear.
- **Chat page (mobile) redesigned.** Retired Community/Direct tabs in
  favour of a messenger-style unified list — Community pinned at top,
  edge-to-edge DM rows below, sticky search, + FAB above the bottom nav.
- **Session SFX toggle.** New row in Settings → Notifications. "Preview"
  button auditions all four chimes.
- **Music albums expanded.** Dusk (Middle Eastern modal), Drive, and Score
  doubled with thematic sibling tracks. Album "open" renamed to "zen" with
  the Japanese East-Asian aesthetic.

### Changed
- **Mark-as-read** removes the row from the visible list instead of greying
  it out. Same behaviour for "Mark all read" — clears the inbox. Rows
  persist in the DB with `read_at` set for any future archive view.
- **DM notifications retired from the bell.** The `dm_messages_notify`
  trigger is dropped; the Chat tab badge is now the single source of truth
  for DM unread, matching LinkedIn / Facebook / X.
- **Cold load to `/sessions` is ~72% smaller.** Each authenticated route is
  now `React.lazy()`-loaded. Was ~375 KB gzipped of JS-to-parse, now ~112 KB
  (vendor cached). Layout chrome stays visible during chunk load via a
  `Suspense` fallback inside the `Outlet`.

### Fixed
- Mobile PWA header was missing the notifications bell entirely — the
  `<NotificationsBell />` was nested inside a `hidden md:flex` cluster.
- `shouldShowNotificationBell()` was defined but never called — bell used
  to show on auth / onboarding / landing routes where it shouldn't.
- `create_session_reminders()` DB function referenced a renamed column
  (`fs.goal` → `fs.session_goal`); dropped (superseded by
  `schedule_session_reminders`).
- `get_shared_project_view()` was declared `STABLE` but writes to
  `last_viewed_at`; marked `VOLATILE`.
- Debrief opens immediately when timer hits 0 (was lagging up to 1s).
- Pure-white light themes; music UI restored on the session page.
- Pinned activity label appears immediately on page load.
- Quick Timer dropdown overflow in the sessions sidebar.
- Custom-activity duration field accepts free typing.

### Added (earlier in the day, before the open-to-match push)
- **Session templates.** Structured solo + group focus sessions with
  configurable segments.
- **End-of-session chimes + completion burst animation.**
- **Even-distribution audio visualizer** with 3 styles + off toggle.
- **TIMER vs SOLO pill** on the calendar — distinguishes Quick Timer rows
  from full Solo sessions.
- **Edit + cancel scheduled sessions** directly from the calendar.
- **Pin a go-to activity** in the Quick Timer.
- **Activity Manager** — prune, customise, browse a library of activities.
- **Search across activities + library** in the Quick Timer dropdown.
- **Quick Activities + scheduling** on the Quick Timer.
- **Audio-reactive visualizer** on the solo focus view.
- **Solo focus theme picker** + responsive ring sizing.
- **Custom Quick Timer durations** + remember last used.

### Removed
- `MatchWaitingSheet` component + `matchMeNow` / `joinPendingMatch` /
  `fetchLiveWaitingMatches` / `cancelPendingMatch` service functions.
  The waiting-room flow they implemented is replaced by open-to-match.


## [v0.4.0] — 2026-05-26

Projects pivot deepens: covers, external sharing, task tabs. Music + host
controls land for sessions. The home page graduates from progressive paint
to a single server-side RPC.

### Added
- **Phase A: No-gap-no-shame tone reset** — forgiving momentum band
  (never a hard streak count) + Quick Restart card for returners.
- **Phase B: "Make this smaller" task breakdown helper** — ADHD-friendly
  three-prompt forcing function to shrink stuck goals.
- **Phase C: Real-world / offline-capable sessions** — solo mode for tasks
  away from the screen.
- **Phase D: Simple external project sharing** — accountability-view link
  for someone outside the platform to follow along.
- **Project Tasks tab** with Day / Week views + Backlog + carry-forward.
- **Project covers** — drag-to-reposition + zoom + fit mode + background
  colour + text-colour toggle.
- **Project completion bar** + nested milestones with weights.
- **Co-host + lock-joins moderation** for matched sessions.
- **Host controls**: break wizard + extend session +15 / +30 min.
- **Binaural beats layer** — opt-in subliminal tone per music category.
- **Session music**, host control, wizards, and a state-driven taxonomy.
- **Scheduled-session gate** — only eligible hosts publish to the public
  calendar.

### Changed
- **Home page** is now a single server-side RPC — one round-trip, everything
  paints together. Previously four staggered queries.
- **Admin** replaces the duplicate header link with **Projects**.
- **Project hero** — "Find a session" alongside "Start a session".
- **Project delete** — themed modal instead of a native `confirm()` prompt.
- **Notifications** — "Mark all read" now verifies + per-row dismiss via ✕.

### Fixed
- Project card progress reflects the whole project, not just the current
  weekly task slice.
- Hero edit pencil adapts to text colour so it stays visible on light
  covers; "Read more" opens a modal instead of expanding inline.
- Replaced `LockOpen` with `Unlock` for older `lucide-react` compatibility.
- Dead `TasksTab` + `TaskRow` duplicates removed (were causing build
  failure).
- Multiple cover hero polish passes — text-on-image stacking, gradient,
  backdrop-blur panel, themed Read more.


## [v0.3.0] — 2026-05-21

Sessions reliability sprint. JaaS (Jitsi-as-a-Service) JWT auth replaces
the raw iframe with a properly authenticated meeting layer.

### Added
- **JaaS JWT auth** — permanent host, lobby, emoji reactions, moderation.
- **DeclareSessionModal: 1-on-1 default** + inline When picker.
- **Inline task creation** in DeclareSessionModal.

### Fixed
- Session page blank — router state handoff + dark loading background +
  JaaS fallback.
- JaaS blank screen — hide iframe during load, disable prejoin correctly.
- JaaS CSP, session restore, HMR stability, task deletion UX.
- JaaS script URL + session page fills viewport correctly.


## [v0.2.0] — 2026-05-20

Notifications foundation + communal chat + the Today/Week planner. The
admin panel gets rebuilt around platform events. Push notifications +
email dispatch wired.

### Added
- **Phase 1.A: Notifications foundation** — schema + service + bell +
  Settings panel.
- **Phase 1.B: Email dispatch pipeline** — Edge function reads
  notifications and sends emails through the prefs gate.
- **Push notifications** wired through the browser Notifications API.
- **Persistent floating chat dock** — LinkedIn / Reddit style on desktop.
- **Communal chat** — global room, presence indicators, desktop bubble.
- **DM privacy / Do Not Disturb** setting.
- **Today + Week time-block planner** on the home page.
- **ADHD microtask breakdown** + side-by-side intentions layout.
- **Skills step** in onboarding + final CTA polish.
- **Admin Activity Logs** rebuilt as a real platform event feed.
- **Admin Settings page** replaced with real controls.
- **Replaced raw Jitsi iframe** with External API component + return-to-session chip.

### Changed
- **Profile page** redesigned with richer stats, completion card, highlights.
- **People page** — skill filter chips; Settings merged into `/profile` tabs.
- **People page** feels alive: presence, working-now, smart sort.
- **Chat page** — two-column layout, live sidebar, richer empty state.
- **Nav consolidated** + chat/messages merged into a single unified dock.

### Fixed
- Founder account set to `role=admin` in DB (was previously empty).
- Infinite RLS recursion on `dm_participants` → 500s on all queries.
- `fetch notification_preferences` separately to avoid schema cache join error.
- Multiple migration safety fixes — `DROP POLICY IF EXISTS` guards across
  connections + public visibility + email pipeline migrations.
- Admin role badge stale state; theme picker moved to Profile > Account tab.
- Notification settings link + resilient prefs panel.
- Notifications bell dropdown clipped by nav `overflow` — portalled to body.
- `dm_privacy` migration: removed invalid `INTO STRICT...USING` syntax.
- Communal chat migration: `DROP POLICY IF EXISTS` before `CREATE`.
- Email pipeline: guard all triggers with table-existence checks.
- `pg_cron` nested dollar-quote syntax.
- Notifications migration: bridge old `is_read` schema.


## [v0.1.0] — 2026-05-19

The post-pivot foundation. SharedMinds becomes a community-coworking
accountability platform. Sessions and Calendar merged into one surface.
Projects MVP. People directory + DMs. Recurring admin-curated sessions.

### Added
- **Sessions + Calendar unified** — Focusmate-style hour grid replaces the
  list-style page.
- **Projects MVP** — schema + service + list / detail / editor + sharing.
- **DeclareSessionModal**: popup on web, bottom sheet on mobile, inline
  task save.
- **People directory** + DM UI + unread badge (Phase A: Connections expansion).
- **Community feed** — hybrid manual posts + auto activity (Phase B).
- **Weekly Review ritual** — 3 intentions in / 3 reviewed out.
- **IntentionWizard** — guided multi-step flow for setting weekly intentions.
- **Admin-scheduled recurring group sessions.**
- **Home page v2** rebuilt around a single answer to "what now?".
- **Migration: anon read** for public scheduled + active community sessions.

### Changed
- **Admin panel redesigned** for the community coworking product.
- **Avatar moderation** fails open + Settings upload tile.
- **Rename Ship → Finish** across user-facing copy.

### Fixed
- Admin User Management: show email + all users + drop legacy fields.
- Refresh admin sidebar profile so role badge isn't stale.

### Removed
- Excised the last of guardrails (pre-pivot module) from the active codebase.
- Landing page moved to its own sibling repo.
- Pre-pivot code archived to sibling legacy repo.
