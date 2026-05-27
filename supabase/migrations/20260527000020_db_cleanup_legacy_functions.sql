-- Cleanup: two pre-existing function bugs surfaced by `db lint`.
--
-- 1. `public.create_session_reminders()` was added in
--    20260520000002_email_pipeline.sql and references `fs.goal` —
--    a column that no longer exists (renamed to `session_goal`
--    long ago). The function never ran successfully and has been
--    silently broken in production. Its responsibilities are now
--    handled by `public.schedule_session_reminders()` (added in
--    20260527000017), so we just drop it.
--
-- 2. `public.get_shared_project_view()` is declared STABLE but
--    contains an UPDATE on `project_share_tokens.last_viewed_at`.
--    Postgres treats writes inside STABLE functions as undefined
--    behaviour and the linter rejects it. The fix is one-line:
--    `ALTER FUNCTION … VOLATILE`. We use ALTER rather than
--    rewriting the function body because the body is correct;
--    only the volatility classifier was wrong.

-- ── 1. Drop create_session_reminders ────────────────────────────

DROP FUNCTION IF EXISTS public.create_session_reminders();

-- ── 2. Fix get_shared_project_view volatility ───────────────────

ALTER FUNCTION public.get_shared_project_view(text) VOLATILE;
