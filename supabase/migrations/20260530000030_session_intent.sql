-- ============================================================
-- Session intent — purpose-led framing
-- ============================================================
-- Short sessions aren't really for deep work (by the time you match + intro +
-- outro, there's barely any work time). So a session's PURPOSE is explicit and
-- scales with length:
--   • plan      — think out loud / brainstorm (any length)
--   • connect   — chat & body-double, social-first (any length)
--   • meditate  — sit together / reset (any length)
--   • work      — declare a task, heads-down (45+ min only)
-- Purpose also becomes a matching key: open doors pair same-purpose together.
--
-- Apply manually via the Supabase dashboard. Safe to re-run.
-- ============================================================

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS session_intent text
    CHECK (session_intent IN ('work', 'plan', 'connect', 'meditate'));

CREATE INDEX IF NOT EXISTS focus_sessions_intent_idx
  ON public.focus_sessions(session_intent)
  WHERE session_intent IS NOT NULL;
