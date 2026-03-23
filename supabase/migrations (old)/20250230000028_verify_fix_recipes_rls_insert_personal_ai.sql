/*
  # Verify and Fix Recipes INSERT RLS Policy for Personal AI Recipes

  ## Problem
  Personal AI recipe inserts are failing with 403 Forbidden errors even though
  the policy should allow them. This migration ensures:
  1. Helper functions exist and are correct
  2. INSERT policy correctly handles personal AI recipes
  3. All conditions are properly checked

  ## Solution
  Recreate the INSERT policy with explicit verification that all conditions
  for personal AI recipes are met.
*/

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

-- 3️⃣ Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

-- 4️⃣ Create updated INSERT policy with explicit personal AI recipe support
CREATE POLICY "Users can create recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Part 1: Source & ownership validation
    (
      -- AI recipes: created_by MUST be NULL
      (source_type = 'ai' AND created_by IS NULL)
      OR
      -- User-created recipes: created_by can be NULL or user's profile
      (
        source_type != 'ai'
        AND (
          created_by IS NULL
          OR is_user_profile(created_by)
        )
      )
    )
    AND
    -- Part 2: Space/visibility validation (at least one case must match)
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
      -- Case C: Personal AI recipes (household_id IS NULL, is_public = false)
      -- This is the key case for personal AI recipes
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

-- Add comment
COMMENT ON POLICY "Users can create recipes" ON recipes IS
  'Allows authenticated users to create AI and user recipes. Supports: (A) public recipes, (B) household recipes, (C) personal AI recipes (source_type=ai, household_id=NULL, created_for_profile_id matches user''s profile).';

-- 5️⃣ Verification query (for debugging - can be run separately)
-- This query helps verify the policy works for the current user
DO $$
DECLARE
  current_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO current_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF current_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Current user profile ID: %', current_profile_id;
    RAISE NOTICE 'is_user_profile check: %', is_user_profile(current_profile_id);
  ELSE
    RAISE NOTICE 'No profile found for current user';
  END IF;
END $$;
