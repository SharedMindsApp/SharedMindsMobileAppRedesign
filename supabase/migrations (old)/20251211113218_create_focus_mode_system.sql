/*
  # Create Focus Mode System for Guardrails

  1. New Tables
    - `focus_sessions`
      - Tracks each focus session a user starts
      - Fields: id, user_id, project_id, domain_id, start_time, end_time, status, durations, scores
      - Links to master_projects and domains
    
    - `focus_events`
      - Logs all events that occur during a session
      - Event types: start, pause, resume, end, drift, return, distraction, nudge_soft, nudge_hard
      - Stores metadata as JSONB for flexible event data
    
    - `focus_drift_log`
      - Explicit tracking of drift from main project to offshoots/distractions
      - Fields: session_id, project_id, offshoot_id, duration, drift_type
      - Helps calculate focus scores and identify patterns

  2. Security
    - Enable RLS on all tables
    - Users can only access their own focus sessions and related data
    - All policies verify session ownership through user_id or session_id chain

  3. Important Notes
    - Focus Mode references but does not modify existing Guardrails tables
    - Drift detection relies on frontend context switching detection
    - Regulation rules pause sessions but keep them alive for resumption
*/

-- Create focus_sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  intended_duration_minutes int,
  actual_duration_minutes int,
  focus_score int CHECK (focus_score >= 0 AND focus_score <= 100),
  drift_count int NOT NULL DEFAULT 0,
  distraction_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create focus_events table
CREATE TABLE IF NOT EXISTS focus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'end', 'drift', 'return', 'distraction', 'nudge_soft', 'nudge_hard')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create focus_drift_log table
CREATE TABLE IF NOT EXISTS focus_drift_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  offshoot_id uuid REFERENCES offshoot_ideas(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes int,
  drift_type text NOT NULL CHECK (drift_type IN ('offshoot', 'side_project', 'external_distraction')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_project_id ON focus_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_focus_events_session_id ON focus_events(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_events_timestamp ON focus_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_focus_drift_log_session_id ON focus_drift_log(session_id);

-- Enable Row Level Security
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_drift_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_sessions
CREATE POLICY "Users can view own focus sessions"
  ON focus_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own focus sessions"
  ON focus_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions"
  ON focus_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions"
  ON focus_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for focus_events
CREATE POLICY "Users can view events from own sessions"
  ON focus_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_events.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events for own sessions"
  ON focus_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_events.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events from own sessions"
  ON focus_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_events.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_events.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events from own sessions"
  ON focus_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_events.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for focus_drift_log
CREATE POLICY "Users can view own drift logs"
  ON focus_drift_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_drift_log.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own drift logs"
  ON focus_drift_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_drift_log.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own drift logs"
  ON focus_drift_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_drift_log.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_drift_log.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own drift logs"
  ON focus_drift_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_drift_log.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_focus_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for focus_sessions
DROP TRIGGER IF EXISTS focus_sessions_updated_at ON focus_sessions;
CREATE TRIGGER focus_sessions_updated_at
  BEFORE UPDATE ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_sessions_updated_at();