/*
  # Stage 1: Behavioral Sandbox (Interpretation Layer)

  1. New Tables
    - `user_consent_flags`
      - Tracks granular user consent for behavioral interpretation categories
      - Default: no rows = no consent = no computation
      - Enables/disables specific signal types per user

    - `candidate_signals`
      - Append-only storage for computed behavioral signals
      - Includes full provenance (source event IDs + hash)
      - Algorithm versioning for reproducibility
      - Confidence scores and time ranges
      - Status: candidate|invalidated|deleted

    - `signal_audit_log`
      - Audit trail for all signal operations
      - Tracks compute, invalidate, and delete actions
      - Supports compliance and debugging

  2. Security
    - Enable RLS on all tables
    - Users can only access their own consent flags and signals
    - Audit log is append-only for users, readable for debugging

  3. Constraints
    - Consent keys must match registry (enforced by CHECK)
    - Signal keys must match registry (enforced by CHECK)
    - Time ranges must be valid (start <= end)
    - Confidence must be 0..1
    - Provenance hash required for all signals

  4. Stage 1 Principles
    - NO UI display of signals (Stage 2+ only)
    - NO actions/notifications triggered by signals
    - NO completion rates, streaks, or productivity scores
    - Consent required before any computation
    - Full provenance and versioning for transparency
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- USER CONSENT FLAGS
-- ==============================================================================

-- Valid consent keys (Stage 1 initial set)
-- More can be added in future migrations
CREATE TYPE consent_key_enum AS ENUM (
  'session_structures',
  'time_patterns',
  'activity_durations',
  'data_quality_basic'
);

CREATE TABLE IF NOT EXISTS user_consent_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_key consent_key_enum NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT user_consent_unique UNIQUE (user_id, consent_key),
  CONSTRAINT consent_dates_valid CHECK (
    (is_enabled = true AND granted_at IS NOT NULL) OR
    (is_enabled = false AND revoked_at IS NOT NULL) OR
    (granted_at IS NULL AND revoked_at IS NULL)
  )
);

CREATE INDEX idx_user_consent_flags_user_id ON user_consent_flags(user_id);
CREATE INDEX idx_user_consent_flags_enabled ON user_consent_flags(user_id, is_enabled) WHERE is_enabled = true;

COMMENT ON TABLE user_consent_flags IS 'Stage 1: Granular user consent for behavioral signal computation';
COMMENT ON COLUMN user_consent_flags.consent_key IS 'Must match signal registry consent requirements';
COMMENT ON COLUMN user_consent_flags.is_enabled IS 'false = no computation allowed for this category';

-- ==============================================================================
-- CANDIDATE SIGNALS
-- ==============================================================================

-- Valid signal keys (Stage 1 initial set)
-- Must match the signal registry in code
CREATE TYPE signal_key_enum AS ENUM (
  'session_boundaries',
  'time_bins_activity_count',
  'activity_intervals',
  'capture_coverage'
);

-- Signal lifecycle status
CREATE TYPE signal_status_enum AS ENUM (
  'candidate',      -- Computed and ready (default)
  'invalidated',    -- Source data changed, signal no longer valid
  'deleted'         -- Soft-deleted by user or system
);

CREATE TABLE IF NOT EXISTS candidate_signals (
  signal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key signal_key_enum NOT NULL,
  signal_version text NOT NULL,

  -- Time window this signal covers
  time_range_start timestamptz NOT NULL,
  time_range_end timestamptz NOT NULL,

  -- Computed value (structure varies by signal_key)
  value_json jsonb NOT NULL,

  -- Confidence and provenance
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  provenance_event_ids uuid[] NOT NULL DEFAULT '{}',
  provenance_hash text NOT NULL,

  -- Computation metadata
  parameters_json jsonb NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now(),

  -- Lifecycle
  status signal_status_enum NOT NULL DEFAULT 'candidate',
  invalidated_at timestamptz,
  invalidated_reason text,

  created_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT time_range_valid CHECK (time_range_start <= time_range_end),
  CONSTRAINT provenance_required CHECK (array_length(provenance_event_ids, 1) > 0),
  CONSTRAINT status_invalidated_reason CHECK (
    (status = 'invalidated' AND invalidated_reason IS NOT NULL) OR
    (status != 'invalidated')
  )
);

-- Indexes for efficient queries
CREATE INDEX idx_candidate_signals_user_key_time ON candidate_signals(user_id, signal_key, computed_at DESC);
CREATE INDEX idx_candidate_signals_time_range ON candidate_signals(user_id, time_range_start, time_range_end);
CREATE INDEX idx_candidate_signals_status ON candidate_signals(user_id, status) WHERE status = 'candidate';
CREATE INDEX idx_candidate_signals_provenance_hash ON candidate_signals(user_id, signal_key, provenance_hash);

COMMENT ON TABLE candidate_signals IS 'Stage 1: Computed behavioral signals with full provenance (NOT user-facing by default)';
COMMENT ON COLUMN candidate_signals.signal_key IS 'Must match signal registry whitelist';
COMMENT ON COLUMN candidate_signals.value_json IS 'Neutral signal output - NO judgmental language';
COMMENT ON COLUMN candidate_signals.confidence IS '0 to 1, algorithm confidence in signal accuracy';
COMMENT ON COLUMN candidate_signals.provenance_hash IS 'SHA-256 hash of normalized source events for cache invalidation';
COMMENT ON COLUMN candidate_signals.status IS 'candidate = valid, invalidated = source data changed, deleted = soft-deleted';

-- ==============================================================================
-- SIGNAL AUDIT LOG
-- ==============================================================================

CREATE TABLE IF NOT EXISTS signal_audit_log (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES candidate_signals(signal_id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT action_valid CHECK (action IN ('computed', 'invalidated', 'deleted', 'consent_granted', 'consent_revoked'))
);

CREATE INDEX idx_signal_audit_log_user_id ON signal_audit_log(user_id, created_at DESC);
CREATE INDEX idx_signal_audit_log_signal_id ON signal_audit_log(signal_id);

COMMENT ON TABLE signal_audit_log IS 'Stage 1: Audit trail for all signal operations';
COMMENT ON COLUMN signal_audit_log.action IS 'computed|invalidated|deleted|consent_granted|consent_revoked';
COMMENT ON COLUMN signal_audit_log.actor IS 'user_id or system identifier';

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE user_consent_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_audit_log ENABLE ROW LEVEL SECURITY;

-- User consent flags policies
CREATE POLICY "Users can view own consent flags"
  ON user_consent_flags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent flags"
  ON user_consent_flags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent flags"
  ON user_consent_flags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consent flags"
  ON user_consent_flags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Candidate signals policies
CREATE POLICY "Users can view own candidate signals"
  ON candidate_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert candidate signals"
  ON candidate_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update candidate signals status"
  ON candidate_signals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Audit log policies
CREATE POLICY "Users can view own audit log"
  ON signal_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log entries"
  ON signal_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to check if user has granted consent for a specific key
CREATE OR REPLACE FUNCTION has_consent(p_user_id uuid, p_consent_key consent_key_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_consent_flags
    WHERE user_id = p_user_id
      AND consent_key = p_consent_key
      AND is_enabled = true
  );
END;
$$;

COMMENT ON FUNCTION has_consent IS 'Stage 1: Check if user has granted consent for signal computation';

-- Function to invalidate signals when source events are affected
CREATE OR REPLACE FUNCTION invalidate_signals_for_events(
  p_user_id uuid,
  p_event_ids uuid[],
  p_reason text DEFAULT 'Source events modified or deleted'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  -- Only allow users to invalidate their own signals
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot invalidate signals for other users';
  END IF;

  -- Update signals that reference any of the provided event IDs
  WITH updated AS (
    UPDATE candidate_signals
    SET status = 'invalidated',
        invalidated_at = now(),
        invalidated_reason = p_reason
    WHERE user_id = p_user_id
      AND status = 'candidate'
      AND provenance_event_ids && p_event_ids
    RETURNING signal_id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  -- Log the invalidation
  INSERT INTO signal_audit_log (user_id, action, actor, reason, metadata)
  VALUES (
    p_user_id,
    'invalidated',
    'system',
    p_reason,
    jsonb_build_object('event_ids', p_event_ids, 'affected_signals', v_updated_count)
  );

  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION invalidate_signals_for_events IS 'Stage 1: Invalidate signals when source events change';

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_enabled = true THEN
    INSERT INTO signal_audit_log (user_id, action, actor, reason, metadata)
    VALUES (
      NEW.user_id,
      'consent_granted',
      NEW.user_id::text,
      'User granted consent',
      jsonb_build_object('consent_key', NEW.consent_key)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_enabled = true AND NEW.is_enabled = false THEN
    INSERT INTO signal_audit_log (user_id, action, actor, reason, metadata)
    VALUES (
      NEW.user_id,
      'consent_revoked',
      NEW.user_id::text,
      'User revoked consent',
      jsonb_build_object('consent_key', NEW.consent_key)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to log consent changes
CREATE TRIGGER trigger_log_consent_change
  AFTER INSERT OR UPDATE ON user_consent_flags
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

COMMENT ON TRIGGER trigger_log_consent_change ON user_consent_flags IS 'Stage 1: Audit consent grant/revoke actions';
