-- Sprint 4: Shipped feed — allow community to see recently completed sessions

DROP POLICY IF EXISTS "focus_sessions_select_policy" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_policy"
ON public.focus_sessions FOR SELECT
USING (
  user_id = auth.uid()                                              -- own sessions (all statuses)
  OR status = 'active'                                              -- live sessions (community feed)
  OR (session_type = 'scheduled' AND status = 'scheduled')         -- upcoming sessions (join page)
  OR (status = 'completed' AND ended_at > now() - interval '24 hours') -- recently shipped
);
