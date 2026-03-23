/*
  # Fix Meal Schedules RLS Policies - Comprehensive Fix
  
  ## Problem
  Inserts into meal_schedules fail with 403 Forbidden errors because:
  - RLS is enabled but policies may be missing or incorrectly configured
  - Policies need to support both personal (profile_id) and household (household_id) schedules
  - Must use SECURITY DEFINER helper functions to avoid RLS recursion
  
  ## Solution
  Drop all existing policies and recreate them with proper logic:
  - Personal schedules: profile_id IS NOT NULL, household_id IS NULL, profile belongs to auth user
  - Household schedules: household_id IS NOT NULL, profile_id IS NULL, user is active household member
  - Use helper functions is_user_profile() and is_user_household_member() for security
*/

-- Ensure RLS is enabled
ALTER TABLE meal_schedules ENABLE ROW LEVEL SECURITY;

-- Ensure helper functions exist and are SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION is_user_profile(uuid) TO authenticated;

-- Ensure is_user_household_member exists and is SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION is_user_household_member(uuid) TO authenticated;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can insert own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can update own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can delete own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can view meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can insert meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can update meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can delete meal schedules in their spaces" ON meal_schedules;
DROP POLICY IF EXISTS "Users can create meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can read meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can update meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can delete meal schedules" ON meal_schedules;

-- 1️⃣ INSERT Policy
-- Personal schedules: profile_id IS NOT NULL, household_id IS NULL, profile belongs to auth user
-- Household schedules: household_id IS NOT NULL, profile_id IS NULL, user is active household member
CREATE POLICY "Users can create meal schedules"
  ON meal_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Personal schedule: profile_id must be set, household_id must be NULL, and profile must belong to auth user
      household_id IS NULL
      AND profile_id IS NOT NULL
      AND is_user_profile(profile_id)
    )
    OR
    (
      -- Household schedule: household_id must be set, profile_id must be NULL, and user must be active household member
      household_id IS NOT NULL
      AND profile_id IS NULL
      AND is_user_household_member(household_id)
    )
  );

-- 2️⃣ SELECT Policy
-- Users can read their personal schedules or household schedules they're members of
CREATE POLICY "Users can read meal schedules"
  ON meal_schedules
  FOR SELECT
  TO authenticated
  USING (
    (
      -- Personal schedule: profile_id belongs to auth user, household_id is NULL
      household_id IS NULL
      AND profile_id IS NOT NULL
      AND is_user_profile(profile_id)
    )
    OR
    (
      -- Household schedule: user is active household member
      household_id IS NOT NULL
      AND is_user_household_member(household_id)
    )
  );

-- 3️⃣ UPDATE Policy
-- Users can update their personal schedules or household schedules they're members of
-- Must check both USING (existing row) and WITH CHECK (updated row)
CREATE POLICY "Users can update meal schedules"
  ON meal_schedules
  FOR UPDATE
  TO authenticated
  USING (
    (
      -- Personal schedule: profile_id belongs to auth user, household_id is NULL
      household_id IS NULL
      AND profile_id IS NOT NULL
      AND is_user_profile(profile_id)
    )
    OR
    (
      -- Household schedule: user is active household member
      household_id IS NOT NULL
      AND is_user_household_member(household_id)
    )
  )
  WITH CHECK (
    (
      -- Personal schedule: profile_id belongs to auth user, household_id is NULL
      household_id IS NULL
      AND profile_id IS NOT NULL
      AND is_user_profile(profile_id)
    )
    OR
    (
      -- Household schedule: user is active household member
      household_id IS NOT NULL
      AND is_user_household_member(household_id)
    )
  );

-- 4️⃣ DELETE Policy
-- Users can delete their personal schedules or household schedules they're members of
CREATE POLICY "Users can delete meal schedules"
  ON meal_schedules
  FOR DELETE
  TO authenticated
  USING (
    (
      -- Personal schedule: profile_id belongs to auth user, household_id is NULL
      household_id IS NULL
      AND profile_id IS NOT NULL
      AND is_user_profile(profile_id)
    )
    OR
    (
      -- Household schedule: user is active household member
      household_id IS NOT NULL
      AND is_user_household_member(household_id)
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can create meal schedules" ON meal_schedules IS
  'Allows authenticated users to create meal schedules. Personal schedules require profile_id IS NOT NULL, household_id IS NULL, and profile must belong to auth user. Household schedules require household_id IS NOT NULL, profile_id IS NULL, and user must be active household member. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can read meal schedules" ON meal_schedules IS
  'Allows authenticated users to read meal schedules in their personal spaces (profile_id matches) or households they are active members of. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can update meal schedules" ON meal_schedules IS
  'Allows authenticated users to update meal schedules in their personal spaces (profile_id matches) or households they are active members of. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can delete meal schedules" ON meal_schedules IS
  'Allows authenticated users to delete meal schedules in their personal spaces (profile_id matches) or households they are active members of. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';
