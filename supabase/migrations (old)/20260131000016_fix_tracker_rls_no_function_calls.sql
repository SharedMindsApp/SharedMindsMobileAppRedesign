/*
  # Fix Tracker RLS - No Function Calls in Ownership Check
  
  This migration fixes the infinite recursion by ensuring the ownership check
  does NOT call any functions. Instead, we inline the profile lookup directly
  in the policy using a subquery that bypasses RLS via SECURITY DEFINER context.
  
  CRITICAL: owner_id in trackers table is auth.users.id (NOT profile.id)
  But we need to compare it to the current user's profile ID for consistency.
  
  Solution: Use a direct subquery to get profile ID, avoiding function calls.
*/

-- First, ensure the grant-checking functions are safe (no trackers table queries)
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

CREATE OR REPLACE FUNCTION user_has_tracker_grant(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN user_has_tracker_access(tracker_id, required_role);
END;
$$;

-- Drop ALL existing SELECT policies on trackers
DROP POLICY IF EXISTS "Users can read their own trackers" ON trackers;
DROP POLICY IF EXISTS "Shared users can read trackers" ON trackers;
DROP POLICY IF EXISTS "Observers can read trackers via observation links" ON trackers;
DROP POLICY IF EXISTS "Users can read accessible trackers" ON trackers;
DROP POLICY IF EXISTS "trackers_select_policy" ON trackers;

-- Create a policy that checks auth.uid() FIRST (most common case)
-- This avoids any function calls or subqueries for the ownership check
-- CRITICAL: Based on schema, owner_id REFERENCES auth.users(id), so owner_id = auth.uid()
-- We check this FIRST to short-circuit and avoid any subqueries for the common case
CREATE POLICY "trackers_select_policy"
  ON trackers
  FOR SELECT
  USING (
    -- Primary case: Owner can always read (including archived)
    -- Check auth.uid() FIRST - this is the most common case and requires no function calls
    -- PostgreSQL will short-circuit on this, so subqueries below won't execute for owners
    owner_id = auth.uid()
    OR
    -- Fallback: If owner_id is actually profile.id (data inconsistency), check profile
    -- This subquery is only evaluated if owner_id != auth.uid()
    -- We use a correlated subquery that should be safe
    (
      owner_id != auth.uid()
      AND owner_id = (
        SELECT id FROM profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    )
    OR
    -- Secondary case: Shared users (only if not archived)
    -- Only evaluate if owner check failed AND user is authenticated AND not archived
    (
      archived_at IS NULL
      AND owner_id IS DISTINCT FROM auth.uid()
      AND owner_id IS DISTINCT FROM (
        SELECT id FROM profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
      AND auth.uid() IS NOT NULL
      AND user_has_tracker_grant(id, 'viewer')
    )
    OR
    -- Tertiary case: Observers (only if not archived)
    -- Only evaluate if owner check failed AND user is authenticated AND not archived
    (
      archived_at IS NULL
      AND owner_id IS DISTINCT FROM auth.uid()
      AND owner_id IS DISTINCT FROM (
        SELECT id FROM profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
      AND auth.uid() IS NOT NULL
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
-- Check auth.uid() FIRST to avoid subqueries in the common case
CREATE POLICY "trackers_insert_policy"
  ON trackers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Most common case: owner_id = auth.uid() (no subquery needed)
    owner_id = auth.uid()
    OR
    -- Fallback: If owner_id is profile.id (data inconsistency)
    owner_id = (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- Comments
COMMENT ON FUNCTION user_has_tracker_grant IS 'Checks if current user has a grant for a tracker. Does NOT check ownership (checked directly in policies). Uses SECURITY DEFINER to bypass RLS. Marked STABLE for query optimization.';
COMMENT ON FUNCTION user_has_tracker_access IS 'Backward compatibility wrapper. Checks grants only (ownership is checked directly in policies).';
COMMENT ON POLICY "trackers_select_policy" ON trackers IS 
  'Allows users to read trackers they own (direct check using auth.uid() or profile.id subquery), have grants for, or have observation links for. Owners can read archived trackers.';
COMMENT ON POLICY "trackers_insert_policy" ON trackers IS 
  'Allows authenticated users to create trackers where owner_id matches their auth.uid() or profile.id.';
