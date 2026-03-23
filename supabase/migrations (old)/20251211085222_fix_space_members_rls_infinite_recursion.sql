/*
  # Fix Infinite Recursion in space_members RLS

  1. Updates
    - Drop all existing RLS policies on spaces and space_members
    - Recreate helper functions to use space_members instead of household_members
    - Add new, non-recursive RLS policies

  2. Security
    - Policies use SECURITY DEFINER functions to avoid RLS recursion
    - Maintain proper access control for space members
*/

-- Drop all existing policies on these tables
DROP POLICY IF EXISTS "Users can view space members for their spaces" ON space_members;
DROP POLICY IF EXISTS "Users can insert space members" ON space_members;
DROP POLICY IF EXISTS "Users can update space members" ON space_members;
DROP POLICY IF EXISTS "Users can delete space members" ON space_members;
DROP POLICY IF EXISTS "Members can view their household members" ON space_members;
DROP POLICY IF EXISTS "Owners can insert household members" ON space_members;
DROP POLICY IF EXISTS "Members can update household members" ON space_members;
DROP POLICY IF EXISTS "Members can delete household members" ON space_members;
DROP POLICY IF EXISTS "Admins can view all household members" ON space_members;

DROP POLICY IF EXISTS "Users can view spaces they are members of" ON spaces;
DROP POLICY IF EXISTS "Users can insert spaces" ON spaces;
DROP POLICY IF EXISTS "Users can insert their household" ON spaces;
DROP POLICY IF EXISTS "Users can update spaces they are members of" ON spaces;
DROP POLICY IF EXISTS "Users can update their household or admin can update any" ON spaces;
DROP POLICY IF EXISTS "Admins can view all households" ON spaces;
DROP POLICY IF EXISTS "Admin can delete households" ON spaces;

-- Drop existing helper functions
DROP FUNCTION IF EXISTS is_household_member(uuid);
DROP FUNCTION IF EXISTS is_household_owner(uuid);

-- Create helper function to check space membership (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_space_member_internal(check_space_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM space_members
    WHERE space_id = check_space_id
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$;

-- Create helper function to check space ownership (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_space_owner_internal(check_space_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM space_members
    WHERE space_id = check_space_id
      AND user_id = check_user_id
      AND role = 'owner'
      AND status = 'active'
  );
END;
$$;

-- Create helper function to check if user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_admin_internal(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM profiles
    WHERE user_id = check_user_id
      AND role = 'admin'
  );
END;
$$;

-- Get current user's profile ID (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  RETURN profile_id;
END;
$$;

-- RLS Policies for space_members table
CREATE POLICY "Users can view space members"
  ON space_members FOR SELECT
  TO authenticated
  USING (
    is_space_member_internal(space_id, get_current_profile_id())
    OR is_admin_internal(auth.uid())
  );

CREATE POLICY "Users can insert space members"
  ON space_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_space_owner_internal(space_id, get_current_profile_id())
    OR is_admin_internal(auth.uid())
  );

CREATE POLICY "Users can update space members"
  ON space_members FOR UPDATE
  TO authenticated
  USING (
    is_space_owner_internal(space_id, get_current_profile_id())
    OR user_id = get_current_profile_id()
    OR is_admin_internal(auth.uid())
  );

CREATE POLICY "Users can delete space members"
  ON space_members FOR DELETE
  TO authenticated
  USING (
    is_space_owner_internal(space_id, get_current_profile_id())
    OR is_admin_internal(auth.uid())
  );

-- RLS Policies for spaces table
CREATE POLICY "Users can view their spaces"
  ON spaces FOR SELECT
  TO authenticated
  USING (
    is_space_member_internal(id, get_current_profile_id())
    OR is_admin_internal(auth.uid())
  );

CREATE POLICY "Users can create spaces"
  ON spaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Space owners can update spaces"
  ON spaces FOR UPDATE
  TO authenticated
  USING (
    is_space_owner_internal(id, get_current_profile_id())
    OR is_admin_internal(auth.uid())
  );

CREATE POLICY "Admins can delete spaces"
  ON spaces FOR DELETE
  TO authenticated
  USING (is_admin_internal(auth.uid()));
