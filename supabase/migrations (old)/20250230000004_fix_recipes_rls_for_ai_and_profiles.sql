/*
  # Fix Recipes RLS Policy for AI Recipes and Profile IDs

  ## Problem
  The current RLS policy requires `created_by = auth.uid()`, but:
  1. `created_by` references `profiles.id` (not `auth.users.id`)
  2. AI recipes have `created_by = NULL` (system-generated)
  3. The policy check fails for both cases

  ## Solution
  Update the INSERT policy to:
  - Allow AI recipes with `created_by IS NULL`
  - Allow user recipes with `created_by = profiles.id` (converted from auth.uid())
  - Keep existing household/space checks
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Users can create recipes" ON recipes;

-- Create updated policy that handles both AI recipes and profile ID conversion
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
      -- Can create in personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Can create in shared households they're members of
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- Can create public recipes (AI recipes can be public or private)
      (is_public = true AND household_id IS NULL)
      OR
      -- Can create private recipes in their household (for AI recipes too)
      (is_public = false AND household_id IS NOT NULL AND is_user_household_member(household_id))
    )
  );

-- Also update the SELECT policy to handle profile ID conversion
DROP POLICY IF EXISTS "Users can view accessible recipes" ON recipes;

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
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can create recipes" ON recipes IS 
  'Allows authenticated users to create recipes. AI recipes must have created_by = NULL. User recipes must have created_by matching their profile.id or NULL. Recipes can be created in personal spaces, shared households, or as public/private recipes.';

COMMENT ON POLICY "Users can view accessible recipes" ON recipes IS 
  'Allows authenticated users to view recipes they have access to. Checks created_by via profile.id conversion from auth.uid().';
