-- Public hosting eligibility gate
--
-- To prevent low-effort or spammy public group sessions, we require that
-- hosts have attended at least N community sessions before they can host
-- one themselves. Admins bypass the gate so we can seed the calendar.
--
-- The threshold is intentionally set at the SQL layer so the UI can read it
-- via a single RPC. Public group hosting = any session with
-- session_mode = 'group' (live OR scheduled). 'one_on_one' (invite-only) and
-- 'solo' have no gate.
--
-- Only sessions that count toward eligibility:
--   * completed (status = 'completed')
--   * NOT solo (solo sessions don't expose you to community norms)
--   * either user_id = uid OR partner_user_id = uid (1-on-1 partners count)

-- ── 1. Threshold lookup (single source of truth) ──────────────────────────

CREATE OR REPLACE FUNCTION public.public_hosting_threshold()
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 20;
$$;

GRANT EXECUTE ON FUNCTION public.public_hosting_threshold() TO authenticated, anon;

-- ── 2. Count of sessions toward eligibility ───────────────────────────────

CREATE OR REPLACE FUNCTION public.attended_session_count(uid uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.focus_sessions
  WHERE status = 'completed'
    AND session_mode IS NOT NULL
    AND session_mode <> 'solo'
    AND (user_id = uid OR partner_user_id = uid);
$$;

GRANT EXECUTE ON FUNCTION public.attended_session_count(uuid) TO authenticated;

-- ── 3. Eligibility helper ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_host_public_session(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.attended_session_count(uid) >= public.public_hosting_threshold();
$$;

GRANT EXECUTE ON FUNCTION public.can_host_public_session(uuid) TO authenticated;

-- ── 4. RLS enforcement on focus_sessions inserts ─────────────────────────
--
-- The gate only applies to *scheduled* sessions — i.e. sessions that get
-- published to the community calendar before they happen. Live ad-hoc
-- sessions (group / 1-on-1 / solo started "now") have no gate; anyone
-- can spin those up the moment they want to focus.
--
-- Rationale: scheduled sessions are the high-trust surface — they appear
-- on the public Featured/Community calendar and invite strangers to commit
-- their time. Live sessions are ephemeral and self-selecting.

DROP POLICY IF EXISTS "focus_sessions_insert_self" ON public.focus_sessions;
CREATE POLICY "focus_sessions_insert_self"
ON public.focus_sessions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    status IS DISTINCT FROM 'scheduled'
    OR public.can_host_public_session(auth.uid())
  )
);

-- And on UPDATE, prevent promoting a non-scheduled session to scheduled
-- when the user isn't eligible. Owner-only update is preserved.

DROP POLICY IF EXISTS "focus_sessions_update_self" ON public.focus_sessions;
CREATE POLICY "focus_sessions_update_self"
ON public.focus_sessions
FOR UPDATE
USING (user_id = auth.uid() OR partner_user_id = auth.uid())
WITH CHECK (
  (user_id = auth.uid() OR partner_user_id = auth.uid())
  AND (
    status IS DISTINCT FROM 'scheduled'
    OR public.can_host_public_session(auth.uid())
  )
);
