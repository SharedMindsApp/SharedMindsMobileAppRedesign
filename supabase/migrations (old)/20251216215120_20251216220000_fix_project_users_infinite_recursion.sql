/*
  # Fix Project Users RLS Infinite Recursion

  1. Problem
    - Current project_users RLS policies reference project_users itself
    - This creates infinite recursion causing 500 errors
    - Affects all queries to taskflow_tasks and other project-scoped tables

  2. Solution
    - Drop existing recursive policies
    - Create non-recursive policies using SECURITY DEFINER function
    - Function checks membership without triggering RLS

  3. Security
    - Maintains same access control logic
    - Users can only access projects they belong to
    - Only owners can manage membership
*/

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_users;
DROP POLICY IF EXISTS "Owners can add users to projects" ON project_users;
DROP POLICY IF EXISTS "Owners can update user roles" ON project_users;
DROP POLICY IF EXISTS "Owners can remove users from projects" ON project_users;

-- Create helper function to check project membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_project_member(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_users
    WHERE user_id = p_user_id
      AND master_project_id = p_project_id
      AND archived_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is project owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_project_owner_check(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_users
    WHERE user_id = p_user_id
      AND master_project_id = p_project_id
      AND role = 'owner'
      AND archived_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New non-recursive policies

-- Users can view members of projects they belong to
CREATE POLICY "Users can view project members"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL AND
    is_project_member(auth.uid(), master_project_id)
  );

-- Only owners can add users
CREATE POLICY "Owners can add users"
  ON project_users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_owner_check(auth.uid(), master_project_id)
  );

-- Only owners can update membership
CREATE POLICY "Owners can update membership"
  ON project_users FOR UPDATE
  TO authenticated
  USING (
    archived_at IS NULL AND
    is_project_owner_check(auth.uid(), master_project_id)
  )
  WITH CHECK (
    archived_at IS NULL AND
    is_project_owner_check(auth.uid(), master_project_id)
  );

-- Only owners can remove users
CREATE POLICY "Owners can remove users"
  ON project_users FOR DELETE
  TO authenticated
  USING (
    is_project_owner_check(auth.uid(), master_project_id)
  );
