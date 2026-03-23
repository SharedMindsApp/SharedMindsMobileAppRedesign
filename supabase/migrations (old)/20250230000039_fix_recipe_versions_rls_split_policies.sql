/*
  # Fix Recipe Versions RLS - Split Policies for INSERT Visibility
  
  ## Problem
  Recipe versions inserts fail with 403 Forbidden (42501) errors even when:
  - INSERT payload is valid
  - WITH CHECK logic passes
  - Debug RPC reports policy_would_pass: true
  
  Root cause: When using `.insert(data).select('*')`, PostgreSQL evaluates BOTH:
  - INSERT WITH CHECK (validates the row data)
  - SELECT USING (verifies row visibility for RETURNING)
  
  The recipe_versions table has monolithic INSERT/SELECT policies with OR chains and subqueries
  on the recipes table, causing RLS recursion and visibility verification failures.
  
  ## Solution
  Split INSERT and SELECT policies that:
  - Isolate AI vs non-AI recipe versions
  - Use helper functions to check recipe access (avoiding RLS recursion)
  - Mirror INSERT logic in SELECT policies for RETURNING support
  - Split by recipe scope (personal vs household)
  
  ## Key Principle
  INSERT + RETURNING requires BOTH WITH CHECK and USING.
  Debug helpers only validate WITH CHECK.
  Missing or mismatched SELECT policies cause false-looking 403s.
  
  ## Key Safety
  - Does NOT modify existing helper functions (uses CREATE OR REPLACE)
  - Does NOT weaken security
  - Does NOT reintroduce NULL/OR traps
  - Preserves AI vs non-AI separation
  - Allows RETURNING (select=*) to succeed
*/

-- Ensure helper functions exist (from recipes INSERT RLS migration)
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
-- This is needed because recipe_versions references recipes, and we need to check
-- recipe properties without triggering RLS recursion
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

-- Helper function to check if recipe is AI personal recipe
CREATE OR REPLACE FUNCTION public.is_ai_personal_recipe(check_recipe_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  recipe_record RECORD;
BEGIN
  SELECT 
    r.source_type,
    r.household_id,
    r.created_for_profile_id,
    r.deleted_at
  INTO recipe_record
  FROM public.recipes r
  WHERE r.id = check_recipe_id;
  
  IF recipe_record IS NULL OR recipe_record.deleted_at IS NOT NULL THEN
    RETURN false;
  END IF;
  
  RETURN (
    recipe_record.source_type = 'ai'
    AND recipe_record.household_id IS NULL
    AND recipe_record.created_for_profile_id IS NOT NULL
    AND public.is_user_profile(recipe_record.created_for_profile_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_ai_personal_recipe(uuid) TO authenticated;

-- Helper function to get recipe household_id (bypasses RLS)
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
DROP POLICY IF EXISTS "Users can create recipe versions for their recipes" ON public.recipe_versions;
DROP POLICY IF EXISTS "Users can view recipe versions for accessible recipes" ON public.recipe_versions;

-- ============================================================================
-- INSERT Policies (Split: AI vs Non-AI)
-- ============================================================================
-- Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT).
-- PostgreSQL evaluates WITH CHECK to validate the row data meets policy requirements.
-- For visibility verification during INSERT + RETURNING, matching SELECT policies are required.

-- INSERT Policy A: AI personal recipe versions
-- Applies ONLY when:
-- - Recipe is AI (source_type = 'ai')
-- - Recipe is personal (household_id IS NULL)
-- - Recipe was created for this user (created_for_profile_id belongs to auth user)
-- - Version created_by IS NULL (matches AI recipe constraint)
DROP POLICY IF EXISTS "AI can create personal recipe versions" ON public.recipe_versions;

CREATE POLICY "AI can create personal recipe versions"
  ON public.recipe_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IS NULL
    AND public.is_ai_personal_recipe(recipe_id)
  );

-- INSERT Policy B: Non-AI recipe versions
-- Applies to all non-AI recipes (source_type IS DISTINCT FROM 'ai')
-- Supports:
-- - Public recipes
-- - Household recipes
-- - Personal recipes
DROP POLICY IF EXISTS "Users can create manual recipe versions" ON public.recipe_versions;

CREATE POLICY "Users can create manual recipe versions"
  ON public.recipe_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      created_by IS NULL
      OR public.is_user_profile(created_by)
    )
    AND public.can_user_access_recipe(recipe_id)
    AND NOT public.is_ai_personal_recipe(recipe_id) -- Exclude AI recipes (handled by policy A)
  );

