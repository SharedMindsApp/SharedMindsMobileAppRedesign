/*
  # Make personal_todos.household_id Nullable for Personal Mode
  
  Personal todos should NOT reference households because personal spaces are NOT households.
  This migration:
  1. Makes household_id nullable
  2. Updates RLS to allow personal todos with household_id IS NULL
  3. Ensures foreign key constraint only applies when household_id is NOT NULL
*/

-- Step 1: Drop the NOT NULL constraint on household_id
ALTER TABLE personal_todos 
  ALTER COLUMN household_id DROP NOT NULL;

-- Step 2: Update the foreign key constraint to allow NULL
-- PostgreSQL foreign keys already allow NULL by default, but we need to ensure
-- the constraint is properly set up. The existing FK should work, but let's verify.
-- If needed, we'll recreate it.

-- Check if we need to recreate the FK constraint
DO $$
BEGIN
  -- The existing FK constraint should already allow NULL
  -- But we'll add a check to ensure data integrity:
  -- - If household_id IS NOT NULL, it must reference a valid household
  -- - If household_id IS NULL, it's a personal todo (no household reference)
  
  -- No action needed - FK constraints in PostgreSQL allow NULL by default
  -- The constraint will only be enforced when household_id is NOT NULL
END $$;

-- Step 3: Update RLS policy to allow personal todos with household_id IS NULL
-- Drop any existing INSERT policies (from previous migrations)
DROP POLICY IF EXISTS "Users can create own todos" ON personal_todos;

CREATE POLICY "Users can create own todos"
  ON personal_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Personal todos: household_id must be NULL (personal spaces are NOT households)
      (household_id IS NULL)
      OR
      -- Shared todos: household_id must reference a household the user is a member of
      (household_id IS NOT NULL AND is_user_household_member(household_id))
    )
  );

-- Step 4: Update SELECT policy to allow viewing personal todos (household_id IS NULL)
-- The existing SELECT policies should work, but let's ensure personal todos are visible
DROP POLICY IF EXISTS "Users can view own todos" ON personal_todos;

CREATE POLICY "Users can view own todos"
  ON personal_todos FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      -- Personal todos (household_id IS NULL)
      household_id IS NULL
      OR
      -- Shared todos (household_id IS NOT NULL) - already covered by existing policy
      household_id IS NOT NULL
    )
  );

-- Note: The "Users can view shared todos in their spaces" policy already handles
-- shared todos via todo_space_shares, so we don't need to change it.
