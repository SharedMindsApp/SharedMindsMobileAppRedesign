/*
  # Create Planner Micro-Step Suggestions Table
  
  Stores optional breakdown suggestions for tasks.
  User can choose not to save - this is just for flexibility.
  No tracking, no analytics, no completion metrics.
*/

-- Create planner_microstep_suggestions table
CREATE TABLE IF NOT EXISTS planner_microstep_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  micro_steps TEXT[] NOT NULL,
  context TEXT CHECK (context IN ('too_big', 'dont_know_where_to_start', 'boring_low_energy', 'time_pressure', 'emotional_resistance')),
  guardrails_task_id TEXT, -- Optional link to Guardrails task
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_planner_microstep_suggestions_user 
  ON planner_microstep_suggestions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_microstep_suggestions_task 
  ON planner_microstep_suggestions(guardrails_task_id) 
  WHERE guardrails_task_id IS NOT NULL;

-- Enable RLS
ALTER TABLE planner_microstep_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_microstep_suggestions
DROP POLICY IF EXISTS "Users can view their own breakdown suggestions" ON planner_microstep_suggestions;
DROP POLICY IF EXISTS "Users can insert their own breakdown suggestions" ON planner_microstep_suggestions;
DROP POLICY IF EXISTS "Users can update their own breakdown suggestions" ON planner_microstep_suggestions;
DROP POLICY IF EXISTS "Users can delete their own breakdown suggestions" ON planner_microstep_suggestions;

CREATE POLICY "Users can view their own breakdown suggestions"
  ON planner_microstep_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own breakdown suggestions"
  ON planner_microstep_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breakdown suggestions"
  ON planner_microstep_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own breakdown suggestions"
  ON planner_microstep_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE planner_microstep_suggestions IS 'Optional breakdown suggestions for tasks. User can choose not to save - no tracking, no metrics.';
COMMENT ON COLUMN planner_microstep_suggestions.micro_steps IS 'Array of micro-step descriptions (suggestions only, not tracked)';
COMMENT ON COLUMN planner_microstep_suggestions.guardrails_task_id IS 'Optional link to Guardrails task (read-only reference)';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
