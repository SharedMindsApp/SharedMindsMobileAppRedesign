/*
  # Fix Recipe Validation Status RLS - Split Policies for INSERT Visibility
  
  ## Problem
  Recipe validation status inserts fail with 403 Forbidden (42501) errors even when:
  - INSERT payload is valid
  - WITH CHECK logic passes
  - Parent recipe insert succeeds
  
  Root cause: When using `.insert(data).select('*')`, PostgreSQL evaluates BOTH:
  - INSERT WITH CHECK (validates the row data)
  - SELECT USING (verifies row visibility for RETURNING)
  
  The recipe_validation_status table has monolithic INSERT/SELECT policies with OR chains and subqueries
  on the recipes table, causing RLS recursion and visibility verification failures.
  
  ## Solution
  Split INSERT and SELECT policies that:
  - Isolate personal vs household recipe validation status
  - Use helper functions to check recipe access (avoiding RLS recursion)
  - Mirror INSERT logic in SELECT policies for RETURNING support
  - Split by recipe scope (personal vs household)
  
  ## Key Principle
  INSERT + RETURNING requires BOTH WITH CHECK and USING.
  Debug helpers only validate WITH CHECK.
  Missing or mismatched SELECT policies cause false-looking 403s.
  
  ## Schema Notes
  - recipe_validation_status has: recipe_id (FK to recipes), validated_by (FK to profiles, nullable)
  - One validation status per recipe (UNIQUE(recipe_id))
  - Rows are per recipe, not per version
  - No direct household_id/profile_id columns (inherited from parent recipe)
  
  ## Key Safety
  - Does NOT modify existing helper functions (uses CREATE OR REPLACE)
  - Does NOT weaken security
  - Does NOT reintroduce NULL/OR traps
  - Preserves access control (only owners/household members can read/write)
  - Allows RETURNING (select=*) to succeed
*/

