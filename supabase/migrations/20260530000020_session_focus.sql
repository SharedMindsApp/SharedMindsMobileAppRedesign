-- ============================================================
-- Focus dimension — separate from mood
-- ============================================================
-- Mood (how you feel) and focus (how able you are to concentrate) are
-- different and often diverge. We already track mood (start_mood / end_mood);
-- this adds the focus counterpart so the admin can heatmap them separately.
--   • focus_sessions.start_focus  — set by the owner at session start.
--   • session_outcomes.end_focus  — set per participant in the debrief.
-- Codes are the 'foc_*' values from src/lib/sessionMood.ts.
--
-- Apply manually via the Supabase dashboard. Safe to re-run.
-- ============================================================

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS start_focus text;

ALTER TABLE public.session_outcomes
  ADD COLUMN IF NOT EXISTS end_focus text;
