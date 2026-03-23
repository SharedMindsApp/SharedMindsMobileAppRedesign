/*
  # Fix Tracker RLS Recursion Issue
  
  The user_has_tracker_access function queries the trackers table, which can cause
  recursion when used in RLS policies. This migration fixes the function to
  properly bypass RLS and consolidates the SELECT policies.
*/

-- Drop and recreate user_has_tracker_access with proper RLS bypass
-- This function ONLY checks grants, NOT ownership (ownership is checked directly in policies)
CREATE OR REPLACE FUNCTION user_has_tracker_grant(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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

  RETURN has_grant;
END;
$$;

-- Keep the old function name for backward compatibility, but make it only check grants
CREATE OR REPLACE FUNCTION user_has_tracker_access(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Delegate to the grant-only function
  RETURN user_has_tracker_grant(tracker_id, required_role);
END;
$$;

-- Drop existing SELECT policies to consolidate them
DROP POLICY IF EXISTS "Users can read their own trackers" ON trackers;
DROP POLICY IF EXISTS "Shared users can read trackers" ON trackers;
DROP POLICY IF EXISTS "Observers can read trackers via observation links" ON trackers;
DROP POLICY IF EXISTS "Users can read accessible trackers" ON trackers;

-- Create a single consolidated SELECT policy that handles all cases
-- This avoids policy conflicts and recursion issues
-- Ownership is checked directly (no function call) to avoid recursion
CREATE POLICY "Users can read accessible trackers"
  ON trackers
  FOR SELECT
  USING (
    -- Owner can always read (including archived) - checked directly, no function
    owner_id = auth.uid()
    OR
    -- Shared users can read (via grants) if not archived
    (
      archived_at IS NULL
      AND user_has_tracker_grant(id, 'viewer')
    )
    OR
    -- Observers can read (via observation links) if not archived
    (
      archived_at IS NULL
      AND EXISTS (
        SELECT 1 FROM tracker_observation_links
        WHERE tracker_id = trackers.id
          AND observer_user_id = auth.uid()
          AND revoked_at IS NULL
      )
    )
  );

-- Comments
COMMENT ON FUNCTION user_has_tracker_grant IS 'Checks if current user has a grant for a tracker. Does NOT check ownership (checked directly in policies). Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION user_has_tracker_access IS 'Backward compatibility wrapper. Checks grants only (ownership is checked directly in policies).';
COMMENT ON POLICY "Users can read accessible trackers" ON trackers IS 
  'Consolidated policy allowing users to read trackers they own (checked directly), have grants for, or have observation links for. Owners can read archived trackers.';
