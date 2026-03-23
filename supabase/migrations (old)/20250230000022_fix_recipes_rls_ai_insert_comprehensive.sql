/*
  # Fix AI Recipe Insert RLS Failures (Final)
  
  ## Problem
  AI-generated recipes fail to save with 403 Forbidden errors due to:
  1. RLS recursion when checking profiles table
  2. Household membership checks not running under SECURITY DEFINER
  3. INSERT policy not explicitly covering personal AI recipes
  4. Ambiguous ownership logic
  
  ## Solution
  1. Create SECURITY DEFINER helper for profile ownership (avoids RLS recursion)
  2. Ensure household membership check is SECURITY DEFINER
  3. Replace INSERT policy with case-based logic that explicitly handles all valid scenarios
*/

-- 1️⃣ Create SECURITY DEFINER helper for profile ownership
-- This bypasses RLS on the profiles table to avoid recursion issues
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

-- 2️⃣ Ensure household membership check is SECURITY DEFINER
-- Note: household_members table uses auth_user_id (not user_id)
-- Drop existing function first if it has a different parameter name
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

-- 3️⃣ Replace the INSERT policy on recipes
-- Drop existing policy
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

-- Create case-based INSERT policy that explicitly handles all valid scenarios
CREATE POLICY "Users can create recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Source & ownership validation
    (
      -- AI recipes
      (source_type = 'ai' AND created_by IS NULL)

      OR

      -- User-created recipes
      (
        source_type != 'ai'
        AND (
          created_by IS NULL
          OR is_user_profile(created_by)
        )
      )
    )

    AND

    (
      -- Case A: Public/global recipes
      (is_public = true AND household_id IS NULL)

      OR

      -- Case B: Household recipes (AI or user)
      (
        household_id IS NOT NULL
        AND is_user_household_member(household_id)
        AND (
          created_for_profile_id IS NULL
          OR is_user_profile(created_for_profile_id)
        )
      )

      OR

      -- Case C: Personal AI recipes (most common failure case)
      (
        source_type = 'ai'
        AND is_public = false
        AND household_id IS NULL
        AND created_by IS NULL
        AND created_for_profile_id IS NOT NULL
        AND is_user_profile(created_for_profile_id)
      )
    )
  );

-- Add documentation
COMMENT ON POLICY "Users can create recipes" ON recipes IS
  'Allows authenticated users to create AI and user recipes in public, household, and personal spaces without RLS recursion.';
