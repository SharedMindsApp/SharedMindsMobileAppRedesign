/*
  # Stage 2: Feedback & UX Layer (Display Layer)

  1. New Tables
    - `insight_display_consent`
      - Tracks user consent to VIEW insights (separate from Stage 1 compute consent)
      - Granular per-signal-category display permission
      - Default: OFF (no display without explicit consent)

    - `insight_feedback`
      - Captures "Not helpful" feedback from users
      - Does NOT trigger system changes
      - Stored for future analysis only

    - `safe_mode_state`
      - User's Safe Mode preference (emergency brake)
      - When enabled: ALL insights hidden
      - Reversible, does not delete data

    - `insight_display_log`
      - Audit trail for insight displays
      - Tracks what was shown, when, to whom
      - Supports transparency and debugging

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Safe Mode overrides all other permissions

  3. Stage 2 Principles
    - Display only (no computation)
    - Consent-gated (explicit opt-in required)
    - Transparent (show provenance)
    - Reversible (Safe Mode = instant off)
    - NO judgmental language, NO recommendations, NO nudges
*/

-- ==============================================================================
-- INSIGHT DISPLAY CONSENT
-- ==============================================================================

-- Display consent is SEPARATE from compute consent (Stage 1)
-- User might allow computation but not display
CREATE TABLE IF NOT EXISTS insight_display_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key signal_key_enum NOT NULL,
  display_enabled boolean NOT NULL DEFAULT false,
  
  -- Consent metadata
  granted_at timestamptz,
  revoked_at timestamptz,
  
  -- Display preferences (neutral)
  prefer_collapsed boolean DEFAULT false,
  prefer_hidden boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT display_consent_unique UNIQUE (user_id, signal_key),
  CONSTRAINT display_consent_dates_valid CHECK (
    (display_enabled = true AND granted_at IS NOT NULL) OR
    (display_enabled = false)
  )
);

CREATE INDEX idx_insight_display_consent_user_id ON insight_display_consent(user_id);
CREATE INDEX idx_insight_display_consent_enabled ON insight_display_consent(user_id, display_enabled) 
  WHERE display_enabled = true;

COMMENT ON TABLE insight_display_consent IS 'Stage 2: User consent to VIEW insights (separate from Stage 1 compute consent)';
COMMENT ON COLUMN insight_display_consent.display_enabled IS 'false = insights hidden, even if computed';
COMMENT ON COLUMN insight_display_consent.prefer_collapsed IS 'User preference: show collapsed by default';
COMMENT ON COLUMN insight_display_consent.prefer_hidden IS 'User preference: hide this category entirely';

-- ==============================================================================
-- INSIGHT FEEDBACK
-- ==============================================================================

-- "Not helpful" feedback capture
-- Does NOT trigger system changes (Stage 2 is passive)
CREATE TABLE IF NOT EXISTS insight_feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid NOT NULL REFERENCES candidate_signals(signal_id) ON DELETE CASCADE,
  signal_key signal_key_enum NOT NULL,
  
  -- Feedback type (expandable in future)
  feedback_type text NOT NULL CHECK (feedback_type IN ('not_helpful', 'helpful', 'confusing', 'concerning')),
  
  -- Optional free-text reason
  reason text,
  
  -- Context of when feedback was given
  displayed_at timestamptz,
  feedback_at timestamptz DEFAULT now(),
  
  -- Metadata
  ui_context jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),

  CONSTRAINT feedback_type_valid CHECK (feedback_type IN ('not_helpful', 'helpful', 'confusing', 'concerning'))
);

CREATE INDEX idx_insight_feedback_user_id ON insight_feedback(user_id, feedback_at DESC);
CREATE INDEX idx_insight_feedback_signal_id ON insight_feedback(signal_id);
CREATE INDEX idx_insight_feedback_type ON insight_feedback(user_id, feedback_type);

COMMENT ON TABLE insight_feedback IS 'Stage 2: User feedback on insights (passive capture, no system changes)';
COMMENT ON COLUMN insight_feedback.feedback_type IS 'not_helpful|helpful|confusing|concerning';
COMMENT ON COLUMN insight_feedback.reason IS 'Optional free-text explanation from user';

-- ==============================================================================
-- SAFE MODE STATE
-- ==============================================================================

-- Emergency brake: hide ALL insights instantly
-- Reversible, does not delete data
CREATE TABLE IF NOT EXISTS safe_mode_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Safe Mode status
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  disabled_at timestamptz,
  
  -- Reason for activation (optional)
  activation_reason text,
  
  -- Metadata
  activation_count integer DEFAULT 0,
  last_toggled_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT safe_mode_unique_user UNIQUE (user_id),
  CONSTRAINT safe_mode_dates_valid CHECK (
    (is_enabled = true AND enabled_at IS NOT NULL) OR
    (is_enabled = false)
  )
);

