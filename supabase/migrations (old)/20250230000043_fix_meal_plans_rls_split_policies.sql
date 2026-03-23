/*
  # Fix Meal Plans RLS - Split Policies for Personal and Household Plans

  ## Problem
  INSERT operations on meal_plans fail with 42501 (RLS violation) when using .insert(...).select('*').
  Current policies use complex subqueries with JOINs that may hit RLS recursion or fail evaluation.
  INSERT ... RETURNING requires matching SELECT policies.

  ## Solution
  Apply split RLS policy architecture (consistent with recipes, meal_schedules, user_tag_preferences):
  - Split policies by scope: personal (household_id IS NULL) vs household (household_id IS NOT NULL)
  - No OR chains - deterministic evaluation
  - Separate INSERT, SELECT, UPDATE, DELETE policies that mirror each other
  - SELECT policy is mandatory for INSERT ... RETURNING / upsert().select('*')
  - Use helper functions to avoid RLS recursion
*/

-- 1️⃣ Ensure helper functions exist (reuse from other migrations)
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
      FROM profiles
      WHERE id = check_profile_id
        AND user_id = auth.uid()
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_profile(uuid) TO authenticated;

-- Helper: Check if user has access to a space (personal, household, or team)
CREATE OR REPLACE FUNCTION public.is_user_space_member(space_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if user has access to the space via space_members table (primary method)
  SELECT EXISTS (
    SELECT 1
    FROM space_members sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE sm.space_id = space_id_param
      AND p.user_id = auth.uid()
      AND sm.status = 'active'
  )
  OR
  -- Fallback: Check personal space via context_id (direct profile match)
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN profiles p ON p.id = s.context_id
    WHERE s.id = space_id_param
      AND s.context_type = 'personal'
      AND s.context_id IS NOT NULL
      AND p.user_id = auth.uid()
  )
  OR
  -- Fallback: Check household space via household_members
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN household_members hm ON hm.household_id = s.context_id
    WHERE s.id = space_id_param
      AND s.context_type = 'household'
      AND s.context_id IS NOT NULL
      AND hm.auth_user_id = auth.uid()
      AND hm.status = 'active'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_space_member(uuid) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if the given profile_id belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns FALSE if profile_id is NULL.';

COMMENT ON FUNCTION public.is_user_space_member(uuid) IS
  'Checks if the current authenticated user has access to a space (personal, household, or team). Uses SECURITY DEFINER to bypass RLS on profiles, spaces, and household_members tables.';

-- 2️⃣ Drop existing monolithic policies
DROP POLICY IF EXISTS "View household meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Insert household meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Update household meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Delete household meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can view meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can create meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete meal plans" ON public.meal_plans;

-- ============================================================================
-- INSERT Policies (WITH CHECK only - no USING for INSERT)
-- ============================================================================
-- Note: INSERT policies only allow WITH CHECK clauses. PostgreSQL evaluates
-- WITH CHECK to validate the row being inserted. No OR chains - each policy
-- is completely isolated for deterministic evaluation.

-- Policy: Users can create meal plans in spaces they have access to
-- Note: meal_plans table uses space_id, not household_id/profile_id
CREATE POLICY "Users can create meal plans in their spaces"
ON public.meal_plans
FOR INSERT
TO authenticated
WITH CHECK (
  space_id IS NOT NULL
  AND public.is_user_space_member(space_id)
);

