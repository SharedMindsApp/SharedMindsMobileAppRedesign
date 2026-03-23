/*
  # Stage 3.1: Intervention Registry & Control Scaffolding

  1. New Tables
    - `interventions_registry`
      - Core registry for all user-created interventions
      - Tracks lifecycle status, user parameters, and consent
      - Enforces Stage 3 invariants: default OFF, user authorship, Safe Mode override
    - `intervention_lifecycle_events`
      - Lifecycle-only audit trail (NO adherence/engagement metrics)
      - Allowed events: created, enabled, paused, disabled, deleted, edited
      - FORBIDDEN events: triggered, viewed, dismissed, ignored, completed

  2. Security
    - Enable RLS on both tables
    - Users can only access their own interventions
    - Lifecycle events recorded via security definer functions
    - Safe Mode integration functions enforce hard override

  3. Invariants Enforced
    - Default state: paused (opt-in only)
    - created_by and last_modified_by must always be "user"
    - intervention_key must be one of 10 allowed types
    - Safe Mode can pause all interventions
    - No auto-resume after Safe Mode OFF

  4. Important Notes
    - This is infrastructure only - NO delivery, triggers, or notifications
    - Interventions can be "active" but nothing executes them (Stage 3.2+)
    - Lifecycle tracking only - NO adherence or effectiveness metrics
*/

-- Create interventions_registry table
CREATE TABLE IF NOT EXISTS interventions_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Intervention type (must be one of 10 allowed)
  intervention_key text NOT NULL CHECK (
    intervention_key IN (
      'implementation_intention_reminder',
      'context_aware_prompt',
      'scheduled_reflection_prompt',
      'simplified_view_mode',
      'task_decomposition_assistant',
      'focus_mode_suppression',
      'timeboxed_session',
      'project_scope_limiter',
      'accountability_partnership',
      'commitment_witness'
    )
  ),
  
  -- Provenance (must always be "user")
  created_by text NOT NULL DEFAULT 'user' CHECK (created_by = 'user'),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Lifecycle status
  status text NOT NULL DEFAULT 'paused' CHECK (
    status IN ('active', 'paused', 'disabled', 'deleted')
  ),
  
  -- Lifecycle timestamps
  enabled_at timestamptz,
  paused_at timestamptz,
  disabled_at timestamptz,
  deleted_at timestamptz,
  
  -- User intent and configuration
  why_text text,
  user_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Consent tracking
  consent_granted_at timestamptz NOT NULL DEFAULT now(),
  consent_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Safe Mode integration
  paused_by_safe_mode boolean NOT NULL DEFAULT false,
  auto_resume_blocked boolean NOT NULL DEFAULT true,
  
  -- Audit fields
  last_modified_at timestamptz NOT NULL DEFAULT now(),
  last_modified_by text NOT NULL DEFAULT 'user' CHECK (last_modified_by = 'user'),
  
  -- Constraint: deleted items must have deleted_at
  CONSTRAINT deleted_must_have_timestamp CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL) OR
    (status != 'deleted')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_user_status ON interventions_registry(user_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_user_key ON interventions_registry(user_id, intervention_key);

-- Create lifecycle events audit table
CREATE TABLE IF NOT EXISTS intervention_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES interventions_registry(id) ON DELETE CASCADE,
  
  -- Event type (lifecycle only - NO adherence/engagement metrics)
  event_type text NOT NULL CHECK (
    event_type IN (
      'intervention_created',
      'intervention_enabled',
      'intervention_paused',
      'intervention_disabled',
      'intervention_deleted',
      'intervention_edited',
      'safe_mode_paused_interventions',
      'safe_mode_unpaused_interventions'
    )
  ),
  
  -- Actor (user or safe_mode only - never "system")
  actor text NOT NULL CHECK (actor IN ('user', 'safe_mode')),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Optional metadata (MUST NOT contain adherence/effectiveness metrics)
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Create indexes for lifecycle events
CREATE INDEX IF NOT EXISTS idx_lifecycle_user_created ON intervention_lifecycle_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_intervention_created ON intervention_lifecycle_events(intervention_id, created_at DESC);

-- Enable RLS
ALTER TABLE interventions_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interventions_registry

-- SELECT: only own non-deleted interventions
CREATE POLICY "Users can view own interventions"
  ON interventions_registry
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: only if user_id matches and created_by='user' and status='paused'
CREATE POLICY "Users can create own interventions"
  ON interventions_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    created_by = 'user' AND
    status = 'paused'
  );

-- UPDATE: only own non-deleted interventions, must keep last_modified_by='user'
CREATE POLICY "Users can update own interventions"
  ON interventions_registry
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (
    auth.uid() = user_id AND
    last_modified_by = 'user'
  );

-- DELETE: not allowed (use soft delete via status + deleted_at)
-- No DELETE policy = no hard deletes

-- RLS Policies for intervention_lifecycle_events

-- SELECT: only own events
CREATE POLICY "Users can view own lifecycle events"
  ON intervention_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: only own events (application layer enforces this)
CREATE POLICY "Users can create own lifecycle events"
  ON intervention_lifecycle_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- CREATE SECURITY DEFINER FUNCTIONS

-- Function: Pause all interventions when Safe Mode turns ON
CREATE OR REPLACE FUNCTION pause_all_interventions_for_safe_mode(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pause all active interventions
  UPDATE interventions_registry
  SET 
    status = 'paused',
    paused_by_safe_mode = true,
    paused_at = now(),
    last_modified_at = now()
  WHERE 
    user_id = p_user_id AND
    status = 'active';
  
  -- Record lifecycle event
  INSERT INTO intervention_lifecycle_events (
    user_id,
    intervention_id,
    event_type,
    actor,
    meta
  ) VALUES (
    p_user_id,
    NULL,
    'safe_mode_paused_interventions',
    'safe_mode',
    jsonb_build_object('paused_count', (
      SELECT COUNT(*) FROM interventions_registry 
      WHERE user_id = p_user_id AND paused_by_safe_mode = true
    ))
  );
END;
$$;

-- Function: Clear Safe Mode pause flags when Safe Mode turns OFF
CREATE OR REPLACE FUNCTION clear_safe_mode_pause_flags(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear paused_by_safe_mode flag (but keep status as paused)
  UPDATE interventions_registry
  SET 
    paused_by_safe_mode = false,
    last_modified_at = now()
  WHERE 
    user_id = p_user_id AND
    paused_by_safe_mode = true;
  
  -- Record lifecycle event
  INSERT INTO intervention_lifecycle_events (
    user_id,
    intervention_id,
    event_type,
    actor,
    meta
  ) VALUES (
    p_user_id,
    NULL,
    'safe_mode_unpaused_interventions',
    'safe_mode',
    jsonb_build_object('note', 'Interventions remain paused; user must re-enable manually')
  );
END;
$$;

-- Function: Soft delete intervention
CREATE OR REPLACE FUNCTION soft_delete_intervention(p_intervention_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM interventions_registry 
    WHERE id = p_intervention_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Intervention not found or access denied';
  END IF;
  
  -- Soft delete
  UPDATE interventions_registry
  SET 
    status = 'deleted',
    deleted_at = now(),
    last_modified_at = now()
  WHERE 
    id = p_intervention_id AND
    user_id = p_user_id;
  
  -- Record lifecycle event
  INSERT INTO intervention_lifecycle_events (
    user_id,
    intervention_id,
    event_type,
    actor
  ) VALUES (
    p_user_id,
    p_intervention_id,
    'intervention_deleted',
    'user'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION pause_all_interventions_for_safe_mode(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_safe_mode_pause_flags(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_intervention(uuid, uuid) TO authenticated;
