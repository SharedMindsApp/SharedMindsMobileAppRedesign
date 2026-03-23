/*
  # Fix User Tag Preferences RLS - Split Policies for Profile Ownership Only

  ## Problem
  Batch upsert operations on user_tag_preferences fail with 42501 (RLS violation).
  Current policies use OR logic with space access checks, which can cause evaluation issues.
  INSERT ... RETURNING requires matching SELECT policies.

  ## Solution
  Apply split RLS policy architecture (consistent with recipes, recipe_versions, etc.):
  - Only check profile ownership (preferences are personal, not household-scoped)
  - No OR chains - deterministic evaluation
  - Separate INSERT, SELECT, UPDATE policies that mirror each other
  - SELECT policy is mandatory for INSERT ... RETURNING / upsert().select('*')
*/

-- 1️⃣ Ensure is_user_profile() helper function exists (reuse from other migrations)
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

-- Add comment
COMMENT ON FUNCTION public.is_user_profile(uuid) IS
  'Checks if the given profile_id belongs to the current authenticated user. Uses SECURITY DEFINER to bypass RLS on profiles table. Returns FALSE if profile_id is NULL.';

-- 2️⃣ Drop existing monolithic policies
DROP POLICY IF EXISTS "Users can view tag preferences in their spaces" ON public.user_tag_preferences;
DROP POLICY IF EXISTS "Users can insert tag preferences" ON public.user_tag_preferences;
DROP POLICY IF EXISTS "Users can update tag preferences" ON public.user_tag_preferences;
DROP POLICY IF EXISTS "Users can delete tag preferences" ON public.user_tag_preferences;
DROP POLICY IF EXISTS "Users can manage tag preferences" ON public.user_tag_preferences;
DROP POLICY IF EXISTS "Users can access tag preferences" ON public.user_tag_preferences;

-- 3️⃣ Create INSERT policy (WITH CHECK only - no USING for INSERT)
-- Users can only create preferences for their own profile
CREATE POLICY "Users can create their own tag preferences"
ON public.user_tag_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_user_profile(profile_id)
);

-- Add comment
COMMENT ON POLICY "Users can create their own tag preferences" ON public.user_tag_preferences IS
  'Allows authenticated users to create tag preferences only for their own profile. Uses is_user_profile() helper to avoid RLS recursion. No OR chains - deterministic evaluation.';

-- 4️⃣ Create SELECT policy (USING - required for INSERT ... RETURNING)
-- Users can only read preferences for their own profile
CREATE POLICY "Users can read their own tag preferences"
ON public.user_tag_preferences
FOR SELECT
TO authenticated
USING (
  public.is_user_profile(profile_id)
);

-- Add comment
COMMENT ON POLICY "Users can read their own tag preferences" ON public.user_tag_preferences IS
  'Allows authenticated users to read tag preferences only for their own profile. This policy is mandatory for INSERT ... RETURNING and upsert().select(''*'') operations. Uses is_user_profile() helper to avoid RLS recursion.';

-- 5️⃣ Create UPDATE policy (USING + WITH CHECK)
-- Users can only update preferences for their own profile
CREATE POLICY "Users can update their own tag preferences"
ON public.user_tag_preferences
FOR UPDATE
TO authenticated
USING (
  public.is_user_profile(profile_id)
)
WITH CHECK (
  public.is_user_profile(profile_id)
);

-- Add comment
COMMENT ON POLICY "Users can update their own tag preferences" ON public.user_tag_preferences IS
  'Allows authenticated users to update tag preferences only for their own profile. USING clause checks existing row ownership, WITH CHECK validates the updated row. Uses is_user_profile() helper to avoid RLS recursion.';

-- 6️⃣ Create DELETE policy (USING only)
-- Users can only delete preferences for their own profile
CREATE POLICY "Users can delete their own tag preferences"
ON public.user_tag_preferences
FOR DELETE
TO authenticated
USING (
  public.is_user_profile(profile_id)
);

-- Add comment
COMMENT ON POLICY "Users can delete their own tag preferences" ON public.user_tag_preferences IS
  'Allows authenticated users to delete tag preferences only for their own profile. Uses is_user_profile() helper to avoid RLS recursion.';

/*
  ## Verification Queries
  
  -- 1. Verify policies exist
  SELECT 
    policyname,
    cmd,
    roles,
    qual AS using_clause,
    with_check AS with_check_clause
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_tag_preferences'
  ORDER BY cmd, policyname;
  
  -- 2. Verify helper function exists and is accessible
  SELECT 
    has_function_privilege('authenticated', 'is_user_profile(uuid)', 'EXECUTE') AS can_execute_helper;
  
  -- 3. Test INSERT with RETURNING (as authenticated user)
  -- Replace <your_profile_id> with actual profile UUID
  INSERT INTO public.user_tag_preferences (profile_id, space_id, tag, is_preferred)
  VALUES ('<your_profile_id>'::uuid, '<space_id>'::uuid, 'test-tag', true)
  RETURNING *;
  
  -- 4. Test batch upsert (as authenticated user)
  INSERT INTO public.user_tag_preferences (profile_id, space_id, tag, is_preferred)
  VALUES 
    ('<your_profile_id>'::uuid, '<space_id>'::uuid, 'tag1', true),
    ('<your_profile_id>'::uuid, '<space_id>'::uuid, 'tag2', false)
  ON CONFLICT (profile_id, space_id, tag)
  DO UPDATE SET
    is_preferred = EXCLUDED.is_preferred,
    updated_at = NOW()
  RETURNING *;
  
  -- 5. Verify SELECT works (as authenticated user)
  SELECT * FROM public.user_tag_preferences
  WHERE profile_id = '<your_profile_id>'::uuid;
  
  -- 6. Test UPDATE (as authenticated user)
  UPDATE public.user_tag_preferences
  SET is_preferred = true
  WHERE profile_id = '<your_profile_id>'::uuid
    AND tag = 'test-tag'
  RETURNING *;
  
  -- 7. Test DELETE (as authenticated user)
  DELETE FROM public.user_tag_preferences
  WHERE profile_id = '<your_profile_id>'::uuid
    AND tag = 'test-tag'
  RETURNING *;
*/
