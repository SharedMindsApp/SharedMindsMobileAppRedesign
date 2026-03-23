/*
  # Fix Recipes SELECT RLS - Split Policies for INSERT Visibility
  
  ## Problem
  Recipe inserts fail with 403 Forbidden (42501) errors even when:
  - INSERT payload is valid
  - WITH CHECK logic passes
  - Debug RPC reports policy_would_pass: true
  
  Root cause: When using `.insert(data).select('*')`, PostgreSQL evaluates BOTH:
  - INSERT WITH CHECK (validates the row data)
  - SELECT USING (verifies row visibility for RETURNING)
  
  The recipes table has split INSERT policies but a monolithic SELECT policy with OR chains.
  This can cause visibility verification failures during INSERT + RETURNING operations.
  
  ## Solution
  Split SELECT policies that mirror the INSERT logic:
  - Personal recipes (household_id IS NULL): public + private personal recipes
  - Household recipes (household_id IS NOT NULL): household member access
  
  This ensures PostgreSQL can verify row visibility during INSERT operations.
  
  ## Key Principle
  INSERT + RETURNING requires BOTH WITH CHECK and USING.
  Debug helpers only validate WITH CHECK.
  Missing or mismatched SELECT policies cause false-looking 403s.
  
  ## Key Safety
  - Does NOT modify existing INSERT policies
  - Does NOT weaken security
  - Does NOT reintroduce NULL/OR traps
  - Preserves AI vs non-AI separation (handled by INSERT policies)
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

-- Drop old monolithic SELECT policy (if present)
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can read recipes" ON public.recipes;

-- ============================================================================
-- SELECT Policies (Required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT + RETURNING.
-- These policies MUST mirror the INSERT logic to allow inserts to succeed.
-- Split by household_id (personal vs household) to match INSERT pattern.

-- SELECT Policy A: Personal recipes (household_id IS NULL)
-- Allows:
-- - Public recipes (is_public = true)
-- - Private personal recipes (is_public = false AND created_for_profile_id belongs to user)
-- - AI recipes created for the user (covered by created_for_profile_id check)
-- - Manual recipes created for the user (covered by created_for_profile_id check)
DROP POLICY IF EXISTS "Users can read personal recipes" ON public.recipes;

CREATE POLICY "Users can read personal recipes"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND household_id IS NULL
    AND (
      -- Public recipes
      is_public = true
      OR
      -- Private personal recipes (AI + manual)
      (
        is_public = false
        AND created_for_profile_id IS NOT NULL
        AND public.is_user_profile(created_for_profile_id)
      )
    )
  );

-- SELECT Policy B: Household recipes (household_id IS NOT NULL)
-- Allows household members to view recipes in their households
DROP POLICY IF EXISTS "Users can read household recipes" ON public.recipes;

CREATE POLICY "Users can read household recipes"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND household_id IS NOT NULL
    AND public.is_user_household_member(household_id)
  );

-- Documentation
COMMENT ON POLICY "Users can read personal recipes" ON public.recipes IS
  'SELECT policy for personal recipes (household_id IS NULL). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows: (A) public recipes (is_public=true), (B) private personal recipes (is_public=false AND created_for_profile_id IS NOT NULL AND created_for_profile_id belongs to auth user). Covers both AI and manual recipes. Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household recipes" ON public.recipes IS
  'SELECT policy for household recipes (household_id IS NOT NULL). Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Allows household members to view recipes in their households. Required for INSERT + RETURNING operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid(). Uses CREATE OR REPLACE to preserve existing dependencies.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Uses CREATE OR REPLACE to preserve existing dependencies.';
