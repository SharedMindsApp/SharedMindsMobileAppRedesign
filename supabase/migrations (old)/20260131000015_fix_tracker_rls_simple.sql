/*
  # Simple Fix for Tracker RLS - Avoid Function Calls in Basic Case
  
  This migration creates a simpler RLS policy that checks ownership directly
  and only uses functions for shared/observed trackers. This avoids recursion
  in the common case (user querying their own trackers).
  
  IMPORTANT: This migration MUST be applied to fix the 500 errors.
*/

-- First, completely replace the old recursive function
-- The old user_has_tracker_access function queries trackers table, causing recursion
-- We replace it with a version that only checks grants (no trackers table query)
CREATE OR REPLACE FUNCTION user_has_tracker_access(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
DECLARE
  user_profile_id uuid;
  user_id_val uuid;
  has_grant boolean;
BEGIN
  -- Get current user
  user_id_val := auth.uid();
  IF user_id_val IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's profile ID (bypass RLS via SECURITY DEFINER)
  SELECT id INTO user_profile_id
  FROM profiles
  WHERE user_id = user_id_val
  LIMIT 1;

  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check for active grant (bypass RLS via SECURITY DEFINER)
  -- CRITICAL: This does NOT query the trackers table, avoiding recursion
  SELECT EXISTS(
    SELECT 1 FROM entity_permission_grants
    WHERE entity_type = 'tracker'
    AND entity_id = tracker_id
    AND subject_type = 'user'
    AND subject_id = user_profile_id
    AND revoked_at IS NULL
    AND (
      required_role = 'viewer' OR
      (required_role = 'editor' AND permission_role IN ('editor', 'viewer'))
    )
  ) INTO has_grant;

  RETURN COALESCE(has_grant, false);
END;
$$;

-- Create the grant-checking function (alias for user_has_tracker_access)
-- Both functions now do the same thing - check grants only, no trackers table query
CREATE OR REPLACE FUNCTION user_has_tracker_grant(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  -- Delegate to user_has_tracker_access (which is now safe - no recursion)
  RETURN user_has_tracker_access(tracker_id, required_role);
END;
$$;

-- Drop ALL existing SELECT policies on trackers
DROP POLICY IF EXISTS "Users can read their own trackers" ON trackers;
DROP POLICY IF EXISTS "Shared users can read trackers" ON trackers;
DROP POLICY IF EXISTS "Observers can read trackers via observation links" ON trackers;
DROP POLICY IF EXISTS "Users can read accessible trackers" ON trackers;
DROP POLICY IF EXISTS "trackers_select_policy" ON trackers;

-- Create a simple policy that prioritizes direct ownership check
-- This avoids function calls for the common case (user's own trackers)
-- CRITICAL: owner_id is a profile ID, not auth.uid(), so we use get_current_profile_id()
CREATE POLICY "trackers_select_policy"
  ON trackers
  FOR SELECT
  USING (
    -- Primary case: Owner can always read (including archived)
    -- This is checked FIRST and doesn't require any function calls
    -- PostgreSQL will short-circuit on this, so function calls below won't execute for owners
    -- CRITICAL: owner_id is profile ID, so we compare with get_current_profile_id()
    owner_id = get_current_profile_id()
    OR
    -- Secondary case: Shared users (only if not archived)
    -- Only evaluate if owner check failed AND user is authenticated AND not archived
    (
      archived_at IS NULL
      AND owner_id IS DISTINCT FROM get_current_profile_id()  -- Explicitly exclude owner case
      AND get_current_profile_id() IS NOT NULL
      AND user_has_tracker_grant(id, 'viewer')
    )
    OR
    -- Tertiary case: Observers (only if not archived)
    -- Only evaluate if owner check failed AND user is authenticated AND not archived
    (
      archived_at IS NULL
      AND owner_id IS DISTINCT FROM get_current_profile_id()  -- Explicitly exclude owner case
      AND get_current_profile_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM tracker_observation_links
        WHERE tracker_id = trackers.id
          AND observer_user_id = auth.uid()
          AND revoked_at IS NULL
      )
    )
  );

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own trackers" ON trackers;
DROP POLICY IF EXISTS "trackers_insert_policy" ON trackers;

-- Create explicit INSERT policy
-- CRITICAL: owner_id must be profile ID, so we use get_current_profile_id()
-- This ensures INSERT does not touch grant logic or observation logic
CREATE POLICY "trackers_insert_policy"
  ON trackers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = get_current_profile_id()
  );

-- Comments
COMMENT ON FUNCTION user_has_tracker_grant IS 'Checks if current user has a grant for a tracker. Does NOT check ownership (checked directly in policies). Uses SECURITY DEFINER to bypass RLS. Marked STABLE for query optimization.';
COMMENT ON FUNCTION user_has_tracker_access IS 'Backward compatibility wrapper. Checks grants only (ownership is checked directly in policies).';
COMMENT ON POLICY "trackers_select_policy" ON trackers IS 
  'Allows users to read trackers they own (direct check using get_current_profile_id()), have grants for, or have observation links for. Owners can read archived trackers.';
COMMENT ON POLICY "trackers_insert_policy" ON trackers IS 
  'Allows authenticated users to create trackers where owner_id matches their profile ID. Uses get_current_profile_id() for identity consistency.';

-- ============================================================================
-- IMPORTANT: Check for triggers that might cause recursion
-- ============================================================================
-- Run this query in Supabase SQL Editor to check for problematic triggers:
--
-- SELECT tgname, proname
-- FROM pg_trigger t
-- JOIN pg_proc p ON p.oid = t.tgfoid
-- WHERE tgrelid = 'trackers'::regclass
--   AND NOT tgisinternal;
--
-- If any trigger function:
--   - queries trackers table
--   - calls user_has_tracker_access
--   - calls user_has_tracker_grant
--   - calls a policy-dependent helper
-- → that trigger must be rewritten or wrapped in SECURITY DEFINER without querying trackers again.
-- ============================================================================
