/*
  # Fix Meal Schedules RLS - Split Policies (No OR Chains)
  
  ## Problem
  INSERT operations on meal_schedules fail with 403/42501 (RLS violation) when using .insert(...).select('*').
  Current policies use OR chains that create ambiguity and NULL traps.
  INSERT ... RETURNING requires matching SELECT policies.
  
  ## Solution
  Apply split RLS policy architecture (consistent with meal_plans, recipes):
  - Split policies by scope: personal (household_id IS NULL, profile_id IS NOT NULL) vs household (household_id IS NOT NULL, profile_id IS NULL)
  - No OR chains - deterministic evaluation
  - Separate INSERT, SELECT, UPDATE, DELETE policies that mirror each other
  - SELECT policy is mandatory for INSERT ... RETURNING / upsert().select('*')
  - Use SECURITY DEFINER helper functions to avoid RLS recursion
*/

-- ============================================================================
-- 1. Ensure Helper Functions Exist (SECURITY DEFINER)
-- ============================================================================
-- These functions bypass RLS on profiles and household_members tables

-- Helper: Check if profile belongs to authenticated user
CREATE OR REPLACE FUNCTION public.is_user_profile(check_profile_id uuid)
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
      FROM public.profiles
      WHERE id = check_profile_id
        AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_profile(uuid) TO authenticated;

-- Helper: Check if user is active household member
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

-- Add comments
COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if the given profile_id belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns FALSE if profile_id is NULL.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Returns FALSE if household_id is NULL.';

-- ============================================================================
-- 2. Drop All Existing Policies (Start Fresh)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can insert own meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can update own meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can delete own meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can view meal schedules in their spaces" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can insert meal schedules in their spaces" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can update meal schedules in their spaces" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can delete meal schedules in their spaces" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can create meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can read meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can update meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can delete meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can create personal meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can create household meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can read personal meal schedules" ON public.meal_schedules;
DROP POLICY IF EXISTS "Users can read household meal schedules" ON public.meal_schedules;

-- ============================================================================
-- 3. INSERT Policies (WITH CHECK only - no USING for INSERT)
-- ============================================================================
-- Note: INSERT policies only allow WITH CHECK clauses. PostgreSQL evaluates
-- WITH CHECK to validate the row being inserted. No OR chains - each policy
-- is completely isolated for deterministic evaluation.

-- Policy A: Personal meal schedules
-- Applies ONLY when: household_id IS NULL AND profile_id IS NOT NULL
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
-- Applies ONLY when: household_id IS NOT NULL AND profile_id IS NULL
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
-- 4. SELECT Policies (USING - required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT ... RETURNING.
-- These policies MUST mirror the INSERT logic exactly to allow inserts to succeed.
-- Without matching SELECT policies, INSERT ... RETURNING will fail even if WITH CHECK passes.

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

-- ============================================================================
-- 5. UPDATE Policies (USING + WITH CHECK)
-- ============================================================================
-- USING clause checks existing row ownership
-- WITH CHECK validates the updated row
-- Both must pass for UPDATE to succeed
-- Split by personal vs household (no OR chains)

-- UPDATE Policy A: Personal meal schedules
DROP POLICY IF EXISTS "Users can update personal meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can update personal meal schedules"
  ON public.meal_schedules
  FOR UPDATE
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  )
  WITH CHECK (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- UPDATE Policy B: Household meal schedules
DROP POLICY IF EXISTS "Users can update household meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can update household meal schedules"
  ON public.meal_schedules
  FOR UPDATE
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  )
  WITH CHECK (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 6. DELETE Policies (USING only)
-- ============================================================================
-- DELETE policies only use USING clause (no WITH CHECK)
-- Split by personal vs household (no OR chains)

-- DELETE Policy A: Personal meal schedules
DROP POLICY IF EXISTS "Users can delete personal meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can delete personal meal schedules"
  ON public.meal_schedules
  FOR DELETE
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- DELETE Policy B: Household meal schedules
DROP POLICY IF EXISTS "Users can delete household meal schedules" ON public.meal_schedules;

CREATE POLICY "Users can delete household meal schedules"
  ON public.meal_schedules
  FOR DELETE
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 7. Documentation Comments
-- ============================================================================

COMMENT ON POLICY "Users can create personal meal schedules" ON public.meal_schedules IS
  'Isolated INSERT policy for personal meal schedules. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. This policy is completely isolated from household schedule logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can create household meal schedules" ON public.meal_schedules IS
  'Isolated INSERT policy for household meal schedules. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. This policy is completely isolated from personal schedule logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can read personal meal schedules" ON public.meal_schedules IS
  'SELECT policy for personal meal schedules. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household meal schedules" ON public.meal_schedules IS
  'SELECT policy for household meal schedules. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can update personal meal schedules" ON public.meal_schedules IS
  'UPDATE policy for personal meal schedules. USING clause checks existing row ownership, WITH CHECK validates the updated row. Both must pass for UPDATE to succeed. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user.';

COMMENT ON POLICY "Users can update household meal schedules" ON public.meal_schedules IS
  'UPDATE policy for household meal schedules. USING clause checks existing row ownership, WITH CHECK validates the updated row. Both must pass for UPDATE to succeed. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member.';

COMMENT ON POLICY "Users can delete personal meal schedules" ON public.meal_schedules IS
  'DELETE policy for personal meal schedules. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user.';

COMMENT ON POLICY "Users can delete household meal schedules" ON public.meal_schedules IS
  'DELETE policy for household meal schedules. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member.';

-- ============================================================================
-- 8. Verification Queries (Commented - for manual testing)
-- ============================================================================
/*
-- List all policies on meal_schedules
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'meal_schedules'
ORDER BY policyname;

-- Test INSERT personal meal schedule
-- Replace <space_id> and <profile_id> with actual values
INSERT INTO public.meal_schedules (
  space_id,
  profile_id,
  household_id,
  name,
  is_default,
  schedules
) VALUES (
  '<space_id>',
  '<profile_id>',
  NULL,
  'Standard',
  true,
  '[]'::jsonb
) RETURNING *;

-- Test INSERT household meal schedule
-- Replace <space_id> and <household_id> with actual values
INSERT INTO public.meal_schedules (
  space_id,
  profile_id,
  household_id,
  name,
  is_default,
  schedules
) VALUES (
  '<space_id>',
  NULL,
  '<household_id>',
  'Standard',
  true,
  '[]'::jsonb
) RETURNING *;

-- Test SELECT after insert
SELECT * FROM public.meal_schedules WHERE space_id = '<space_id>';

-- Test UPDATE
UPDATE public.meal_schedules
SET name = 'Updated Schedule'
WHERE id = '<schedule_id>'
RETURNING *;

-- Test DELETE
DELETE FROM public.meal_schedules
WHERE id = '<schedule_id>'
RETURNING *;
*/
