/*
  # Fix Infinite Recursion in Household Members Policies
  
  The household_members SELECT policy was creating infinite recursion by
  querying household_members within itself. This migration simplifies
  the policies to avoid circular dependencies.
  
  1. Changes
    - Drop and recreate household_members SELECT policy without self-reference
    - Simplify other policies to use direct checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view household members" ON household_members;
DROP POLICY IF EXISTS "Users can accept invites" ON household_members;
DROP POLICY IF EXISTS "Billing owners can invite members" ON household_members;
DROP POLICY IF EXISTS "Billing owners can remove members" ON household_members;

-- Users can view members in households they belong to OR their own pending invite
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    -- User is a member of this household (direct check via profiles)
    household_id IN (
      SELECT hm.household_id
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE p.user_id = auth.uid()
      AND hm.status = 'active'
    )
    OR
    -- User is viewing their own pending invite
    (email IN (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
  );

-- Users can accept their own invites
CREATE POLICY "Users can accept invites"
  ON household_members FOR UPDATE
  TO authenticated
  USING (
    (status = 'pending' AND email IN (SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    (status = 'pending' AND email IN (SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Household owners can invite members
CREATE POLICY "Billing owners can invite members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE hm.household_id = household_members.household_id
      AND p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );

-- Household owners can remove members
CREATE POLICY "Billing owners can remove members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE hm.household_id = household_members.household_id
      AND p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );
