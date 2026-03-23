/*
  # Split Recipes INSERT Policies - Isolate AI vs Non-AI
  
  ## Problem
  AI-generated recipe inserts fail with 403 Forbidden (42501) errors despite valid payloads.
  Root cause: A single monolithic RLS policy mixes AI + non-AI logic, causing:
  - PostgreSQL evaluates branches you expect to be skipped
  - Boolean + NULL logic inside RLS is not short-circuited
  - Complex OR chains create ambiguity
  
  ## Solution
  Fully isolate AI recipe inserts from non-AI inserts by creating separate policies.
  This guarantees:
  - Deterministic evaluation (PostgreSQL only evaluates the relevant policy)
  - No NULL traps (each policy has explicit conditions)
  - No accidental branch execution (policies are completely isolated)
  - Readable, auditable, future-proof policies
  
  ## Key Safety
  - Uses CREATE OR REPLACE (preserves existing dependencies)
  - Explicit schema qualification (public.*)
  - No DROP ... CASCADE (prevents accidental dependency deletion)
*/

-- Helper: profile ownership (bypasses RLS on profiles safely)
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

-- Drop old monolithic policy if present
DROP POLICY IF EXISTS "Users can create recipes" ON public.recipes;

-- Policy A: AI can create personal recipes
-- This policy is completely isolated - only evaluates for AI recipes
-- Matches the actual insert payload exactly for personal AI recipes
DROP POLICY IF EXISTS "AI can create personal recipes" ON public.recipes;

CREATE POLICY "AI can create personal recipes"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    source_type = 'ai'
    AND created_by IS NULL
    AND household_id IS NULL
    AND is_public = false
    AND created_for_profile_id IS NOT NULL
    AND public.is_user_profile(created_for_profile_id)
  );

-- Policy B: Users can create manual recipes
-- This policy applies ONLY to non-AI recipes (source_type IS DISTINCT FROM 'ai')
DROP POLICY IF EXISTS "Users can create manual recipes" ON public.recipes;

CREATE POLICY "Users can create manual recipes"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    source_type IS DISTINCT FROM 'ai'
    AND (
      created_by IS NULL
      OR public.is_user_profile(created_by)
    )
    AND (
      -- Public/global recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Household recipes
      (
        household_id IS NOT NULL
        AND public.is_user_household_member(household_id)
      )
      OR
      -- Personal recipes
      (
        household_id IS NULL
        AND is_public = false
        AND (
          created_for_profile_id IS NULL
          OR public.is_user_profile(created_for_profile_id)
        )
      )
    )
  );

-- Documentation
COMMENT ON POLICY "AI can create personal recipes" ON public.recipes IS
  'Isolated AI-only INSERT policy for personal space. Applies ONLY when source_type=''ai'', created_by IS NULL, household_id IS NULL, is_public=false, and created_for_profile_id belongs to auth user. This policy is completely isolated from non-AI recipe logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can create manual recipes" ON public.recipes IS
  'Allows authenticated users to create manual/user-created recipes (source_type IS DISTINCT FROM ''ai''). Supports: (A) public recipes (is_public=true, household_id=NULL), (B) household recipes (household_id NOT NULL, user is active member), (C) personal recipes (household_id=NULL, is_public=false). Uses SECURITY DEFINER helper functions to avoid RLS recursion.';

COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if a profile ID belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns true if profile exists and user_id matches auth.uid(). Uses CREATE OR REPLACE to preserve existing dependencies.';

COMMENT ON FUNCTION public.is_user_household_member(uuid) IS
  'Checks if the current authenticated user is an active member of the specified household. Uses SECURITY DEFINER to bypass RLS on household_members table. Uses CREATE OR REPLACE to preserve existing dependencies.';
