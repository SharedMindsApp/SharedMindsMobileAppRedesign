-- Solo mode + tightened RLS.
--
-- Adds 'solo' to the allowed session_mode values. Solo sessions are private —
-- they never appear in other users' "Working Now" feed, even when active.
--
-- Also tightens the SELECT RLS so a 1-on-1 partner can read the session they
-- joined (needed for them to see the session details after the conditional
-- UPDATE returns).

-- 1. Allow 'solo'
ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_mode_check;
ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_mode_check
  CHECK (session_mode IN ('group', 'one_on_one', 'solo'));

-- 2. Replace SELECT policy
--    Before: own sessions OR any active session
--    After:  own sessions OR partnered sessions OR active sessions that aren't solo
DROP POLICY IF EXISTS "focus_sessions_select_policy" ON public.focus_sessions;
DROP POLICY IF EXISTS "focus_sessions_select_self" ON public.focus_sessions;

CREATE POLICY "focus_sessions_select_policy"
ON public.focus_sessions FOR SELECT
USING (
  user_id = auth.uid()                                            -- own (all statuses, all modes)
  OR partner_user_id = auth.uid()                                 -- 1-on-1 partner
  OR (status = 'active' AND session_mode <> 'solo')              -- community visibility
);

-- 3. Index supporting the community feed query (active non-solo)
CREATE INDEX IF NOT EXISTS focus_sessions_active_community_idx
  ON public.focus_sessions(status, session_mode, start_time)
  WHERE status = 'active' AND session_mode <> 'solo';
