/*
  # Add Focus Distractions and Analytics Cache Tables

  1. New Tables
    - `focus_distractions`
      - Dedicated log for distraction entries
      - Types: phone, social_media, conversation, snack, other
      - Links to focus_sessions
      - Optional notes field for context
    
    - `focus_analytics_cache`
      - Weekly aggregated analytics for performance
      - Cached data to avoid recalculating stats
      - Fields: user_id, week_start, metrics, generated_at
      - Helps with analytics dashboard performance

  2. Security
    - Enable RLS on both tables
    - Users can only access their own distractions and analytics
    - All policies verify ownership through user_id or session ownership

  3. Important Notes
    - Distractions can still be logged in focus_events for timeline
    - This table provides structured distraction data
    - Analytics cache is regenerated weekly or on-demand
*/

-- Create focus_distractions table
CREATE TABLE IF NOT EXISTS focus_distractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('phone', 'social_media', 'conversation', 'snack', 'other')),
  notes text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create focus_analytics_cache table
CREATE TABLE IF NOT EXISTS focus_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  average_focus_score numeric(5,2),
  total_minutes int NOT NULL DEFAULT 0,
  drift_rate numeric(5,2),
  distraction_rate numeric(5,2),
  total_sessions int NOT NULL DEFAULT 0,
  completed_sessions int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_distractions_session_id ON focus_distractions(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_distractions_timestamp ON focus_distractions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_focus_distractions_type ON focus_distractions(type);
CREATE INDEX IF NOT EXISTS idx_focus_analytics_cache_user_id ON focus_analytics_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_analytics_cache_week_start ON focus_analytics_cache(week_start DESC);

-- Enable Row Level Security
ALTER TABLE focus_distractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_distractions
CREATE POLICY "Users can view own distractions"
  ON focus_distractions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_distractions.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own distractions"
  ON focus_distractions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_distractions.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own distractions"
  ON focus_distractions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_distractions.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_distractions.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own distractions"
  ON focus_distractions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sessions
      WHERE focus_sessions.id = focus_distractions.session_id
      AND focus_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for focus_analytics_cache
CREATE POLICY "Users can view own analytics cache"
  ON focus_analytics_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics cache"
  ON focus_analytics_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics cache"
  ON focus_analytics_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics cache"
  ON focus_analytics_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
