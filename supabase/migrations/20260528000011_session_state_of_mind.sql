-- ── Session state of mind ──────────────────────────────────────────────
--
-- Capture how a session felt — before and after — so the recap can show the
-- shift (the real reward: "came in foggy, left clear"). The dimension is
-- context-aware: 'do' sessions track ENERGY/focus, while 'plan' and 'reflect'
-- sessions track CLARITY/confidence — asking a planning session whether you're
-- "in hyperfocus" is the wrong question.
--
-- start_mood lives on the session (set by the owner at start). end_mood lives
-- on session_outcomes so it's captured per participant in the debrief, exactly
-- like the outcome it sits beside. Both are free-text mood codes interpreted
-- by src/lib/sessionMood.ts against the session_kind axis.

alter table public.focus_sessions
  add column if not exists session_kind text not null default 'do'
    check (session_kind in ('do', 'plan', 'reflect')),
  add column if not exists start_mood text;

alter table public.session_outcomes
  add column if not exists end_mood text;
