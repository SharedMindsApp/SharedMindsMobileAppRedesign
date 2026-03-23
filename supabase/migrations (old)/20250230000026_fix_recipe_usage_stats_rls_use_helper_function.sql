/*
  # Fix Recipe Usage Stats RLS Policies to Use Helper Functions

  ## Problem
  The recipe_usage_stats RLS policies are using subqueries that may hit RLS on the recipes or profiles tables,
  causing recursion issues or permission failures. The policies need to use SECURITY DEFINER helper functions
  to avoid RLS recursion, similar to the recipes table fix.

  ## Solution
  Update recipe_usage_stats policies to use:
  - is_user_profile() helper function for profile ownership checks
  - is_user_household_member() helper function for household membership checks
  - Ensure policies correctly handle personal AI recipes (created_for_profile_id)
*/

-- Ensure helper functions exist (from migration 20250230000022)
-- These should already exist, but we'll check and create if needed

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

-- 3️⃣ Drop existing policies
DROP POLICY IF EXISTS "Users can view usage stats for accessible recipes" ON recipe_usage_stats;
DROP POLICY IF EXISTS "System can insert usage stats" ON recipe_usage_stats;
DROP POLICY IF EXISTS "System can update usage stats" ON recipe_usage_stats;

-- 4️⃣ Create updated SELECT policy using helper functions
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
        -- Household recipes (user is a member)
        (
          r.household_id IS NOT NULL
          AND is_user_household_member(r.household_id)
        )
        OR
        -- User's own recipes (via profile)
        (
          r.created_by IS NOT NULL
          AND is_user_profile(r.created_by)
        )
        OR
        -- Personal AI recipes created for this user
        (
          r.source_type = 'ai'
          AND r.is_public = false
          AND r.household_id IS NULL
          AND r.created_by IS NULL
          AND r.created_for_profile_id IS NOT NULL
          AND is_user_profile(r.created_for_profile_id)
        )
      )
    )
  );

-- 5️⃣ Create updated INSERT policy using helper functions
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
        -- Household recipes (user is a member)
        (
          r.household_id IS NOT NULL
          AND is_user_household_member(r.household_id)
        )
        OR
        -- User's own recipes (via profile)
        (
          r.created_by IS NOT NULL
          AND is_user_profile(r.created_by)
        )
        OR
        -- Personal AI recipes created for this user
        (
          r.source_type = 'ai'
          AND r.is_public = false
          AND r.household_id IS NULL
          AND r.created_by IS NULL
          AND r.created_for_profile_id IS NOT NULL
          AND is_user_profile(r.created_for_profile_id)
        )
      )
    )
  );

-- 6️⃣ Create updated UPDATE policy using helper functions
CREATE POLICY "System can update usage stats"
  ON recipe_usage_stats FOR UPDATE
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
        -- Household recipes (user is a member)
        (
          r.household_id IS NOT NULL
          AND is_user_household_member(r.household_id)
        )
        OR
        -- User's own recipes (via profile)
        (
          r.created_by IS NOT NULL
          AND is_user_profile(r.created_by)
        )
        OR
        -- Personal AI recipes created for this user
        (
          r.source_type = 'ai'
          AND r.is_public = false
          AND r.household_id IS NULL
          AND r.created_by IS NULL
          AND r.created_for_profile_id IS NOT NULL
          AND is_user_profile(r.created_for_profile_id)
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
        -- Public recipes
        (r.is_public = true AND r.household_id IS NULL)
        OR
        -- Household recipes (user is a member)
        (
          r.household_id IS NOT NULL
          AND is_user_household_member(r.household_id)
        )
        OR
        -- User's own recipes (via profile)
        (
          r.created_by IS NOT NULL
          AND is_user_profile(r.created_by)
        )
        OR
        -- Personal AI recipes created for this user
        (
          r.source_type = 'ai'
          AND r.is_public = false
          AND r.household_id IS NULL
          AND r.created_by IS NULL
          AND r.created_for_profile_id IS NOT NULL
          AND is_user_profile(r.created_for_profile_id)
        )
      )
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can view usage stats for accessible recipes" ON recipe_usage_stats IS 
  'Allows authenticated users to view usage stats for recipes they have access to. Uses helper functions to avoid RLS recursion. Includes personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "System can insert usage stats" ON recipe_usage_stats IS 
  'Allows authenticated users to create usage stats for recipes they have access to. Uses helper functions to avoid RLS recursion. Includes personal AI recipes via created_for_profile_id.';

COMMENT ON POLICY "System can update usage stats" ON recipe_usage_stats IS 
  'Allows authenticated users to update usage stats for recipes they have access to. Uses helper functions to avoid RLS recursion. Includes personal AI recipes via created_for_profile_id.';
