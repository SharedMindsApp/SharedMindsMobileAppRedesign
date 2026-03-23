/*
  # Fix Recipes SELECT RLS to Use Helper Function
  
  ## Problem
  The SELECT policy for recipes uses subqueries on profiles table:
  `created_for_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
  
  This can be blocked by RLS on the profiles table, causing recipes to not appear.
  
  ## Solution
  Update the SELECT policy to use the `is_user_profile()` helper function instead
  of subqueries. This function uses SECURITY DEFINER to bypass RLS recursion.
*/

-- Ensure is_user_profile function exists (from recipes INSERT RLS migration)
-- If it doesn't exist, create it
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

-- Ensure is_user_household_member function exists
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

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible recipes" ON recipes;

-- Create updated SELECT policy using helper functions
CREATE POLICY "Users can view accessible recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Public recipes (any household_id, including NULL)
      is_public = true
      OR
      -- Household recipes (user is a member)
      (
        household_id IS NOT NULL
        AND is_user_household_member(household_id)
      )
      OR
      -- User's own recipes (via profile ID)
      (
        created_by IS NOT NULL
        AND is_user_profile(created_by)
      )
      OR
      -- Personal AI recipes created for this user
      -- These have: household_id IS NULL, is_public = false, created_for_profile_id set
      (
        household_id IS NULL
        AND is_public = false
        AND created_for_profile_id IS NOT NULL
        AND is_user_profile(created_for_profile_id)
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Users can view accessible recipes" ON recipes IS
  'Allows authenticated users to view recipes they have access to. Uses SECURITY DEFINER helper functions to avoid RLS recursion. Includes: public recipes, household recipes (via membership), user-created recipes (via profile.id), and personal AI recipes (via created_for_profile_id).';
