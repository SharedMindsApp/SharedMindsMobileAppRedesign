/*
  # Create Planner Intentions & Reflections Tables
  
  Ephemeral planning notes for temporal views.
  Intentions are forward-looking, reflections are contextual.
  No tracking, no logs, no metrics, no completion states.
*/

-- Create planner_intentions table
CREATE TABLE IF NOT EXISTS planner_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('today', 'week', 'month', 'quarter', 'year')),
  scope_date DATE NOT NULL,
  intention_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one intention per user/scope/date
  UNIQUE(user_id, scope, scope_date)
);

-- Create planner_reflections table
CREATE TABLE IF NOT EXISTS planner_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('today', 'week', 'month', 'quarter', 'year')),
  scope_date DATE NOT NULL,
  reflection_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one reflection per user/scope/date
  UNIQUE(user_id, scope, scope_date)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_planner_intentions_user_scope_date 
  ON planner_intentions(user_id, scope, scope_date DESC);

CREATE INDEX IF NOT EXISTS idx_planner_reflections_user_scope_date 
  ON planner_reflections(user_id, scope, scope_date DESC);

-- Enable RLS
ALTER TABLE planner_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_intentions
DROP POLICY IF EXISTS "Users can view their own intentions" ON planner_intentions;
DROP POLICY IF EXISTS "Users can insert their own intentions" ON planner_intentions;
DROP POLICY IF EXISTS "Users can update their own intentions" ON planner_intentions;
DROP POLICY IF EXISTS "Users can delete their own intentions" ON planner_intentions;

CREATE POLICY "Users can view their own intentions"
  ON planner_intentions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intentions"
  ON planner_intentions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intentions"
  ON planner_intentions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intentions"
  ON planner_intentions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for planner_reflections
DROP POLICY IF EXISTS "Users can view their own reflections" ON planner_reflections;
DROP POLICY IF EXISTS "Users can insert their own reflections" ON planner_reflections;
DROP POLICY IF EXISTS "Users can update their own reflections" ON planner_reflections;
DROP POLICY IF EXISTS "Users can delete their own reflections" ON planner_reflections;

CREATE POLICY "Users can view their own reflections"
  ON planner_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON planner_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON planner_reflections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
  ON planner_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE planner_intentions IS 'Ephemeral forward-looking planning notes for temporal views. No tracking, no completion states.';
COMMENT ON TABLE planner_reflections IS 'Contextual narrative reflections for temporal views. Not analytics, not logs.';
COMMENT ON COLUMN planner_intentions.intention_text IS 'Short, forward-looking statement (e.g., "Focus on calm progress")';
COMMENT ON COLUMN planner_reflections.reflection_text IS 'Free-text narrative reflection (e.g., "What shifted today?")';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