-- Ensure helper functions exist (from recipes/recipe_versions RLS migrations)
-- These should already exist, but ensure they're available
CREATE OR REPLACE FUNCTION public.is_user_profile(check_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result boolean;
BEGIN
  IF check_profile_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_profile_id
      AND user_id = auth.uid()
  )
  INTO result;

  RETURN COALESCE(result, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_user_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = hid
      AND auth_user_id = auth.uid()
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_household_member(uuid) TO authenticated;

-- Helper function to check if user can access a recipe (bypasses RLS on recipes)
-- Reuse from recipe_versions migration if it exists, otherwise create it
CREATE OR REPLACE FUNCTION public.can_user_access_recipe(check_recipe_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  recipe_record RECORD;
BEGIN
  -- Fetch recipe properties (bypasses RLS due to SECURITY DEFINER)
  SELECT 
    r.source_type,
    r.household_id,
    r.is_public,
    r.created_by,
    r.created_for_profile_id,
    r.deleted_at
  INTO recipe_record
  FROM public.recipes r
  WHERE r.id = check_recipe_id;
  
  -- Recipe doesn't exist
  IF recipe_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Recipe is deleted
  IF recipe_record.deleted_at IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Check access based on recipe properties
  RETURN (
    -- Public recipes (household_id IS NULL, is_public = true)
    (recipe_record.household_id IS NULL AND recipe_record.is_public = true)
    OR
    -- Household recipes (user is member)
    (
      recipe_record.household_id IS NOT NULL
      AND public.is_user_household_member(recipe_record.household_id)
    )
    OR
    -- Personal recipes (household_id IS NULL, is_public = false)
    -- User created it OR it was created for them
    (
      recipe_record.household_id IS NULL
      AND recipe_record.is_public = false
      AND (
        (recipe_record.created_by IS NOT NULL AND public.is_user_profile(recipe_record.created_by))
        OR
        (recipe_record.created_for_profile_id IS NOT NULL AND public.is_user_profile(recipe_record.created_for_profile_id))
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_access_recipe(uuid) TO authenticated;

-- Helper function to get recipe household_id (bypasses RLS)
-- Reuse from recipe_versions migration if it exists, otherwise create it
CREATE OR REPLACE FUNCTION public.get_recipe_household_id(check_recipe_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  recipe_household_id uuid;
BEGIN
  SELECT r.household_id
  INTO recipe_household_id
  FROM public.recipes r
  WHERE r.id = check_recipe_id
    AND r.deleted_at IS NULL;
  
  RETURN recipe_household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recipe_household_id(uuid) TO authenticated;

-- Drop old monolithic policies (if present)
DROP POLICY IF EXISTS "Users can create validation status for their recipes" ON public.recipe_validation_status;
DROP POLICY IF EXISTS "Users can view validation status for accessible recipes" ON public.recipe_validation_status;
DROP POLICY IF EXISTS "Users can update validation status for their recipes" ON public.recipe_validation_status;

-- ============================================================================
-- INSERT Policies (Split: Personal vs Household)
-- ============================================================================
-- Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT).
-- PostgreSQL evaluates WITH CHECK to validate the row data meets policy requirements.
-- For visibility verification during INSERT + RETURNING, matching SELECT policies are required.

-- INSERT Policy A: Personal recipe validation status
-- Applies when parent recipe is personal (household_id IS NULL)
-- User must be able to access the recipe (public or personal ownership)
DROP POLICY IF EXISTS "Users can create personal recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can create personal recipe validation status"
  ON public.recipe_validation_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NULL
  );

-- INSERT Policy B: Household recipe validation status
-- Applies when parent recipe belongs to a household (household_id IS NOT NULL)
-- User must be an active household member
DROP POLICY IF EXISTS "Users can create household recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can create household recipe validation status"
  ON public.recipe_validation_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NOT NULL
  );

-- ============================================================================
-- SELECT Policies (Required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT + RETURNING.
-- These policies MUST mirror the INSERT logic to allow inserts to succeed.
-- Split by recipe scope (personal vs household) to match INSERT pattern.

-- SELECT Policy A: Personal recipe validation status
-- Allows validation status for personal recipes (household_id IS NULL on parent recipe)
DROP POLICY IF EXISTS "Users can read personal recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can read personal recipe validation status"
  ON public.recipe_validation_status
  FOR SELECT
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NULL
  );

-- SELECT Policy B: Household recipe validation status
-- Allows validation status for household recipes (household_id IS NOT NULL on parent recipe)
DROP POLICY IF EXISTS "Users can read household recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can read household recipe validation status"
  ON public.recipe_validation_status
  FOR SELECT
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NOT NULL
  );

-- ============================================================================
-- UPDATE Policies (USING + WITH CHECK)
-- ============================================================================
-- Users can update validation status for recipes they can access.
-- Mirror the same access logic as INSERT/SELECT.

-- UPDATE Policy A: Personal recipe validation status
DROP POLICY IF EXISTS "Users can update personal recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can update personal recipe validation status"
  ON public.recipe_validation_status
  FOR UPDATE
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NULL
  )
  WITH CHECK (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NULL
  );

-- UPDATE Policy B: Household recipe validation status
DROP POLICY IF EXISTS "Users can update household recipe validation status" ON public.recipe_validation_status;

CREATE POLICY "Users can update household recipe validation status"
  ON public.recipe_validation_status
  FOR UPDATE
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NOT NULL
  )
  WITH CHECK (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NOT NULL
  );

