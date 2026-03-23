/*
  # Create Adaptive Regulation Rules Engine

  1. New Tables
    - `regulation_state`
      - Stores user's current strictness level (1-5)
      - Tracks trust score (0-100) and behavioral metrics
      - Per-user or per-project regulation state
      - Fields: user_id, project_id, current_level, trust_score, behavior counts
    
    - `regulation_events`
      - Logs every behavior that affects strictness
      - Event types: deadline_missed, task_ignored, session_drift, rule_completed, etc.
      - Severity levels 1-5
      - Metadata stored as JSONB

  2. Strictness Levels
    - Level 1: Chill Mode (trust_score 80-100)
    - Level 2: Helpful but Firm (trust_score 60-79)
    - Level 3: Serious Mode (trust_score 40-59)
    - Level 4: Strict Mode (trust_score 20-39)
    - Level 5: Guardian Mode (trust_score 0-19)

  3. Security
    - Enable RLS on all tables
    - Users can only access their own regulation data
    - Automatic tracking via triggers

  4. Integration
    - Connected to focus_sessions, roadmap_items, offshoot_ideas, side_projects
    - Real-time behavioral tracking
    - Automatic escalation/de-escalation
*/

-- Create regulation_state table
CREATE TABLE IF NOT EXISTS regulation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  current_level int NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 5),
  trust_score int NOT NULL DEFAULT 75 CHECK (trust_score >= 0 AND trust_score <= 100),
  rule_break_count int NOT NULL DEFAULT 0,
  last_rule_break_at timestamptz,
  consecutive_wins int NOT NULL DEFAULT 0,
  consecutive_losses int NOT NULL DEFAULT 0,
  drift_events_last_7d int NOT NULL DEFAULT 0,
  focus_interruptions_last_7d int NOT NULL DEFAULT 0,
  missed_deadlines_last_7d int NOT NULL DEFAULT 0,
  offshoot_creation_rate_7d int NOT NULL DEFAULT 0,
  side_project_switches_7d int NOT NULL DEFAULT 0,
  tasks_completed_7d int NOT NULL DEFAULT 0,
  focus_sessions_completed_7d int NOT NULL DEFAULT 0,
  last_level_change_at timestamptz,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, master_project_id)
);

-- Create regulation_events table
CREATE TABLE IF NOT EXISTS regulation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'deadline_missed',
    'task_ignored',
    'session_drift',
    'offshoot_overuse',
    'side_project_overuse',
    'rule_completed',
    'focus_completed',
    'consistency_win',
    'task_completed',
    'milestone_hit',
    'session_abandoned',
    'level_escalated',
    'level_deescalated',
    'trust_increased',
    'trust_decreased',
    'override_used'
  )),
  severity int NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  impact_on_trust int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regulation_state_user_id ON regulation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_state_project_id ON regulation_state(master_project_id);
CREATE INDEX IF NOT EXISTS idx_regulation_state_level ON regulation_state(current_level);
CREATE INDEX IF NOT EXISTS idx_regulation_events_user_id ON regulation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_events_project_id ON regulation_events(master_project_id);
CREATE INDEX IF NOT EXISTS idx_regulation_events_type ON regulation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_regulation_events_created_at ON regulation_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE regulation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regulation_state
CREATE POLICY "Users can view own regulation state"
  ON regulation_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own regulation state"
  ON regulation_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own regulation state"
  ON regulation_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own regulation state"
  ON regulation_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for regulation_events
CREATE POLICY "Users can view own regulation events"
  ON regulation_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own regulation events"
  ON regulation_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own regulation events"
  ON regulation_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update regulation_state updated_at timestamp
CREATE OR REPLACE FUNCTION update_regulation_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for regulation_state
DROP TRIGGER IF EXISTS regulation_state_updated_at ON regulation_state;
CREATE TRIGGER regulation_state_updated_at
  BEFORE UPDATE ON regulation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_regulation_state_updated_at();

-- Function to automatically adjust strictness level based on trust score
CREATE OR REPLACE FUNCTION adjust_strictness_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_score >= 80 THEN
    NEW.current_level = 1;
  ELSIF NEW.trust_score >= 60 THEN
    NEW.current_level = 2;
  ELSIF NEW.trust_score >= 40 THEN
    NEW.current_level = 3;
  ELSIF NEW.trust_score >= 20 THEN
    NEW.current_level = 4;
  ELSE
    NEW.current_level = 5;
  END IF;

  IF OLD.current_level IS DISTINCT FROM NEW.current_level THEN
    NEW.last_level_change_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-adjust strictness
DROP TRIGGER IF EXISTS auto_adjust_strictness ON regulation_state;
CREATE TRIGGER auto_adjust_strictness
  BEFORE INSERT OR UPDATE OF trust_score ON regulation_state
  FOR EACH ROW
  EXECUTE FUNCTION adjust_strictness_level();

-- Function to initialize regulation state for new users
CREATE OR REPLACE FUNCTION init_regulation_state_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO regulation_state (user_id, master_project_id)
  VALUES (NEW.user_id, NULL)
  ON CONFLICT (user_id, master_project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create global regulation state when user creates first project
DROP TRIGGER IF EXISTS init_user_regulation_state ON master_projects;
CREATE TRIGGER init_user_regulation_state
  AFTER INSERT ON master_projects
  FOR EACH ROW
  EXECUTE FUNCTION init_regulation_state_for_user();
