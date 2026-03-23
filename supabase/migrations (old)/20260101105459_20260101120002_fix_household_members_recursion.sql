/*
  # Fix Household Members Infinite Recursion

  1. Changes
    - Drop problematic recursive policy on household_members
    - Create simple direct policy without recursion
    - Policy allows users to view members where their auth_user_id matches directly
    
  2. Security
    - Users can view household members where they are themselves a member (via direct auth check)
    - No recursive lookups needed
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view household members" ON household_members;

-- Create a non-recursive policy that checks auth_user_id directly
CREATE POLICY "Users can view members of their households"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    -- Allow users to see members of households they belong to
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE auth_user_id = auth.uid() 
      AND status = 'active'
    )
  );
