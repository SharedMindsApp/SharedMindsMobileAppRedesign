/*
  # Fix Personal Todos RLS for Personal Mode
  
  The current RLS policy requires household membership check, but personal todos
  should only require user_id = auth.uid() when the household_id is the user's
  personal space.
  
  This migration:
  1. Creates a function to check if a household_id is the user's personal space
  2. Updates the INSERT policy to allow personal todos without household_members check
*/

-- Create function to check if household_id is user's personal space
-- This handles both new spaces system and old households system
CREATE OR REPLACE FUNCTION is_user_personal_space(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check new spaces system (spaces table with context_type = 'personal')
  -- spaces.id might equal households.id, or they might be linked via context_id
  SELECT EXISTS(
    SELECT 1
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    JOIN profiles p ON p.id = sm.user_id
    WHERE (s.id = check_household_id OR s.context_id = check_household_id)
    AND s.context_type = 'personal'
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR EXISTS(
    -- Fallback to old system (households table with type = 'personal')
    SELECT 1
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = check_household_id
    AND h.type = 'personal'
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

-- Update the INSERT policy to allow personal todos when household_id is user's personal space
DROP POLICY IF EXISTS "Users can create own todos" ON personal_todos;

CREATE POLICY "Users can create own todos"
  ON personal_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Allow if household_id is user's personal space (no household_members check needed)
      is_user_personal_space(household_id)
      OR
      -- Allow if user is a member of the household (for shared spaces)
      is_user_household_member(household_id)
    )
  );
