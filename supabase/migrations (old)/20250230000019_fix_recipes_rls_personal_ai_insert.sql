/*
  # Fix Recipes RLS Policy for Personal AI Recipe Insert
  
  ## Problem
  The INSERT policy for personal AI recipes may not be working correctly.
  The policy should allow:
  - source_type = 'ai'
  - is_public = false
  - household_id IS NULL
  - created_by IS NULL
  - created_for_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  
  ## Solution
  Recreate the INSERT policy with explicit checks and better error handling.
  Ensure the policy explicitly allows personal AI recipes without requiring household_id checks.
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

-- Create updated INSERT policy with explicit personal AI recipe support
CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- AI recipes: created_by must be NULL (enforced by constraint)
      (source_type = 'ai' AND created_by IS NULL)
      OR
      -- User recipes: created_by must match user's profile ID or be NULL
      (
        source_type != 'ai'
        AND (
          created_by IS NULL
          OR created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
    AND (
      -- Case A: Public/global recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Case B: Household/private recipes (user or AI) - requires household_id
      (
        household_id IS NOT NULL
        AND (
          is_user_personal_space(household_id)
          OR is_user_household_member(household_id)
        )
      )
      OR
      -- Case C: Personal-space AI recipes (household_id IS NULL, is_public = false)
      -- This is the key case - no household_id, just created_for_profile_id check
      (
        source_type = 'ai'
        AND is_public = false
        AND household_id IS NULL
        AND created_by IS NULL
        AND created_for_profile_id IS NOT NULL
        AND created_for_profile_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Users can create recipes" ON recipes IS 
  'Allows authenticated users to create recipes. Supports: (A) public recipes (is_public=true, household_id=NULL), (B) household/private recipes in accessible spaces (household_id NOT NULL), (C) personal AI recipes (source_type=ai, household_id=NULL, created_for_profile_id matches user''s profile).';
