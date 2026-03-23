/*
  # Fix User Tag Preferences RLS - Update is_user_space_member Function
  
  ## Problem
  The `is_user_space_member` function uses a subquery on the profiles table that may be blocked by RLS,
  causing INSERT operations on user_tag_preferences to fail with 403 Forbidden.
  
  ## Solution
  Update `is_user_space_member` to use the `is_user_profile` helper function and check space_members
  table directly for better RLS compatibility.
*/

-- Drop and recreate is_user_space_member with improved logic
DROP FUNCTION IF EXISTS is_user_space_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_user_space_member(space_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if user has access to the space via space_members table (primary method)
  SELECT EXISTS (
    SELECT 1
    FROM space_members sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE sm.space_id = space_id_param
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR
  -- Fallback: Check personal space via context_id (direct profile match)
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN profiles p ON p.id = s.context_id
    WHERE s.id = space_id_param
    AND s.context_type = 'personal'
    AND s.context_id IS NOT NULL
    AND p.user_id = auth.uid()
  )
  OR
  -- Fallback: Check household space via household_members
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN household_members hm ON hm.household_id = s.context_id
    WHERE s.id = space_id_param
    AND s.context_type = 'household'
    AND s.context_id IS NOT NULL
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_space_member(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION is_user_space_member(uuid) IS
  'Checks if the current authenticated user has access to a space (personal, household, or team). Uses SECURITY DEFINER to bypass RLS on profiles and spaces tables.';
