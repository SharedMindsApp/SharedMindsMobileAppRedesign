-- Quick Timer marker on focus_sessions.
--
-- Both Quick Timer and Solo Session create rows with
-- session_mode='solo' — they share the backend behavior (no Jitsi,
-- private, debrief on completion). But they're conceptually distinct
-- product surfaces:
--
--   • Quick Timer = low-friction, activity-tagged, minimisable.
--   • Solo Session = full DeclareSessionModal with project pin,
--     body-double video, real-world mode, music presets etc.
--
-- Without distinguishing them in the data, the calendar shows every
-- Quick Timer as "SOLO" which is misleading. This flag lets the UI
-- render a distinct "TIMER" pill and lets future stats/filters
-- separate the two product surfaces cleanly.
--
-- Backward compatibility: existing rows default to false (i.e.
-- counted as Solo Session). New Quick Timer-flow rows set it true.

alter table public.focus_sessions
  add column if not exists is_quick_timer boolean not null default false;

-- Cheap index for the calendar filter — most queries scan by user_id
-- and date range first, but a partial index keeps the "is timer"
-- check fast when filtering.
create index if not exists focus_sessions_quick_timer_idx
  on public.focus_sessions(user_id, is_quick_timer)
  where is_quick_timer = true;

comment on column public.focus_sessions.is_quick_timer is
  'True when created via the Quick Timer flow (activity-tagged, low-friction). False = full Solo/Group/1-on-1 session. Both can have session_mode=solo.';
