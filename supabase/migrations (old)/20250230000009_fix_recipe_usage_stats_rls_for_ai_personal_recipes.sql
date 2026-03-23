/*
  # Fix Recipe Usage Stats RLS Policy for AI Personal Recipes

  ## Problem
  The recipe_usage_stats INSERT policy allows all inserts (WITH CHECK (true)), but the SELECT policy
  checks recipe access. However, when tracking views for personal AI recipes, the policy might be
  failing because it doesn't account for created_for_profile_id.

  Also, the SELECT policy uses r.created_by = auth.uid() which is wrong (should be profile.id).

  ## Solution
  Update recipe_usage_stats policies to:
  - Use profile lookup instead of direct auth.uid() comparison
  - Check created_for_profile_id for personal AI recipes
  - Ensure INSERT policy allows tracking for accessible recipes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view usage stats for accessible recipes" ON recipe_usage_stats;
DROP POLICY IF EXISTS "System can insert usage stats" ON recipe_usage_stats;
DROP POLICY IF EXISTS "System can update usage stats" ON recipe_usage_stats;

-- Create updated SELECT policy
CREATE POLICY "Users can view usage stats for accessible recipes"
  ON recipe_usage_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_usage_stats.recipe_id
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

-- Create updated INSERT policy (allow tracking for accessible recipes)
CREATE POLICY "System can insert usage stats"
  ON recipe_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_usage_stats.recipe_id
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

-- Create updated UPDATE policy (allow updates for accessible recipes)
CREATE POLICY "System can update usage stats"
  ON recipe_usage_stats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_usage_stats.recipe_id
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
      WHERE r.id = recipe_usage_stats.recipe_id
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
COMMENT ON POLICY "Users can view usage stats for accessible recipes" ON recipe_usage_stats IS 
  'Allows authenticated users to view usage stats for recipes they have access to. Includes personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "System can insert usage stats" ON recipe_usage_stats IS 
  'Allows authenticated users to create usage stats for recipes they have access to. Includes personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "System can update usage stats" ON recipe_usage_stats IS 
  'Allows authenticated users to update usage stats for recipes they have access to. Includes personal AI recipes via created_for_profile_id.';
