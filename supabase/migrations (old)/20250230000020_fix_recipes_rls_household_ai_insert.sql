/*
  # Fix Recipes RLS Policy for Household AI Recipe Insert
  
  ## Problem
  The INSERT policy for household AI recipes is failing because:
  - For household spaces, household_id is set to households.id (from space.context_id)
  - The policy checks is_user_personal_space(household_id) which will fail for household spaces
  - The policy should allow AI recipes in household spaces if the user is a household member
  
  ## Solution
  Update the INSERT policy to:
  1. For household spaces (household_id IS NOT NULL): Only check is_user_household_member (not is_user_personal_space)
  2. For personal spaces (household_id IS NULL): Use created_for_profile_id check
  3. Ensure AI recipes can be created in both contexts
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

-- Create updated INSERT policy with correct household AI recipe support
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
      -- Case B: Household recipes (user or AI) - requires household_id and membership
      -- For household spaces, household_id is households.id (from space.context_id)
      -- We only check is_user_household_member (not is_user_personal_space, which is for personal spaces)
      (
        household_id IS NOT NULL
        AND is_user_household_member(household_id)
      )
      OR
      -- Case C: Personal-space AI recipes (household_id IS NULL, is_public = false)
      -- This is for personal spaces - no household_id, just created_for_profile_id check
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
  'Allows authenticated users to create recipes. Supports: (A) public recipes (is_public=true, household_id=NULL), (B) household/private recipes in accessible spaces (household_id NOT NULL AND is_user_household_member), (C) personal AI recipes (source_type=ai, household_id=NULL, created_for_profile_id matches user''s profile).';
