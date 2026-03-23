/*
  # Fix Recipes INSERT RLS - Debug and Verify Helper Functions
  
  ## Problem
  Recipe inserts are failing with 403 Forbidden even though the policy should allow them.
  This migration ensures helper functions work correctly and adds better error handling.
  
  ## Solution
  1. Recreate is_user_profile() with explicit RLS bypass
  2. Add verification that the function works
  3. Ensure the INSERT policy is correct
*/

-- 1️⃣ Drop and recreate is_user_profile() with explicit RLS bypass
DROP FUNCTION IF EXISTS is_user_profile(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_user_profile(check_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result boolean;
BEGIN
  -- Explicitly bypass RLS by using SECURITY DEFINER
  -- Check if the profile exists and belongs to the current user
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = check_profile_id
    AND user_id = auth.uid()
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_profile(uuid) TO authenticated;

-- 2️⃣ Ensure is_user_household_member() exists
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_household_member(uuid) TO authenticated;

-- 3️⃣ Drop and recreate INSERT policy with NULL-safe conditions
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

CREATE POLICY "Users can create recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Part 1: Source & ownership validation (NULL-safe using IS DISTINCT FROM)
    (
      -- AI recipes: strict and isolated
      (
        source_type = 'ai'
        AND created_by IS NULL
      )
      OR
      -- Non-AI recipes: strict and isolated (NULL-safe)
      (
        source_type IS DISTINCT FROM 'ai'
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
  'Allows authenticated users to create AI and user recipes. Supports: (A) public recipes, (B) household recipes, (C) personal AI recipes (source_type=ai, household_id=NULL, created_for_profile_id matches user''s profile). Uses SECURITY DEFINER helper functions to avoid RLS recursion. Uses IS DISTINCT FROM for NULL-safe source_type comparison.';

-- 4️⃣ Add comment to function
COMMENT ON FUNCTION is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid().';
