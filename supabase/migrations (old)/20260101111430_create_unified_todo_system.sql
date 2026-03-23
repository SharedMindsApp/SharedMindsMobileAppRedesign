/*
  # Create Unified To-Do System

  ## Summary
  Creates a unified to-do list system that automatically syncs with Personal Spaces
  and allows optional sharing to Shared Spaces.

  ## New Tables
  1. `personal_todos` - Main to-do list table
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users) - Creator
    - `household_id` (uuid, references households) - Personal Space
    - `title` (text) - Task title
    - `description` (text, nullable) - Optional details
    - `completed` (boolean) - Completion status
    - `completed_at` (timestamptz, nullable) - When completed
    - `due_date` (date, nullable) - Optional due date
    - `priority` (text) - low, medium, high
    - `category` (text, nullable) - Optional category
    - `order_index` (integer) - Sort order
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. `todo_space_shares` - Junction table for sharing to spaces
    - `id` (uuid, primary key)
    - `todo_id` (uuid, references personal_todos)
    - `space_id` (uuid, references households) - Shared Space
    - `shared_by` (uuid, references auth.users)
    - `shared_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only manage their own todos
  - Sharing requires membership in target space
  - Shared todos visible to space members

  ## Features
  - Automatic personal space creation
  - Optional sharing to multiple spaces
  - Priority and category tagging
  - Due date tracking
*/

-- Step 1: Create priority enum
DO $$ BEGIN
  CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create personal_todos table
CREATE TABLE IF NOT EXISTS personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  due_date date,
  priority todo_priority NOT NULL DEFAULT 'medium',
  category text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create todo_space_shares junction table
CREATE TABLE IF NOT EXISTS todo_space_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES personal_todos(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(todo_id, space_id)
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_id ON personal_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_todos_household_id ON personal_todos(household_id);
CREATE INDEX IF NOT EXISTS idx_personal_todos_completed ON personal_todos(completed);
CREATE INDEX IF NOT EXISTS idx_personal_todos_due_date ON personal_todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todo_space_shares_todo_id ON todo_space_shares(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_space_shares_space_id ON todo_space_shares(space_id);

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_personal_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS personal_todos_updated_at ON personal_todos;
  CREATE TRIGGER personal_todos_updated_at
    BEFORE UPDATE ON personal_todos
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_todos_updated_at();
EXCEPTION
  WHEN others THEN null;
END $$;

-- Step 6: Enable RLS
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_space_shares ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for personal_todos

-- Users can view their own todos
CREATE POLICY "Users can view own todos"
  ON personal_todos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view todos shared to spaces they're in
CREATE POLICY "Users can view shared todos in their spaces"
  ON personal_todos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_space_shares tss
      JOIN household_members hm ON hm.household_id = tss.space_id
      WHERE tss.todo_id = personal_todos.id
      AND hm.auth_user_id = auth.uid()
      AND hm.status = 'active'
    )
  );

-- Users can create todos in their personal space
CREATE POLICY "Users can create own todos"
  ON personal_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = personal_todos.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can update their own todos
CREATE POLICY "Users can update own todos"
  ON personal_todos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own todos
CREATE POLICY "Users can delete own todos"
  ON personal_todos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 8: RLS Policies for todo_space_shares

-- Users can view shares for todos they own or spaces they're in
CREATE POLICY "Users can view todo shares"
  ON todo_space_shares FOR SELECT
  TO authenticated
  USING (
    auth.uid() = shared_by
    OR EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = todo_space_shares.space_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can share their own todos to spaces they're in
CREATE POLICY "Users can share own todos"
  ON todo_space_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = shared_by
    AND EXISTS (
      SELECT 1 FROM personal_todos
      WHERE id = todo_space_shares.todo_id
      AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = todo_space_shares.space_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can unshare their own todos
CREATE POLICY "Users can unshare own todos"
  ON todo_space_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = shared_by);