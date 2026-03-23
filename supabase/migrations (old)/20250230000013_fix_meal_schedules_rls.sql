/*
  # Fix Meal Schedules RLS Policies
  
  The current RLS policies check `user_id = auth.uid()`, but:
  - `user_id` should reference `profiles(id)`, not `auth.users(id)`
  - We need to use profile lookup: `profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`
  - We should also use the helper functions `is_user_personal_space(space_id)` and `is_user_household_member(space_id)` for space access
  
  This migration:
  1. Renames `user_id` to `profile_id` and fixes the foreign key reference
  2. Updates all RLS policies to use profile lookup and space helper functions
  3. Updates indexes
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can insert own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can update own meal schedules" ON meal_schedules;
DROP POLICY IF EXISTS "Users can delete own meal schedules" ON meal_schedules;

-- Rename column and fix foreign key (only if user_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_schedules' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE meal_schedules RENAME COLUMN user_id TO profile_id;
  END IF;
END $$;

-- Drop old foreign key constraint if it exists
ALTER TABLE meal_schedules
  DROP CONSTRAINT IF EXISTS meal_schedules_user_id_fkey;

-- Add new foreign key constraint to profiles(id) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'meal_schedules_profile_id_fkey'
    AND table_name = 'meal_schedules'
  ) THEN
    ALTER TABLE meal_schedules
    ADD CONSTRAINT meal_schedules_profile_id_fkey 
    FOREIGN KEY (profile_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update constraint name
ALTER TABLE meal_schedules
  DROP CONSTRAINT IF EXISTS meal_schedules_owner_check;

ALTER TABLE meal_schedules
  ADD CONSTRAINT meal_schedules_owner_check CHECK (
    (profile_id IS NOT NULL AND household_id IS NULL) OR
    (profile_id IS NULL AND household_id IS NOT NULL)
  );

-- Update index
DROP INDEX IF EXISTS idx_meal_schedules_user_id;
CREATE INDEX IF NOT EXISTS idx_meal_schedules_profile_id ON meal_schedules(profile_id) WHERE profile_id IS NOT NULL;

-- Ensure helper functions exist (from meal prep migration)
-- Drop existing function first if it has different parameter name
DROP FUNCTION IF EXISTS is_user_personal_space(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_user_personal_space(check_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check new spaces system (spaces table with context_type = 'personal')
  SELECT EXISTS(
    SELECT 1
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    JOIN profiles p ON p.id = sm.user_id
    WHERE s.id = check_space_id
    AND s.context_type = 'personal'
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR EXISTS(
    -- Fallback to old system (households table with type = 'personal')
    SELECT 1
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = check_space_id
    AND h.type = 'personal'
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS is_user_household_member(uuid) CASCADE;

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

-- RLS Policies using profile lookup and space helper functions

-- SELECT: Users can view schedules in their personal spaces or households they're members of
CREATE POLICY "Users can view meal schedules in their spaces"
  ON meal_schedules FOR SELECT
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
    OR
    -- Space-based access (for personal spaces via space_id)
    is_user_personal_space(space_id)
  );

-- INSERT: Users can create schedules in their personal spaces or households they're members of
CREATE POLICY "Users can insert meal schedules in their spaces"
  ON meal_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Personal space: profile_id must match user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user must be a member
    (household_id IS NOT NULL AND is_user_household_member(household_id) AND profile_id IS NULL)
  );

-- UPDATE: Users can update schedules in their personal spaces or households they're members of
CREATE POLICY "Users can update meal schedules in their spaces"
  ON meal_schedules FOR UPDATE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  )
  WITH CHECK (
    -- Personal space: profile_id must match user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user must be a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

-- DELETE: Users can delete schedules in their personal spaces or households they're members of
CREATE POLICY "Users can delete meal schedules in their spaces"
  ON meal_schedules FOR DELETE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

-- Comment
COMMENT ON COLUMN meal_schedules.profile_id IS 'References profiles(id) for personal space schedules. NULL for household schedules.';
