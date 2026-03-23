/*
  # Add Todo Breakdown System (Phase 1)
  
  This migration adds support for AI-powered task breakdowns into micro-steps.
  
  Phase 1 Scope:
  - Add breakdown metadata to personal_todos
  - Create todo_micro_steps table for micro-step tracking
  - No pattern learning, no time estimates, no cognitive load inference
  
  Changes:
  1. Add breakdown columns to personal_todos
  2. Create todo_micro_steps table
  3. Add indexes for performance
  4. Enable RLS on new table
*/

-- Step 1: Add breakdown columns to personal_todos
ALTER TABLE personal_todos 
  ADD COLUMN IF NOT EXISTS has_breakdown BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS breakdown_context TEXT,
  ADD COLUMN IF NOT EXISTS breakdown_generated_at TIMESTAMPTZ;

-- Step 2: Create todo_micro_steps table
CREATE TABLE IF NOT EXISTS todo_micro_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES personal_todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure order_index is unique per todo
  UNIQUE(todo_id, order_index)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todo_micro_steps_todo_id 
  ON todo_micro_steps(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_micro_steps_order 
  ON todo_micro_steps(todo_id, order_index);
CREATE INDEX IF NOT EXISTS idx_todo_micro_steps_completed 
  ON todo_micro_steps(todo_id, completed) WHERE completed = false;

-- Step 4: Create updated_at trigger for todo_micro_steps
CREATE OR REPLACE FUNCTION update_todo_micro_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS todo_micro_steps_updated_at ON todo_micro_steps;
  CREATE TRIGGER todo_micro_steps_updated_at
    BEFORE UPDATE ON todo_micro_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_todo_micro_steps_updated_at();
EXCEPTION
  WHEN others THEN null;
END $$;

-- Step 5: Enable RLS on todo_micro_steps
ALTER TABLE todo_micro_steps ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for todo_micro_steps
-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view micro-steps for their todos" ON todo_micro_steps;
DROP POLICY IF EXISTS "Users can create micro-steps for own todos" ON todo_micro_steps;
DROP POLICY IF EXISTS "Users can update micro-steps for own todos" ON todo_micro_steps;
DROP POLICY IF EXISTS "Users can delete micro-steps for own todos" ON todo_micro_steps;

-- Users can view micro-steps for todos they own or todos shared to their spaces
CREATE POLICY "Users can view micro-steps for their todos"
  ON todo_micro_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal_todos pt
      WHERE pt.id = todo_micro_steps.todo_id
      AND (
        pt.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM todo_space_shares tss
          JOIN household_members hm ON hm.household_id = tss.space_id
          WHERE tss.todo_id = pt.id
          AND hm.auth_user_id = auth.uid()
          AND hm.status = 'active'
        )
      )
    )
  );

-- Users can create micro-steps for their own todos
CREATE POLICY "Users can create micro-steps for own todos"
  ON todo_micro_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personal_todos pt
      WHERE pt.id = todo_micro_steps.todo_id
      AND pt.user_id = auth.uid()
    )
  );

-- Users can update micro-steps for their own todos
CREATE POLICY "Users can update micro-steps for own todos"
  ON todo_micro_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal_todos pt
      WHERE pt.id = todo_micro_steps.todo_id
      AND pt.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personal_todos pt
      WHERE pt.id = todo_micro_steps.todo_id
      AND pt.user_id = auth.uid()
    )
  );

-- Users can delete micro-steps for their own todos
CREATE POLICY "Users can delete micro-steps for own todos"
  ON todo_micro_steps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal_todos pt
      WHERE pt.id = todo_micro_steps.todo_id
      AND pt.user_id = auth.uid()
    )
  );