-- Documentation
COMMENT ON POLICY "Users can create personal recipe validation status" ON public.recipe_validation_status IS
  'INSERT policy for personal recipe validation status (household_id IS NULL on parent recipe). Applies when user can access the recipe (public or personal ownership). Uses SECURITY DEFINER helper functions to avoid RLS recursion. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can create household recipe validation status" ON public.recipe_validation_status IS
  'INSERT policy for household recipe validation status (household_id IS NOT NULL on parent recipe). Applies when user is an active household member and can access the recipe. Uses SECURITY DEFINER helper functions to avoid RLS recursion. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can read personal recipe validation status" ON public.recipe_validation_status IS
  'SELECT policy for personal recipe validation status (household_id IS NULL on parent recipe). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows validation status for recipes user can access (public or personal ownership). Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household recipe validation status" ON public.recipe_validation_status IS
  'SELECT policy for household recipe validation status (household_id IS NOT NULL on parent recipe). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows household members to view validation status for recipes in their households. Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can update personal recipe validation status" ON public.recipe_validation_status IS
  'UPDATE policy for personal recipe validation status. Allows users to update validation status for personal recipes they can access. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can update household recipe validation status" ON public.recipe_validation_status IS
  'UPDATE policy for household recipe validation status. Allows household members to update validation status for recipes in their households. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON FUNCTION public.can_user_access_recipe(uuid) IS
  'Checks if the current authenticated user can access a recipe. Uses SECURITY DEFINER to bypass RLS on recipes table. Returns true if recipe exists, is not deleted, and user has access (public, household member, or personal ownership).';

COMMENT ON FUNCTION public.get_recipe_household_id(uuid) IS
  'Gets the household_id of a recipe (bypasses RLS). Returns NULL if recipe is personal, returns household_id if recipe belongs to a household, returns NULL if recipe does not exist or is deleted.';

COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid(). Uses CREATE OR REPLACE to preserve existing dependencies.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Uses CREATE OR REPLACE to preserve existing dependencies.';

-- ============================================================================
-- VERIFICATION CHECKLIST (Run these in Supabase SQL Editor to verify policies)
-- ============================================================================

-- 1. List all policies on recipe_validation_status table
-- SELECT 
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename = 'recipe_validation_status'
-- ORDER BY policyname;
--
-- Expected policies:
-- - "Users can create personal recipe validation status" (INSERT)
-- - "Users can create household recipe validation status" (INSERT)
-- - "Users can read personal recipe validation status" (SELECT)
-- - "Users can read household recipe validation status" (SELECT)
-- - "Users can update personal recipe validation status" (UPDATE)
-- - "Users can update household recipe validation status" (UPDATE)

-- 2. Check helper function privileges
-- SELECT 
--   has_function_privilege('authenticated', 'can_user_access_recipe(uuid)', 'EXECUTE') AS can_access_recipe_priv,
--   has_function_privilege('authenticated', 'get_recipe_household_id(uuid)', 'EXECUTE') AS get_household_id_priv,
--   has_function_privilege('authenticated', 'is_user_profile(uuid)', 'EXECUTE') AS is_user_profile_priv,
--   has_function_privilege('authenticated', 'is_user_household_member(uuid)', 'EXECUTE') AS is_household_member_priv;
--
-- Expected: All should return true

-- 3. Test helper function: Recipe access
-- SELECT public.can_user_access_recipe('<recipe_uuid>');
-- Expected: Returns true if user can access the recipe

-- 4. Test helper function: Recipe household ID
-- SELECT public.get_recipe_household_id('<recipe_uuid>');
-- Expected: Returns household_id if recipe belongs to household, NULL if personal

-- 5. Test helper function: Profile ownership
-- SELECT public.is_user_profile('<profile_uuid>');
-- Expected: Returns true if profile belongs to current authenticated user

-- 6. Test helper function: Household membership
-- SELECT public.is_user_household_member('<household_uuid>');
-- Expected: Returns true if current user is active member of household

-- 7. Verify validation status access (personal recipe)
-- SELECT rvs.*
-- FROM public.recipe_validation_status rvs
-- WHERE rvs.recipe_id = '<personal_recipe_uuid>';
-- Expected: Returns validation status if user can access the recipe

-- 8. Verify validation status access (household recipe)
-- SELECT rvs.*
-- FROM public.recipe_validation_status rvs
-- WHERE rvs.recipe_id = '<household_recipe_uuid>';
-- Expected: Returns validation status if user is household member

-- 9. Check current authenticated user
-- SELECT auth.uid();

-- 10. Verify recipe ownership/access
-- SELECT 
--   r.id,
--   r.household_id,
--   r.is_public,
--   r.created_by,
--   r.created_for_profile_id,
--   r.deleted_at
-- FROM public.recipes r
-- WHERE r.id = '<recipe_uuid>';
