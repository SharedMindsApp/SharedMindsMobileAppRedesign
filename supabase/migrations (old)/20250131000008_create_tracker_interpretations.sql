/*
  # Create User-Authored Interpretations (Personal Meaning Layer)
  
  1. Changes
    - Create tracker_interpretations table for user-authored reflections
    - Interpretations are optional, user-written notes about time periods
    - Can be linked to trackers, context events, or standalone date ranges
    - Never affect analytics, reminders, or system behavior
  
  2. Notes
    - Interpretations are human meaning, not machine inference
    - User-authored only, no AI generation
    - Owner-only access (no sharing in Phase 4)
    - Soft delete via archived_at
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_interpretations_for_tracker(uuid);
DROP FUNCTION IF EXISTS get_interpretations_for_context(uuid);

-- Drop table if it exists (to ensure clean state)
DROP TABLE IF EXISTS tracker_interpretations CASCADE;

-- Create tracker_interpretations table
CREATE TABLE tracker_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid REFERENCES context_events(id) ON DELETE SET NULL,
  title text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT check_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_body_not_empty CHECK (trim(body) != ''),
  CONSTRAINT check_has_anchor CHECK (
    -- Must have at least one anchor: date range, tracker_ids, or context_event_id
    (tracker_ids IS NOT NULL AND array_length(tracker_ids, 1) > 0) OR
    context_event_id IS NOT NULL OR
    (start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_interpretations_owner 
  ON tracker_interpretations(owner_id) 
  WHERE archived_at IS NULL;

CREATE INDEX idx_interpretations_dates 
  ON tracker_interpretations(start_date, end_date) 
  WHERE archived_at IS NULL;

CREATE INDEX idx_interpretations_context 
  ON tracker_interpretations(context_event_id) 
  WHERE archived_at IS NULL AND context_event_id IS NOT NULL;

-- GIN index for array searches (tracker_ids)
CREATE INDEX idx_interpretations_tracker_ids 
  ON tracker_interpretations USING GIN(tracker_ids) 
  WHERE archived_at IS NULL;

-- Enable RLS
ALTER TABLE tracker_interpretations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own interpretations
CREATE POLICY "Users can view their own interpretations"
  ON tracker_interpretations
  FOR SELECT
  USING (
    owner_id = auth.uid()
  );

-- Users can create their own interpretations
CREATE POLICY "Users can create their own interpretations"
  ON tracker_interpretations
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Users can update their own interpretations
CREATE POLICY "Users can update their own interpretations"
  ON tracker_interpretations
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Users can archive their own interpretations (soft delete)
CREATE POLICY "Users can archive their own interpretations"
  ON tracker_interpretations
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Helper function: Get interpretations for a tracker
CREATE OR REPLACE FUNCTION get_interpretations_for_tracker(p_tracker_id uuid)
RETURNS SETOF tracker_interpretations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tracker_interpretations
  WHERE owner_id = auth.uid()
    AND archived_at IS NULL
    AND (tracker_ids IS NOT NULL AND p_tracker_id = ANY(tracker_ids))
  ORDER BY start_date DESC, created_at DESC;
END;
$$;

-- Helper function: Get interpretations for a context event
CREATE OR REPLACE FUNCTION get_interpretations_for_context(p_context_event_id uuid)
RETURNS SETOF tracker_interpretations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tracker_interpretations
  WHERE owner_id = auth.uid()
    AND archived_at IS NULL
    AND context_event_id = p_context_event_id
  ORDER BY start_date DESC, created_at DESC;
END;
$$;

-- Comments
COMMENT ON TABLE tracker_interpretations IS 'User-authored interpretations (personal meaning layer) that annotate time periods, trackers, or context events. Never affect analytics or system behavior.';
COMMENT ON COLUMN tracker_interpretations.start_date IS 'Start date of the interpretation period (required)';
COMMENT ON COLUMN tracker_interpretations.end_date IS 'End date of the interpretation period (NULL = single day)';
COMMENT ON COLUMN tracker_interpretations.tracker_ids IS 'Array of tracker IDs this interpretation relates to (optional)';
COMMENT ON COLUMN tracker_interpretations.context_event_id IS 'Context event this interpretation relates to (optional)';
COMMENT ON COLUMN tracker_interpretations.title IS 'Optional title for the interpretation';
COMMENT ON COLUMN tracker_interpretations.body IS 'Required body text of the interpretation';
COMMENT ON FUNCTION get_interpretations_for_tracker IS 'Returns all interpretations linked to a specific tracker for the current user';
COMMENT ON FUNCTION get_interpretations_for_context IS 'Returns all interpretations linked to a specific context event for the current user';
