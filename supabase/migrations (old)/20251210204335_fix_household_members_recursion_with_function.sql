/*
  # Fix household_members infinite recursion with security definer function

  1. Changes
    - Drop the recursive policies
    - Create a security definer function to check household membership
    - Create new policies using the function to avoid recursion
    - Add admin bypass policy

  2. Security
    - Admins have full access
    - Users can see all members in households they belong to
    - Uses SECURITY DEFINER function to break recursion cycle
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view household members" ON household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON household_members;
DROP POLICY IF EXISTS "Users can update household members" ON household_members;
DROP POLICY IF EXISTS "Users can delete household members" ON household_members;

-- Create a security definer function to check if user is in household
-- This function runs with elevated privileges and doesn't trigger RLS
CREATE OR REPLACE FUNCTION is_household_member(check_household_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_id uuid;
  is_member boolean;
BEGIN
  -- Get the profile id for the current auth user
  SELECT id INTO user_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- If no profile found, return false
  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if this profile is an active member of the household
  SELECT EXISTS(
    SELECT 1
    FROM household_members
    WHERE household_id = check_household_id
    AND user_id = user_profile_id
    AND status = 'active'
  ) INTO is_member;

  RETURN is_member;
END;
$$;

-- Create a security definer function to check if user is household owner
CREATE OR REPLACE FUNCTION is_household_owner(check_household_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_id uuid;
  is_owner boolean;
BEGIN
  -- Get the profile id for the current auth user
  SELECT id INTO user_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- If no profile found, return false
  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if this profile is an active owner of the household
  SELECT EXISTS(
    SELECT 1
    FROM household_members
    WHERE household_id = check_household_id
    AND user_id = user_profile_id
    AND role = 'owner'
    AND status = 'active'
  ) INTO is_owner;

  RETURN is_owner;
END;
$$;

-- Policy for admins to see everything
CREATE POLICY "Admins can view all household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy for regular users to see household members
CREATE POLICY "Members can view their household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (is_household_member(household_id));

-- Policy for owners to insert members
CREATE POLICY "Owners can insert household members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_household_owner(household_id)
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy for updates
CREATE POLICY "Members can update household members"
  ON household_members FOR UPDATE
  TO authenticated
  USING (
    is_household_owner(household_id)
    OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy for deletes
CREATE POLICY "Members can delete household members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    is_household_owner(household_id)
    OR user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );
