/*
  # Create Planner Micro Steps Table
  
  Ephemeral planning notes for micro-steps (tiny wins).
  Stored as today's plan, not historical logs.
  No completion tracking, no streaks, just planning suggestions.
*/

-- Create planner_microsteps table
CREATE TABLE IF NOT EXISTS planner_microsteps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  step_text TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_planner_microsteps_user_date 
  ON planner_microsteps(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_planner_microsteps_user_date_order 
  ON planner_microsteps(user_id, date DESC, "order" ASC);

-- Enable RLS
ALTER TABLE planner_microsteps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_microsteps
DROP POLICY IF EXISTS "Users can view their own micro-steps" ON planner_microsteps;
DROP POLICY IF EXISTS "Users can insert their own micro-steps" ON planner_microsteps;
DROP POLICY IF EXISTS "Users can update their own micro-steps" ON planner_microsteps;
DROP POLICY IF EXISTS "Users can delete their own micro-steps" ON planner_microsteps;

CREATE POLICY "Users can view their own micro-steps"
  ON planner_microsteps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own micro-steps"
  ON planner_microsteps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own micro-steps"
  ON planner_microsteps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own micro-steps"
  ON planner_microsteps FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE planner_microsteps IS 'Ephemeral planning suggestions for micro-steps (tiny wins). Not logged outcomes, just planning suggestions.';
COMMENT ON COLUMN planner_microsteps.step_text IS 'Micro-step description (e.g., "Open the doc and write 3 bullet points")';
COMMENT ON COLUMN planner_microsteps."order" IS 'Order for displaying micro-steps (for reordering)';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
