/*
  # Create Context Events (Life States & Interpretation Layer)
  
  1. Changes
    - Create context_events table for annotating time periods
    - Context events explain tracker deviations without modifying data
    - Owner-only access (no sharing in Phase 4)
    - Supports date ranges and custom types
  
  2. Notes
    - Context events are interpretive overlays, not trackers
    - They never mutate tracker data
    - They never enforce behavior
    - They explain, they don't judge
    - User-declared, not inferred
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_active_contexts_for_date(uuid, date);
DROP FUNCTION IF EXISTS get_contexts_in_date_range(uuid, date, date);

-- Drop table if it exists (to ensure clean state - no data should exist yet)
DROP TABLE IF EXISTS context_events CASCADE;

-- Create context_events table
CREATE TABLE context_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  severity text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT check_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_type_valid CHECK (type IN ('illness', 'recovery', 'travel', 'injury', 'stress', 'custom')),
  CONSTRAINT check_label_not_empty CHECK (trim(label) != ''),
  CONSTRAINT check_severity_valid CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high'))
);

-- Drop existing indexes if they exist (to recreate with correct WHERE clause)
DROP INDEX IF EXISTS idx_context_events_owner;
DROP INDEX IF EXISTS idx_context_events_dates;
DROP INDEX IF EXISTS idx_context_events_type;

-- Create indexes
CREATE INDEX idx_context_events_owner 
  ON context_events(owner_id) 
  WHERE archived_at IS NULL;

CREATE INDEX idx_context_events_dates 
  ON context_events(start_date, end_date) 
  WHERE archived_at IS NULL;

CREATE INDEX idx_context_events_type 
  ON context_events(type) 
  WHERE archived_at IS NULL;

-- Enable RLS
ALTER TABLE context_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own context events
CREATE POLICY "Users can view their own context events"
  ON context_events
  FOR SELECT
  USING (
    owner_id = auth.uid()
  );

-- Users can create their own context events
CREATE POLICY "Users can create their own context events"
  ON context_events
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Users can update their own context events
CREATE POLICY "Users can update their own context events"
  ON context_events
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Users can archive their own context events (soft delete)
CREATE POLICY "Users can archive their own context events"
  ON context_events
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Admins can view all context events (for debugging)
CREATE POLICY "Admins can view all context events"
  ON context_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Helper function: Get active contexts for a date
CREATE OR REPLACE FUNCTION get_active_contexts_for_date(
  p_user_id uuid,
  p_date date
)
RETURNS SETOF context_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM context_events
  WHERE owner_id = p_user_id
    AND archived_at IS NULL
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY start_date DESC, created_at DESC;
END;
$$;

-- Helper function: Get contexts in date range
CREATE OR REPLACE FUNCTION get_contexts_in_date_range(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS SETOF context_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM context_events
  WHERE owner_id = p_user_id
    AND archived_at IS NULL
    AND (
      -- Context starts within range
      (start_date >= p_start_date AND start_date <= p_end_date)
      OR
      -- Context ends within range
      (end_date IS NOT NULL AND end_date >= p_start_date AND end_date <= p_end_date)
      OR
      -- Context spans entire range
      (start_date <= p_start_date AND (end_date IS NULL OR end_date >= p_end_date))
    )
  ORDER BY start_date ASC, created_at ASC;
END;
$$;

-- Comments
COMMENT ON TABLE context_events IS 'Context events (life states) that annotate time periods to explain tracker deviations. Never modify tracker data.';
COMMENT ON COLUMN context_events.type IS 'Type of context: illness, recovery, travel, injury, stress, or custom';
COMMENT ON COLUMN context_events.label IS 'Human-readable label for the context event';
COMMENT ON COLUMN context_events.start_date IS 'Start date of the context period (required)';
COMMENT ON COLUMN context_events.end_date IS 'End date of the context period (NULL = open-ended)';
COMMENT ON COLUMN context_events.severity IS 'Optional severity level: low, medium, high';
COMMENT ON COLUMN context_events.notes IS 'Optional notes explaining the context';
COMMENT ON FUNCTION get_active_contexts_for_date IS 'Returns all active context events for a user on a specific date';
COMMENT ON FUNCTION get_contexts_in_date_range IS 'Returns all context events for a user within a date range';
