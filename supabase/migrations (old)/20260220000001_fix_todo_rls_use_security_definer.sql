/*
  # Fix Todo RLS Policy to Use Security Definor Function
  
  The personal_todos INSERT policy uses a direct query to household_members
  which can be blocked by RLS. Update it to use the SECURITY DEFINER function
  to avoid RLS recursion issues.
*/

-- Check if is_household_member function exists (from earlier migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_household_member' 
    AND pronargs = 1
  ) THEN
    -- Drop existing policy
    DROP POLICY IF EXISTS "Users can create own todos" ON personal_todos;
    
    -- Create optimized policy using SECURITY DEFINER function
    -- Note: is_household_member uses profile_id, but we need auth_user_id
    -- So we'll create a new function or use a different approach
    
    -- Actually, let's check if there's a function that uses auth_user_id
    -- If not, we'll keep the direct query but it should work if household_members RLS allows it
  END IF;
END $$;

-- Create a helper function specifically for todo RLS using auth_user_id
-- This avoids RLS recursion issues by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_user_household_member(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM household_members
    WHERE household_id = check_household_id
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Update the policy to use the helper function
DROP POLICY IF EXISTS "Users can create own todos" ON personal_todos;

CREATE POLICY "Users can create own todos"
  ON personal_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND is_user_household_member(household_id)
  );
