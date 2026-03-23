/*
  # Split Meal Schedules INSERT Policies - Isolate Personal vs Household
  
  ## Problem
  AI-generated meal schedule inserts fail with 403 Forbidden (42501) errors despite valid payloads.
  Root cause: A single monolithic RLS policy mixes personal + household logic with OR chains, causing:
  - PostgreSQL evaluates branches you expect to be skipped
  - Boolean + NULL logic inside RLS is not short-circuited
  - Complex OR chains create ambiguity
  
  ## Solution
  Fully isolate personal meal schedule inserts from household inserts by creating separate policies.
  This guarantees:
  - Deterministic evaluation (PostgreSQL only evaluates the relevant policy)
  - No NULL traps (each policy has explicit conditions)
  - No accidental branch execution (policies are completely isolated)
  - Readable, auditable, future-proof policies
  
  ## Critical: INSERT policies only allow WITH CHECK
  For INSERT operations, PostgreSQL only allows WITH CHECK expressions.
  USING clauses are NOT allowed for INSERT policies (they're for SELECT/UPDATE/DELETE).
  The WITH CHECK clause validates the row data meets the policy requirements.
  
  ## Critical: SELECT policies are required for INSERT visibility
  When inserting a row, PostgreSQL verifies that the row would be visible via SELECT policies.
  You MUST add SELECT policies that mirror your INSERT visibility logic.
  Without matching SELECT policies, inserts will fail even if WITH CHECK passes.
  
  ## Key Safety
  - Uses CREATE OR REPLACE (preserves existing dependencies)
  - Explicit schema qualification (public.*)
  - No DROP ... CASCADE (prevents accidental dependency deletion)
  
  ## Schema Notes
  - meal_schedules has: profile_id (personal), household_id (household), space_id (always set)
  - Constraint: (profile_id IS NOT NULL AND household_id IS NULL) OR (profile_id IS NULL AND household_id IS NOT NULL)
  - Personal schedules: household_id IS NULL, profile_id IS NOT NULL
  - Household schedules: household_id IS NOT NULL, profile_id IS NULL
*/

-- Helper: profile ownership (bypasses RLS on profiles safely)
-- Reuse existing function, ensure it exists with correct signature
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

-- Helper: household membership (bypasses RLS safely)
-- Reuse existing function, ensure it exists with correct signature
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

-- Drop old monolithic policies (if they exist)
DROP POLICY IF EXISTS "Users can create meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can insert own meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can insert meal schedules in their spaces" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can read meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can view own meal schedules" ON public.meal_schedules;

-- Policy A: Personal meal schedules
-- This policy is completely isolated - only evaluates for personal schedules
-- Matches the actual insert payload exactly: household_id IS NULL, profile_id IS NOT NULL
-- Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT)
DROP POLICY IF EXISTS "Users can create personal meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can create personal meal schedules"
  ON public.meal_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- Policy B: Household meal schedules
-- This policy is completely isolated - only evaluates for household schedules
-- Matches the actual insert payload exactly: household_id IS NOT NULL, profile_id IS NULL
-- Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT)
DROP POLICY IF EXISTS "Users can create household meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can create household meal schedules"
  ON public.meal_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- SELECT Policies (Required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT.
-- These policies MUST mirror the INSERT logic to allow inserts to succeed.

-- SELECT Policy A: Personal meal schedules
-- Mirrors the INSERT policy for personal schedules
DROP POLICY IF EXISTS "Users can read personal meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can read personal meal schedules"
  ON public.meal_schedules
  FOR SELECT
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- SELECT Policy B: Household meal schedules
-- Mirrors the INSERT policy for household schedules
DROP POLICY IF EXISTS "Users can read household meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can read household meal schedules"
  ON public.meal_schedules
  FOR SELECT
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- Documentation
COMMENT ON POLICY "Users can create personal meal schedules" ON public.meal_schedules IS
  'Isolated INSERT policy for personal meal schedules. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. This policy is completely isolated from household schedule logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch. Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT operations).';

COMMENT ON POLICY "Users can create household meal schedules" ON public.meal_schedules IS
  'Isolated INSERT policy for household meal schedules. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. This policy is completely isolated from personal schedule logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch. Note: INSERT policies only allow WITH CHECK (USING is not allowed for INSERT operations).';

COMMENT ON POLICY "Users can read personal meal schedules" ON public.meal_schedules IS
  'SELECT policy for personal meal schedules. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household meal schedules" ON public.meal_schedules IS
  'SELECT policy for household meal schedules. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid(). Uses CREATE OR REPLACE to preserve existing dependencies.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Uses CREATE OR REPLACE to preserve existing dependencies.';
