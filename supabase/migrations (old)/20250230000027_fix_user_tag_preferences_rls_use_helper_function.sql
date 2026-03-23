/*
  # Fix User Tag Preferences RLS Policies to Use Helper Functions

  ## Problem
  The user_tag_preferences RLS policies are using subqueries that may hit RLS on the profiles table,
  causing recursion issues or permission failures. Also, is_user_household_member() is being called
  with space_id instead of household_id.

  ## Solution
  Update user_tag_preferences policies to use:
  - is_user_profile() helper function for profile ownership checks
  - Create a helper function to check space access (household or personal)
  - Ensure policies correctly handle both personal and household spaces
*/

-- Ensure helper functions exist (from previous migrations)
-- 1️⃣ Ensure is_user_profile() exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_user_profile(check_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    check_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = check_profile_id
      AND user_id = auth.uid()
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_profile(uuid) TO authenticated;

-- 2️⃣ Ensure is_user_household_member() exists and is SECURITY DEFINER
DROP FUNCTION IF EXISTS is_user_household_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_user_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = hid
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_household_member(uuid) TO authenticated;

-- 3️⃣ Create helper function to check if user has access to a space
CREATE OR REPLACE FUNCTION is_user_space_member(space_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM spaces s
    WHERE s.id = space_id_param
    AND (
      -- Personal space: check if user owns it
      (
        s.context_type = 'personal'
        AND s.context_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
      OR
      -- Household space: check if user is a member
      (
        s.context_type = 'household'
        AND s.context_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM household_members hm
          WHERE hm.household_id = s.context_id
          AND hm.auth_user_id = auth.uid()
          AND hm.status = 'active'
        )
      )
      OR
      -- Team space: check if user is a member (if teams table exists)
      (
        s.context_type = 'team'
        AND s.context_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM team_members tm
          WHERE tm.team_id = s.context_id
          AND is_user_profile(tm.user_id)
          AND tm.status = 'active'
        )
      )
    )
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_space_member(uuid) TO authenticated;

-- 4️⃣ Drop existing policies
DROP POLICY IF EXISTS "Users can view tag preferences in their spaces" ON user_tag_preferences;
DROP POLICY IF EXISTS "Users can insert tag preferences" ON user_tag_preferences;
DROP POLICY IF EXISTS "Users can update tag preferences" ON user_tag_preferences;
DROP POLICY IF EXISTS "Users can delete tag preferences" ON user_tag_preferences;

-- 5️⃣ Create updated SELECT policy using helper functions
CREATE POLICY "Users can view tag preferences in their spaces"
  ON user_tag_preferences FOR SELECT
  TO authenticated
  USING (
    -- User's own preferences (via profile)
    is_user_profile(profile_id)
    OR
    -- Preferences in spaces the user has access to
    is_user_space_member(space_id)
  );

-- 6️⃣ Create updated INSERT policy using helper functions
CREATE POLICY "Users can insert tag preferences"
  ON user_tag_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User's own preferences (via profile)
    is_user_profile(profile_id)
    AND
    -- Must be in a space the user has access to
    is_user_space_member(space_id)
  );

-- 7️⃣ Create updated UPDATE policy using helper functions
CREATE POLICY "Users can update tag preferences"
  ON user_tag_preferences FOR UPDATE
  TO authenticated
  USING (
    -- User's own preferences (via profile)
    is_user_profile(profile_id)
    OR
    -- Preferences in spaces the user has access to
    is_user_space_member(space_id)
  )
  WITH CHECK (
    -- User's own preferences (via profile)
    is_user_profile(profile_id)
    AND
    -- Must be in a space the user has access to
    is_user_space_member(space_id)
  );

-- 8️⃣ Create updated DELETE policy using helper functions
CREATE POLICY "Users can delete tag preferences"
  ON user_tag_preferences FOR DELETE
  TO authenticated
  USING (
    -- User's own preferences (via profile)
    is_user_profile(profile_id)
    OR
    -- Preferences in spaces the user has access to
    is_user_space_member(space_id)
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can view tag preferences in their spaces" ON user_tag_preferences IS 
  'Allows authenticated users to view tag preferences in spaces they have access to. Uses helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can insert tag preferences" ON user_tag_preferences IS 
  'Allows authenticated users to create tag preferences for themselves in spaces they have access to. Uses helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can update tag preferences" ON user_tag_preferences IS 
  'Allows authenticated users to update tag preferences in spaces they have access to. Uses helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can delete tag preferences" ON user_tag_preferences IS 
  'Allows authenticated users to delete tag preferences in spaces they have access to. Uses helper functions to avoid RLS recursion.';
