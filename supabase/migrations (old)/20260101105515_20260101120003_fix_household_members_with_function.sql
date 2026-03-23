/*
  # Fix Household Members Recursion with Helper Function

  1. Changes
    - Drop previous policy
    - Create helper function that bypasses RLS
    - Use function in policy to avoid recursion
    
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Policy uses function result to determine access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their households" ON household_members;

-- Create a helper function that checks membership without triggering RLS
CREATE OR REPLACE FUNCTION user_household_ids(user_id uuid)
RETURNS TABLE(household_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT household_id
  FROM household_members
  WHERE auth_user_id = user_id
  AND status = 'active';
$$;

-- Create policy using the helper function
CREATE POLICY "Users can view members of their households"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (SELECT user_household_ids(auth.uid()))
  );
