/*
  # Fix Recipe Versions RLS Policy for AI Personal Recipes

  ## Problem
  The trigger `create_initial_recipe_version()` automatically creates a version when a recipe is inserted.
  However, the recipe_versions INSERT policy requires:
  - created_by = auth.uid() (wrong ID type - should be profile.id)
  - Doesn't account for AI recipes (created_by = NULL)
  - Doesn't account for personal AI recipes (created_for_profile_id)

  ## Solution
  Update recipe_versions INSERT policy to:
  - Allow created_by = NULL for AI recipes
  - Use profile lookup instead of direct auth.uid() comparison
  - Check created_for_profile_id for personal AI recipes
  - Match the recipe's access rules (if user can access recipe, they can create version)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create recipe versions for their recipes" ON recipe_versions;

-- Create updated INSERT policy
CREATE POLICY "Users can create recipe versions for their recipes"
  ON recipe_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- AI recipes: created_by must be NULL (matches recipe constraint)
      (
        EXISTS (
          SELECT 1 FROM recipes r
          WHERE r.id = recipe_versions.recipe_id
          AND r.source_type = 'ai'
        )
        AND created_by IS NULL
      )
      OR
      -- User recipes: created_by must match user's profile ID
      (
        created_by IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
    AND EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_versions.recipe_id
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
        -- User's own recipes (check via profile ID)
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
DROP POLICY IF EXISTS "Users can view recipe versions for accessible recipes" ON recipe_versions;

CREATE POLICY "Users can view recipe versions for accessible recipes"
  ON recipe_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_versions.recipe_id
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

-- Update UPDATE policy to use profile lookup
DROP POLICY IF EXISTS "Users can update their recipe versions" ON recipe_versions;

CREATE POLICY "Users can update their recipe versions"
  ON recipe_versions FOR UPDATE
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Allow updates for AI recipe versions (created_by = NULL) if user can access the recipe
    (
      created_by IS NULL
      AND EXISTS (
        SELECT 1 FROM recipes r
        WHERE r.id = recipe_versions.recipe_id
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
  )
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Allow updates for AI recipe versions (created_by = NULL) if user can access the recipe
    (
      created_by IS NULL
      AND EXISTS (
        SELECT 1 FROM recipes r
        WHERE r.id = recipe_versions.recipe_id
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
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can create recipe versions for their recipes" ON recipe_versions IS 
  'Allows authenticated users to create recipe versions. For AI recipes, created_by must be NULL. For user recipes, created_by must match their profile.id. Users can create versions for recipes they have access to (public, household, personal, or their own).';

COMMENT ON POLICY "Users can view recipe versions for accessible recipes" ON recipe_versions IS 
  'Allows authenticated users to view recipe versions for recipes they have access to. Matches recipe visibility rules including personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "Users can update their recipe versions" ON recipe_versions IS 
  'Allows authenticated users to update recipe versions they created (via profile.id) or AI recipe versions for recipes they have access to.';
