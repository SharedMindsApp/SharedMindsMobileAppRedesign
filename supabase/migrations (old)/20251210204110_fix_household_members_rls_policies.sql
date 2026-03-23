/*
  # Fix household_members RLS policies

  1. Changes
    - Drop old restrictive policies that check user_id = auth.uid() (incorrect comparison)
    - Create new policy to allow users to view ALL members in households they belong to
    - Fix the user_id comparison to use profiles.id instead of auth.uid()

  2. Security
    - Users can see all members in households they are members of
    - Users can only modify their own membership records
    - Admins retain full access
*/

-- Drop old restrictive policies
DROP POLICY IF EXISTS "hm_select_own" ON household_members;
DROP POLICY IF EXISTS "hm_insert_own" ON household_members;
DROP POLICY IF EXISTS "hm_update_own_or_admin" ON household_members;
DROP POLICY IF EXISTS "hm_delete_own_or_admin" ON household_members;

-- Allow users to view all members in households they belong to
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members hm
      INNER JOIN profiles p ON p.id = hm.user_id
      WHERE p.user_id = auth.uid()
      AND hm.status = 'active'
    )
  );

-- Allow authenticated users to insert household members (for invites)
CREATE POLICY "Users can insert household members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members hm
      INNER JOIN profiles p ON p.id = hm.user_id
      WHERE p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );

-- Allow owners to update members or users to update their own record
CREATE POLICY "Users can update household members"
  ON household_members FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    household_id IN (
      SELECT household_id 
      FROM household_members hm
      INNER JOIN profiles p ON p.id = hm.user_id
      WHERE p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );

-- Allow owners to delete members or users to delete their own record
CREATE POLICY "Users can delete household members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    household_id IN (
      SELECT household_id 
      FROM household_members hm
      INNER JOIN profiles p ON p.id = hm.user_id
      WHERE p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );
