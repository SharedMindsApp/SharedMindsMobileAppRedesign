-- Fix: infinite recursion in dm_participants RLS causing 500s everywhere.
--
-- Root cause:
--   profiles_select_policy  →  JOIN dm_participants (triggers dp RLS)
--   dm_participants_select  →  SELECT FROM dm_participants (self-reference)
--   → PostgreSQL detects infinite recursion → 42P17 → HTTP 500
--
-- Fix A: dm_participants_select now uses the trivial user_id = auth.uid()
--        (a participant only ever needs to read their own rows; all queries
--         in the app filter by user_id = auth.uid() anyway).
--
-- Fix B: the DM-partner visibility check in profiles_select_policy is moved
--        into a SECURITY DEFINER function. SECURITY DEFINER bypasses the
--        caller's RLS for the inner query, so dm_participants is read without
--        triggering the dp RLS again — breaking the loop.

-- ── A. Simplify dm_participants SELECT policy ────────────────────

DROP POLICY IF EXISTS "dm_participants_select" ON public.dm_participants;

CREATE POLICY "dm_participants_select"
  ON public.dm_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── B. SECURITY DEFINER helper: have I DM'd this person? ────────

CREATE OR REPLACE FUNCTION public.is_dm_partner(target_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.dm_participants dp1
    JOIN   public.dm_participants dp2
           ON dp1.conversation_id = dp2.conversation_id
    WHERE  dp1.user_id = auth.uid()
      AND  dp2.user_id = target_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_dm_partner(uuid) TO authenticated;

-- ── C. Rewrite profiles_select_policy using the helper ───────────

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Always see your own profile
    id = auth.uid()

    -- See anyone currently in an active public/shared session
    OR EXISTS (
      SELECT 1 FROM public.focus_sessions fs
      WHERE fs.user_id = id AND fs.status = 'active'
    )

    -- See accepted connections
    OR EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.status = 'accepted'
        AND (
          (c.requester_id = auth.uid() AND c.addressee_id = id)
          OR
          (c.addressee_id = auth.uid() AND c.requester_id = id)
        )
    )

    -- See DM partners (uses SECURITY DEFINER — no RLS recursion)
    OR public.is_dm_partner(id)
  );
