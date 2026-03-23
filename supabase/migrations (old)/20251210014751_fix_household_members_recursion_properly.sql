/*
  # Fix Household Members Infinite Recursion (Final)
  
  The household_members SELECT policy still had a self-reference causing
  infinite recursion. This migration removes the self-reference completely
  by using direct table access without subqueries on household_members.
  
  1. Changes
    - Drop and recreate household_members SELECT policy without ANY self-reference
    - Use direct joins to profiles table only
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view household members" ON household_members;

-- Create a new SELECT policy that does NOT reference household_members at all
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    -- User's profile matches a member in this household (direct check, no recursion)
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    -- User is viewing their own pending invite
    (email IN (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
  );
