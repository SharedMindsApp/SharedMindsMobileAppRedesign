/*
  # Fix Meal Favourites RLS Policies
  
  ## Problem
  The INSERT policy for meal_favourites uses a subquery that can be blocked by RLS:
  `user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())`
  
  This causes 403 errors when trying to insert favorites, even with valid profile IDs.
  
  Also, the table structure was updated to use `space_id` instead of `household_id`.
  The migration 20250227000001 creates indexes on `space_id` but doesn't add the column,
  so we need to ensure it exists. The table may have been migrated to use `space_id` 
  exclusively, replacing `household_id`.
  
  ## Solution
  1. Add `space_id` column if it doesn't exist (for both meal and recipe favorites)
  2. Use helper function `is_user_profile()` instead of subquery (bypasses RLS recursion)
  3. Update policies to use `space_id` (the table uses space_id, not household_id)
  4. Ensure SELECT policy works for both meal and recipe favorites via space_id
*/

-- Add space_id column if it doesn't exist (needed for recipe favorites)
-- This column is referenced in indexes but may not have been added
ALTER TABLE meal_favourites
ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES spaces(id) ON DELETE CASCADE;

-- Ensure helper function exists (reuse from other migrations)
-- Use CREATE OR REPLACE to avoid errors if function already exists
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

-- Grant execute permission (safe to run multiple times)
GRANT EXECUTE ON FUNCTION public.is_user_profile(uuid) TO authenticated;

-- Ensure is_user_household_member function exists
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

-- Grant execute permission (safe to run multiple times)
GRANT EXECUTE ON FUNCTION public.is_user_household_member(uuid) TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "View household favourites" ON meal_favourites;
DROP POLICY IF EXISTS "Insert own favourites" ON meal_favourites;
DROP POLICY IF EXISTS "Update own favourites" ON meal_favourites;
DROP POLICY IF EXISTS "Delete own favourites" ON meal_favourites;

-- Ensure is_user_space_member function exists (reuse from other migrations)
-- This function checks if user has access to a space (personal, household, or team)
-- It's defined in migrations like 20250230000043_fix_meal_plans_rls_split_policies.sql
-- We use CREATE OR REPLACE to ensure it exists, but it should already be defined
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
    FROM public.space_members sm
    JOIN public.profiles p ON p.id = sm.user_id
    WHERE sm.space_id = space_id_param
      AND p.user_id = auth.uid()
      AND sm.status = 'active'
  )
  OR
  -- Fallback: Check personal space via context_id (direct profile match)
  EXISTS (
    SELECT 1
    FROM public.spaces s
    JOIN public.profiles p ON p.id = s.context_id
    WHERE s.id = space_id_param
      AND s.context_type = 'personal'
      AND s.context_id IS NOT NULL
      AND p.user_id = auth.uid()
  )
  OR
  -- Fallback: Check household space via household_members
  EXISTS (
    SELECT 1
    FROM public.spaces s
    JOIN public.household_members hm ON hm.household_id = s.context_id
    WHERE s.id = space_id_param
      AND s.context_type = 'household'
      AND s.context_id IS NOT NULL
      AND hm.auth_user_id = auth.uid()
      AND hm.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_space_member(uuid) TO authenticated;

-- SELECT: Users can view favorites in their spaces
-- The table uses space_id (not household_id) for both meals and recipes
CREATE POLICY "Users can view favorites in their spaces"
  ON meal_favourites FOR SELECT
  TO authenticated
  USING (
    -- User owns the favorite (their profile ID matches)
    public.is_user_profile(user_id)
    OR
    -- User has access to the space (for both meal and recipe favorites)
    (space_id IS NOT NULL AND public.is_user_space_member(space_id))
  );

-- INSERT: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
  ON meal_favourites FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must own the favorite (their profile ID)
    public.is_user_profile(user_id)
  );

-- UPDATE: Users can update their own favorites
CREATE POLICY "Users can update own favorites"
  ON meal_favourites FOR UPDATE
  TO authenticated
  USING (public.is_user_profile(user_id))
  WITH CHECK (public.is_user_profile(user_id));

-- DELETE: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON meal_favourites FOR DELETE
  TO authenticated
  USING (public.is_user_profile(user_id));

COMMENT ON POLICY "Users can view favorites in their spaces" ON meal_favourites IS
  'Allows users to view favorites in their household spaces. Supports both household_id (meal favorites) and space_id (recipe favorites). Uses helper functions to bypass RLS recursion.';

COMMENT ON POLICY "Users can insert own favorites" ON meal_favourites IS
  'Allows users to insert favorites with their own profile ID. Uses is_user_profile() helper to bypass RLS recursion on profiles table.';

COMMENT ON POLICY "Users can update own favorites" ON meal_favourites IS
  'Allows users to update their own favorites. Uses is_user_profile() helper to bypass RLS recursion.';

COMMENT ON POLICY "Users can delete own favorites" ON meal_favourites IS
  'Allows users to delete their own favorites. Uses is_user_profile() helper to bypass RLS recursion.';
