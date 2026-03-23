/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - The members table SELECT policy queries the members table itself
    - This creates infinite recursion: to read members, it needs to read members
    - Same issue affects answers and progress policies

  2. Solution
    - Remove recursive subqueries from policies
    - Use direct user_id checks where possible
    - Use SECURITY DEFINER functions for complex checks
    - Create helper function to get user's household_ids without recursion

  3. Changes
    - Drop problematic policies on members, answers, progress
    - Create non-recursive helper function
    - Recreate policies using direct checks and helper functions
*/

-- Create helper function to get user's household IDs without recursion
-- Uses SECURITY DEFINER to bypass RLS when called
CREATE OR REPLACE FUNCTION get_user_household_ids(p_user_id uuid)
RETURNS TABLE(household_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT m.household_id
  FROM members m
  WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is in household
CREATE OR REPLACE FUNCTION user_in_household(p_user_id uuid, p_household_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id AND household_id = p_household_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate member policies WITHOUT recursion
DROP POLICY IF EXISTS "Users can view members in their household or admin can view all" ON members;
DROP POLICY IF EXISTS "Users can update their own member profile or admin can update any" ON members;
DROP POLICY IF EXISTS "Users can insert members" ON members;
DROP POLICY IF EXISTS "Admin can delete members" ON members;

-- New non-recursive policies for members
CREATE POLICY "Users can view their own member records"
  ON members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own member profile"
  ON members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any member"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Fix answers policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their own answers or admin can view all" ON answers;
DROP POLICY IF EXISTS "Users can insert their own answers" ON answers;
DROP POLICY IF EXISTS "Users can update their own answers or admin can update any" ON answers;

CREATE POLICY "Users can view their own answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own answers"
  ON answers FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update any answers"
  ON answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Fix progress policies to avoid recursion
DROP POLICY IF EXISTS "Users can view progress in their household or admin can view all" ON progress;
DROP POLICY IF EXISTS "Users can update their own progress or admin can update any" ON progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON progress;

CREATE POLICY "Users can view their own progress"
  ON progress FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all progress"
  ON progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own progress"
  ON progress FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update any progress"
  ON progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own progress"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Fix households policies
DROP POLICY IF EXISTS "Users can view their household or admin can view all" ON households;

CREATE POLICY "Users can view households they are members of"
  ON households FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT household_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all households"
  ON households FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );
