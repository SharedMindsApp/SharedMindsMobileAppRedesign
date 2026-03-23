/*
  # Fix Recipe Validation Status RLS Policy for AI Personal Recipes

  ## Problem
  The trigger `create_initial_validation_status_trigger()` automatically creates a validation status
  when a recipe is inserted. However, the recipe_validation_status INSERT policy requires:
  - r.created_by = auth.uid() (wrong ID type - should be profile.id)
  - Doesn't account for AI recipes (created_by = NULL)
  - Doesn't account for personal AI recipes (created_for_profile_id)

  ## Solution
  Update recipe_validation_status INSERT policy to:
  - Use profile lookup instead of direct auth.uid() comparison
  - Allow AI recipes with created_by = NULL
  - Check created_for_profile_id for personal AI recipes
  - Match the recipe's access rules (if user can access recipe, validation status can be created)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create validation status for their recipes" ON recipe_validation_status;

-- Create updated INSERT policy
CREATE POLICY "Users can create validation status for their recipes"
  ON recipe_validation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND r.deleted_at IS NULL
      AND (
        -- Public recipes
        (r.is_public = true AND r.household_id IS NULL)
        OR
        -- Recipes in user's personal space
        (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR
        -- Recipes in user's shared households
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR
        -- User's own recipes (check via profile ID, not auth.uid())
        (
          r.created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
        OR
        -- Personal AI recipes created for this user (NEW)
        (
          r.created_for_profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Also update SELECT policy to match recipe visibility rules
DROP POLICY IF EXISTS "Users can view validation status for accessible recipes" ON recipe_validation_status;

CREATE POLICY "Users can view validation status for accessible recipes"
  ON recipe_validation_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND r.deleted_at IS NULL
      AND (
        -- Public recipes
        (r.is_public = true AND r.household_id IS NULL)
        OR
        -- Recipes in user's personal space
        (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR
        -- Recipes in user's shared households
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR
        -- User's own recipes (check via profile ID, not auth.uid())
        (
          r.created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
        OR
        -- Personal AI recipes created for this user (NEW)
        (
          r.created_for_profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Also update UPDATE policy to use profile lookup
DROP POLICY IF EXISTS "Users can update validation status for their recipes" ON recipe_validation_status;

CREATE POLICY "Users can update validation status for their recipes"
  ON recipe_validation_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (
          r.created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
        OR (
          r.created_for_profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (
          r.created_by IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
        OR (
          r.created_for_profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can create validation status for their recipes" ON recipe_validation_status IS 
  'Allows authenticated users to create validation status records for recipes they have access to. Includes public recipes, household/personal-space recipes, user-created recipes (via profile.id), and personal AI recipes (via created_for_profile_id).';

COMMENT ON POLICY "Users can view validation status for accessible recipes" ON recipe_validation_status IS 
  'Allows authenticated users to view validation status for recipes they have access to. Matches recipe visibility rules including personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "Users can update validation status for their recipes" ON recipe_validation_status IS 
  'Allows authenticated users to update validation status for recipes they have access to. Uses profile.id lookup and includes personal AI recipes via created_for_profile_id.';