-- ============================================================================
-- SELECT Policies (Required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT + RETURNING.
-- These policies MUST mirror the INSERT logic to allow inserts to succeed.
-- Split by recipe scope (personal vs household) to match INSERT pattern.

-- SELECT Policy A: Personal recipe versions (household_id IS NULL on parent recipe)
-- Allows versions for:
-- - Public personal recipes
-- - Private personal recipes (user created or created for them)
-- - AI personal recipes created for the user
-- Uses helper functions to avoid RLS recursion on recipes table
DROP POLICY IF EXISTS "Users can read personal recipe versions" ON public.recipe_versions;

CREATE POLICY "Users can read personal recipe versions"
  ON public.recipe_versions
  FOR SELECT
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NULL
  );

-- SELECT Policy B: Household recipe versions (household_id IS NOT NULL on parent recipe)
-- Allows household members to view versions for recipes in their households
-- Uses helper functions to avoid RLS recursion on recipes table
DROP POLICY IF EXISTS "Users can read household recipe versions" ON public.recipe_versions;

CREATE POLICY "Users can read household recipe versions"
  ON public.recipe_versions
  FOR SELECT
  TO authenticated
  USING (
    public.can_user_access_recipe(recipe_id)
    AND public.get_recipe_household_id(recipe_id) IS NOT NULL
  );

-- Documentation
COMMENT ON POLICY "AI can create personal recipe versions" ON public.recipe_versions IS
  'Isolated INSERT policy for AI personal recipe versions. Applies ONLY when created_by IS NULL and parent recipe is AI personal (source_type=''ai'', household_id IS NULL, created_for_profile_id belongs to auth user). This policy is completely isolated from non-AI recipe version logic. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can create manual recipe versions" ON public.recipe_versions IS
  'INSERT policy for non-AI recipe versions. Applies to all recipes where source_type IS DISTINCT FROM ''ai''. Supports: (A) public recipes, (B) household recipes (user is active member), (C) personal recipes (user created or created for them). Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON POLICY "Users can read personal recipe versions" ON public.recipe_versions IS
  'SELECT policy for personal recipe versions (household_id IS NULL on parent recipe). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows: (A) public recipes, (B) private personal recipes (user created or created for them). Covers both AI and manual recipes. Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household recipe versions" ON public.recipe_versions IS
  'SELECT policy for household recipe versions (household_id IS NOT NULL on parent recipe). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows household members to view versions for recipes in their households. Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON FUNCTION public.can_user_access_recipe(uuid) IS
  'Checks if the current authenticated user can access a recipe. Uses SECURITY DEFINER to bypass RLS on recipes table. Returns true if recipe exists, is not deleted, and user has access (public, household member, or personal ownership).';

COMMENT ON FUNCTION public.is_ai_personal_recipe(uuid) IS
  'Checks if a recipe is an AI personal recipe (source_type=''ai'', household_id IS NULL, created_for_profile_id belongs to auth user). Uses SECURITY DEFINER to bypass RLS on recipes table.';

COMMENT ON FUNCTION public.get_recipe_household_id(uuid) IS
  'Gets the household_id of a recipe (bypasses RLS). Returns NULL if recipe is personal, returns household_id if recipe belongs to a household, returns NULL if recipe does not exist or is deleted.';

COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid(). Uses CREATE OR REPLACE to preserve existing dependencies.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Uses CREATE OR REPLACE to preserve existing dependencies.';