-- ============================================================================
-- SELECT Policies (USING - required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT ... RETURNING.
-- These policies MUST mirror the INSERT logic exactly to allow inserts to succeed.
-- Without matching SELECT policies, INSERT ... RETURNING will fail even if WITH CHECK passes.

-- SELECT Policy: Users can read meal plans in spaces they have access to
CREATE POLICY "Users can read meal plans in their spaces"
ON public.meal_plans
FOR SELECT
TO authenticated
USING (
  space_id IS NOT NULL
  AND public.is_user_space_member(space_id)
);

-- ============================================================================
-- UPDATE Policies (USING + WITH CHECK)
-- ============================================================================
-- USING clause checks existing row ownership
-- WITH CHECK validates the updated row
-- Both must pass for UPDATE to succeed

-- UPDATE Policy: Users can update meal plans in spaces they have access to
CREATE POLICY "Users can update meal plans in their spaces"
ON public.meal_plans
FOR UPDATE
TO authenticated
USING (
  space_id IS NOT NULL
  AND public.is_user_space_member(space_id)
)
WITH CHECK (
  space_id IS NOT NULL
  AND public.is_user_space_member(space_id)
);

-- ============================================================================
-- DELETE Policies (USING only)
-- ============================================================================
-- DELETE policies only use USING clause to check existing row ownership

-- DELETE Policy: Users can delete meal plans in spaces they have access to
CREATE POLICY "Users can delete meal plans in their spaces"
ON public.meal_plans
FOR DELETE
TO authenticated
USING (
  space_id IS NOT NULL
  AND public.is_user_space_member(space_id)
);

-- Add policy comments explaining the architecture
COMMENT ON POLICY "Users can create meal plans in their spaces" ON public.meal_plans IS
  'Allows authenticated users to create meal plans in spaces they have access to (personal, household, or team). Uses is_user_space_member() helper to avoid RLS recursion. No OR chains - deterministic evaluation.';

COMMENT ON POLICY "Users can read meal plans in their spaces" ON public.meal_plans IS
  'Allows authenticated users to read meal plans in spaces they have access to. This policy is mandatory for INSERT ... RETURNING and upsert().select(''*'') operations. Mirrors INSERT policy logic exactly.';

COMMENT ON POLICY "Users can update meal plans in their spaces" ON public.meal_plans IS
  'Allows authenticated users to update meal plans in spaces they have access to. USING checks existing row ownership, WITH CHECK validates updated row. Both must pass.';

COMMENT ON POLICY "Users can delete meal plans in their spaces" ON public.meal_plans IS
  'Allows authenticated users to delete meal plans in spaces they have access to. Uses is_user_space_member() helper to avoid RLS recursion.';

/*
  ## Verification Queries
  
  -- 1. Verify policies exist and are correctly structured
  SELECT 
    policyname,
    cmd,
    roles,
    qual AS using_clause,
    with_check AS with_check_clause
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'meal_plans'
  ORDER BY cmd, policyname;
  
  -- Expected output: 4 policies total
  -- INSERT: 1 policy (space-based)
  -- SELECT: 1 policy (space-based)
  -- UPDATE: 1 policy (space-based)
  -- DELETE: 1 policy (space-based)
  
  -- 2. Verify helper functions exist and are accessible
  SELECT 
    has_function_privilege('authenticated', 'is_user_profile(uuid)', 'EXECUTE') AS can_execute_is_user_profile,
    has_function_privilege('authenticated', 'is_user_space_member(uuid)', 'EXECUTE') AS can_execute_is_user_space_member;
  
  -- 3. Test INSERT meal plan with RETURNING (as authenticated user)
  -- Replace <space_id> with actual space UUID where you have access
  INSERT INTO public.meal_plans (
    space_id,
    meal_type,
    day_of_week,
    week_start_date,
    created_by
  )
  VALUES (
    '<space_id>'::uuid,
    'breakfast',
    1,  -- Monday
    CURRENT_DATE,
    '<your_profile_id>'::uuid
  )
  RETURNING *;
  
  -- 4. Test batch INSERT with RETURNING (as authenticated user)
  INSERT INTO public.meal_plans (
    space_id,
    meal_type,
    day_of_week,
    week_start_date,
    created_by
  )
  VALUES 
    ('<space_id>'::uuid, 'breakfast', 1, CURRENT_DATE, '<your_profile_id>'::uuid),
    ('<space_id>'::uuid, 'lunch', 1, CURRENT_DATE, '<your_profile_id>'::uuid)
  RETURNING *;
  
  -- 5. Verify SELECT works (as authenticated user)
  SELECT * FROM public.meal_plans
  WHERE space_id = '<space_id>'::uuid;
  
  -- 7. Test UPDATE (as authenticated user)
  UPDATE public.meal_plans
  SET notes = 'Updated notes'
  WHERE id = '<meal_plan_id>'::uuid
  RETURNING *;
  
  -- 8. Test DELETE (as authenticated user)
  DELETE FROM public.meal_plans
  WHERE id = '<meal_plan_id>'::uuid
  RETURNING *;
  
  ## Key Principles
  
  1. **Space-Based Access Control**
     - meal_plans table uses space_id to reference spaces (personal, household, or team)
     - is_user_space_member() checks access via space_members, personal spaces, or household_members
     - Single policy per operation type (no split needed since all use space_id)
  
  2. **SELECT Policies Are Mandatory for RETURNING**
     - INSERT ... RETURNING requires both WITH CHECK (INSERT) and USING (SELECT)
     - Missing SELECT policies cause false 403 errors even when INSERT is valid
     - SELECT policies must mirror INSERT logic exactly
  
  3. **Helper Functions Avoid RLS Recursion**
     - is_user_profile() and is_user_household_member() use SECURITY DEFINER
     - They bypass RLS on profiles and household_members tables
     - This prevents infinite recursion in policy evaluation
  
  4. **No Security Weakening**
     - Policies only check ownership (profile or household membership)
     - No broad "auth.uid() IS NOT NULL" shortcuts
     - Each policy is scoped to specific data access patterns
*/
