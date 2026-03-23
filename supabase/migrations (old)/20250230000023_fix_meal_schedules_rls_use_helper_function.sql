/*
  # Fix Meal Schedules RLS to Use Helper Function
  
  ## Problem
  The INSERT policy for meal_schedules uses a subquery on profiles table:
  `profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
  
  This can be blocked by RLS on the profiles table, causing 403 errors.
  
  ## Solution
  Update the INSERT, UPDATE, and DELETE policies to use the `is_user_profile()`
  helper function instead of subqueries. This function uses SECURITY DEFINER
  to bypass RLS recursion.
*/

-- Ensure is_user_profile function exists (from recipes RLS migration)
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

-- Ensure is_user_household_member function exists and is SECURITY DEFINER
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can insert meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can update meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can delete meal schedules in their spaces" ON meal_schedules;

-- SELECT: Users can view schedules in their personal spaces or households they're members of
CREATE POLICY "Users can view meal schedules in their spaces"
  ON meal_schedules FOR SELECT
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (is_user_profile(profile_id) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
    OR
    -- Space-based access (for personal spaces via space_id)
    EXISTS (
      SELECT 1
      FROM spaces s
      JOIN space_members sm ON sm.space_id = s.id
      JOIN profiles p ON p.id = sm.user_id
      WHERE s.id = meal_schedules.space_id
      AND s.context_type = 'personal'
      AND p.user_id = auth.uid()
      AND sm.status = 'active'
    )
  );

-- INSERT: Users can create schedules in their personal spaces or households they're members of
CREATE POLICY "Users can insert meal schedules in their spaces"
  ON meal_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Personal space: profile_id must match user's profile AND household_id must be NULL
    (
      profile_id IS NOT NULL
      AND household_id IS NULL
      AND is_user_profile(profile_id)
    )
    OR
    -- Household: user must be a member AND profile_id must be NULL
    (
      household_id IS NOT NULL
      AND profile_id IS NULL
      AND is_user_household_member(household_id)
    )
  );

-- UPDATE: Users can update schedules in their personal spaces or households they're members of
CREATE POLICY "Users can update meal schedules in their spaces"
  ON meal_schedules FOR UPDATE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (is_user_profile(profile_id) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  )
  WITH CHECK (
    -- Personal space: profile_id must match user's profile
    (is_user_profile(profile_id) AND household_id IS NULL)
    OR
    -- Household: user must be a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

-- DELETE: Users can delete schedules in their personal spaces or households they're members of
CREATE POLICY "Users can delete meal schedules in their spaces"
  ON meal_schedules FOR DELETE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (is_user_profile(profile_id) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

-- Update comment
COMMENT ON POLICY "Users can insert meal schedules in their spaces" ON meal_schedules IS
  'Allows authenticated users to create meal schedules in their personal spaces or households they are members of, using SECURITY DEFINER helper functions to avoid RLS recursion.';
