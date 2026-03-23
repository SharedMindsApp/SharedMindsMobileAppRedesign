/*
  # Update RLS Policies for AI Personal Recipes

  ## Problem
  Current RLS policies don't allow AI recipes in personal spaces because:
  - created_by must be NULL (enforced by constraint)
  - household_id is NULL (personal space)
  - RLS requires either created_by OR household_id membership
  - Result: AI recipes in personal spaces fail RLS

  ## Solution
  Update INSERT and SELECT policies to allow AI recipes with created_for_profile_id:
  - INSERT: Allow AI recipes with household_id NULL IF created_for_profile_id matches user's profile
  - SELECT: Allow users to view recipes where created_for_profile_id matches their profile

  ## Changes
  - Drop and recreate INSERT policy to include personal AI recipes
  - Drop and recreate SELECT policy to include personal AI recipes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;
DROP POLICY IF EXISTS "Users can view accessible recipes" ON recipes;

-- Create updated INSERT policy
CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- AI recipes: created_by must be NULL (enforced by constraint)
      (source_type = 'ai' AND created_by IS NULL)
      OR
      -- User recipes: created_by must match user's profile ID
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
      -- Case B: Household/private recipes (user or AI)
      (
        household_id IS NOT NULL
        AND (
          is_user_personal_space(household_id)
          OR is_user_household_member(household_id)
        )
      )
      OR
      -- Case C: Personal-space AI recipes (NEW)
      (
        source_type = 'ai'
        AND is_public = false
        AND household_id IS NULL
        AND created_by IS NULL
        AND created_for_profile_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Create updated SELECT policy
CREATE POLICY "Users can view accessible recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Public recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Recipes in user's personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Recipes in user's shared households
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- User's own recipes (check via profile ID, not auth.uid())
      (
        created_by IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
      OR
      -- Personal AI recipes created for this user (NEW)
      (
        created_for_profile_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can create recipes" ON recipes IS 
  'Allows authenticated users to create recipes. AI recipes must have created_by = NULL. User recipes must have created_by matching their profile.id or NULL. Recipes can be created as: (A) public recipes, (B) household/private recipes in accessible spaces, or (C) personal AI recipes with created_for_profile_id matching the user.';

COMMENT ON POLICY "Users can view accessible recipes" ON recipes IS 
  'Allows authenticated users to view recipes they have access to. Includes: public recipes, household/personal-space recipes, user-created recipes (via profile.id), and personal AI recipes (via created_for_profile_id).';