CREATE INDEX idx_safe_mode_user_id ON safe_mode_state(user_id);
CREATE INDEX idx_safe_mode_enabled ON safe_mode_state(user_id, is_enabled) WHERE is_enabled = true;

COMMENT ON TABLE safe_mode_state IS 'Stage 2: Safe Mode (emergency brake) - hides ALL insights instantly';
COMMENT ON COLUMN safe_mode_state.is_enabled IS 'true = ALL insights hidden, false = normal display rules apply';
COMMENT ON COLUMN safe_mode_state.activation_count IS 'How many times user has activated Safe Mode (no judgment)';

-- ==============================================================================
-- INSIGHT DISPLAY LOG
-- ==============================================================================

-- Audit trail: what insights were displayed to user
-- Supports transparency and debugging
CREATE TABLE IF NOT EXISTS insight_display_log (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid NOT NULL REFERENCES candidate_signals(signal_id) ON DELETE CASCADE,
  signal_key signal_key_enum NOT NULL,
  
  -- Display context
  displayed_at timestamptz DEFAULT now(),
  display_context text, -- 'dashboard' | 'detail_view' | 'report'
  
  -- User actions
  expanded boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  
  -- Session tracking (optional)
  session_id uuid,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insight_display_log_user_id ON insight_display_log(user_id, displayed_at DESC);
CREATE INDEX idx_insight_display_log_signal_id ON insight_display_log(signal_id);

COMMENT ON TABLE insight_display_log IS 'Stage 2: Audit trail of insight displays (transparency)';
COMMENT ON COLUMN insight_display_log.display_context IS 'Where the insight was shown';

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE insight_display_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_mode_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_display_log ENABLE ROW LEVEL SECURITY;

-- Insight display consent policies
CREATE POLICY "Users can view own display consent"
  ON insight_display_consent FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own display consent"
  ON insight_display_consent FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own display consent"
  ON insight_display_consent FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insight feedback policies
CREATE POLICY "Users can view own feedback"
  ON insight_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert feedback"
  ON insight_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Safe mode state policies
CREATE POLICY "Users can view own safe mode state"
  ON safe_mode_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own safe mode state"
  ON safe_mode_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own safe mode state"
  ON safe_mode_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Display log policies (append-only for users)
CREATE POLICY "Users can view own display log"
  ON insight_display_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert display log"
  ON insight_display_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Check if user can see insights (NOT in Safe Mode + has display consent)
CREATE OR REPLACE FUNCTION can_display_insight(p_user_id uuid, p_signal_key signal_key_enum)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_safe_mode_enabled boolean;
  v_display_consent boolean;
BEGIN
  -- Check Safe Mode first (overrides everything)
  SELECT is_enabled INTO v_safe_mode_enabled
  FROM safe_mode_state
  WHERE user_id = p_user_id;
  
  IF v_safe_mode_enabled = true THEN
    RETURN false;
  END IF;
  
  -- Check display consent
  SELECT display_enabled INTO v_display_consent
  FROM insight_display_consent
  WHERE user_id = p_user_id
    AND signal_key = p_signal_key;
  
  RETURN COALESCE(v_display_consent, false);
END;
$$;

COMMENT ON FUNCTION can_display_insight IS 'Stage 2: Check if insight can be displayed (Safe Mode + consent)';

-- Toggle Safe Mode
CREATE OR REPLACE FUNCTION toggle_safe_mode(p_user_id uuid, p_enable boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot toggle Safe Mode for other users';
  END IF;
  
  INSERT INTO safe_mode_state (
    user_id,
    is_enabled,
    enabled_at,
    disabled_at,
    activation_reason,
    activation_count,
    last_toggled_at
  )
  VALUES (
    p_user_id,
    p_enable,
    CASE WHEN p_enable THEN now() ELSE NULL END,
    CASE WHEN NOT p_enable THEN now() ELSE NULL END,
    p_reason,
    CASE WHEN p_enable THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_enabled = p_enable,
    enabled_at = CASE WHEN p_enable THEN now() ELSE safe_mode_state.enabled_at END,
    disabled_at = CASE WHEN NOT p_enable THEN now() ELSE safe_mode_state.disabled_at END,
    activation_reason = CASE WHEN p_enable THEN p_reason ELSE safe_mode_state.activation_reason END,
    activation_count = CASE WHEN p_enable THEN safe_mode_state.activation_count + 1 ELSE safe_mode_state.activation_count END,
    last_toggled_at = now(),
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION toggle_safe_mode IS 'Stage 2: Enable or disable Safe Mode (emergency brake)';

-- Get Safe Mode status
CREATE OR REPLACE FUNCTION is_safe_mode_enabled(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_enabled boolean;
BEGIN
  SELECT is_enabled INTO v_is_enabled
  FROM safe_mode_state
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_is_enabled, false);
END;
$$;

COMMENT ON FUNCTION is_safe_mode_enabled IS 'Stage 2: Check if Safe Mode is active for user';
