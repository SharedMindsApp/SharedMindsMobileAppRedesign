/*
  # Add RLS Policies for Tracker Sharing
  
  1. Changes
    - Add policies to allow shared users to read trackers
    - Add policies to allow shared users to read entries
    - Add policies to allow editors to create/update entries
  
  2. Notes
    - Shared users are identified via entity_permission_grants
    - Viewers can read tracker and entries
    - Editors can read and write entries
    - Only owner can manage tracker metadata
*/

-- Helper function to check if user has tracker access
CREATE OR REPLACE FUNCTION user_has_tracker_access(tracker_id uuid, required_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile_id uuid;
  user_id_val uuid;
  is_owner boolean;
  has_grant boolean;
BEGIN
  -- Get current user
  user_id_val := auth.uid();
  IF user_id_val IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's profile ID
  SELECT id INTO user_profile_id
  FROM profiles
  WHERE user_id = user_id_val;

  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is owner (and tracker is not archived, unless owner)
  SELECT EXISTS(
    SELECT 1 FROM trackers
    WHERE id = tracker_id
    AND owner_id = user_id_val
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check for active grant
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

-- Allow shared users to read trackers
CREATE POLICY "Shared users can read trackers"
  ON trackers
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    user_has_tracker_access(id, 'viewer')
  );

-- Allow shared users to read entries (if they have tracker access)
CREATE POLICY "Shared users can read entries"
  ON tracker_entries
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_has_tracker_access(tracker_id, 'viewer')
  );

-- Allow editors to create entries
CREATE POLICY "Editors can create entries"
  ON tracker_entries
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Owner can always create
      EXISTS(
        SELECT 1 FROM trackers
        WHERE id = tracker_id
        AND owner_id = auth.uid()
      ) OR
      -- Editor can create
      user_has_tracker_access(tracker_id, 'editor')
    )
  );

-- Allow editors to update entries
CREATE POLICY "Editors can update entries"
  ON tracker_entries
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    (
      -- Owner can always update
      EXISTS(
        SELECT 1 FROM trackers
        WHERE id = tracker_id
        AND owner_id = auth.uid()
      ) OR
      -- Editor can update
      user_has_tracker_access(tracker_id, 'editor')
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Owner can always update
      EXISTS(
        SELECT 1 FROM trackers
        WHERE id = tracker_id
        AND owner_id = auth.uid()
      ) OR
      -- Editor can update
      user_has_tracker_access(tracker_id, 'editor')
    )
  );

-- Comments
COMMENT ON FUNCTION user_has_tracker_access IS 'Checks if current user has access to a tracker via ownership or grants';
