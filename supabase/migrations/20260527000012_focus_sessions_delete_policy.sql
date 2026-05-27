-- Owner DELETE policy on focus_sessions.
--
-- Until this migration, focus_sessions had policies for SELECT,
-- INSERT, and UPDATE — but nothing for DELETE. Postgres RLS denies by
-- default, so `deleteScheduledSession()` was silently rejected at the
-- DB layer. supabase-js doesn't error on a zero-row delete from RLS,
-- it just returns `{ error: null }`, which is why the client thought
-- the cancel succeeded even though the row stayed in the table.
--
-- This policy lets a user hard-delete their own session rows. The
-- service layer still gates the action behind status checks (we only
-- hard-delete scheduled rows; active rows soft-cancel via UPDATE), so
-- the new DELETE permission can't be used to wipe completed history
-- accidentally through the existing API. A determined client could
-- run their own DELETE — but only on their own rows, which is the
-- expected behaviour for "remove session" anyway.

DROP POLICY IF EXISTS "focus_sessions_delete_self" ON public.focus_sessions;
CREATE POLICY "focus_sessions_delete_self"
ON public.focus_sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
