/*
  # Create Tracker Observation Links (Guardrails Integration Foundation)
  
  1. Changes
    - Create tracker_observation_links table for contextual, read-only observation
    - Enables Guardrails projects to observe Tracker Studio trackers
    - Consent-based, relationship-scoped access
  
  2. Notes
    - Observation is NOT sharing (different semantic model)
    - Observation is always read-only
    - Observation is contextual (project-scoped)
    - Consent is explicit and revocable
    - No tracker mutations via observation
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS list_observable_trackers_for_context(text, uuid, uuid);

-- Drop table if it exists (to ensure clean state)
DROP TABLE IF EXISTS tracker_observation_links CASCADE;

-- Create tracker_observation_links table
CREATE TABLE tracker_observation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  observer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'guardrails_project',
  context_id uuid NOT NULL,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  
  -- Constraints
  CONSTRAINT check_context_type_valid CHECK (context_type IN ('guardrails_project', 'team', 'household'))
);

-- Create unique index for active observation links
CREATE UNIQUE INDEX unique_active_tracker_observation
  ON tracker_observation_links (tracker_id, observer_user_id, context_id)
  WHERE revoked_at IS NULL;

-- Create indexes for efficient queries
CREATE INDEX idx_observation_links_tracker 
  ON tracker_observation_links(tracker_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX idx_observation_links_observer 
  ON tracker_observation_links(observer_user_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX idx_observation_links_context 
  ON tracker_observation_links(context_type, context_id) 
  WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE tracker_observation_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tracker owners can view observation links for their trackers
CREATE POLICY "Tracker owners can view their observation links"
  ON tracker_observation_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trackers
      WHERE id = tracker_observation_links.tracker_id
        AND owner_id = auth.uid()
    )
  );

-- Observers can view their own observation links
CREATE POLICY "Observers can view their own observation links"
  ON tracker_observation_links
  FOR SELECT
  USING (
    observer_user_id = auth.uid()
  );

-- Tracker owners can create observation links
CREATE POLICY "Tracker owners can create observation links"
  ON tracker_observation_links
  FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trackers
      WHERE id = tracker_observation_links.tracker_id
        AND owner_id = auth.uid()
        AND archived_at IS NULL
    )
  );

-- Tracker owners can revoke observation links (soft delete)
CREATE POLICY "Tracker owners can revoke observation links"
  ON tracker_observation_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trackers
      WHERE id = tracker_observation_links.tracker_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trackers
      WHERE id = tracker_observation_links.tracker_id
        AND owner_id = auth.uid()
    )
  );

-- Helper function: List observable trackers for a context
CREATE OR REPLACE FUNCTION list_observable_trackers_for_context(
  p_context_type text,
  p_context_id uuid,
  p_observer_user_id uuid
)
RETURNS TABLE (
  tracker_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tol.tracker_id
  FROM tracker_observation_links tol
  WHERE tol.context_type = p_context_type
    AND tol.context_id = p_context_id
    AND tol.observer_user_id = p_observer_user_id
    AND tol.revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM trackers t
      WHERE t.id = tol.tracker_id
        AND t.archived_at IS NULL
    );
END;
$$;

-- Comments
COMMENT ON TABLE tracker_observation_links IS 'Contextual, read-only observation links for trackers. Enables Guardrails projects to observe Tracker Studio trackers.';
COMMENT ON COLUMN tracker_observation_links.tracker_id IS 'The tracker being observed';
COMMENT ON COLUMN tracker_observation_links.observer_user_id IS 'The user who can observe (auth.uid)';
COMMENT ON COLUMN tracker_observation_links.context_type IS 'Type of context: guardrails_project, team, household';
COMMENT ON COLUMN tracker_observation_links.context_id IS 'ID of the context (e.g., project_id)';
COMMENT ON COLUMN tracker_observation_links.granted_by IS 'User who granted observation (tracker owner)';
COMMENT ON COLUMN tracker_observation_links.revoked_at IS 'Soft delete timestamp. Revoked links stop working.';
COMMENT ON FUNCTION list_observable_trackers_for_context IS 'Returns tracker IDs observable by a user in a specific context';
