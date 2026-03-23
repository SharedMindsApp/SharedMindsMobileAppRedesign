/*
  # Stage 3.5: Intervention Governance & Personal Limits

  1. New Tables
    - `intervention_governance_settings`
      - User-defined personal limits (soft warnings only)
      - Fields: user_id, max_active_interventions, max_reminders, allowed_days, allowed_time_range, session_intervention_cap
    - `intervention_governance_rules`
      - User-authored constraints on intervention availability
      - Fields: rule_id, user_id, rule_type, rule_parameters, status

  2. Security
    - Enable RLS on both tables
    - Users can only manage their own governance settings and rules

  3. Important Notes
    - NO telemetry fields (no match_count, blocked_count, effectiveness)
    - NO system_generated fields
    - All limits are user-defined only
    - Limits are warnings, not enforcement
    - Governance rules constrain delivery eligibility, not user behavior
*/

-- Intervention Governance Settings Table
CREATE TABLE IF NOT EXISTS intervention_governance_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_active_interventions integer,
  max_reminders integer,
  allowed_days text[],
  allowed_time_range jsonb,
  session_intervention_cap integer,
  created_at timestamptz DEFAULT now(),
  last_modified_at timestamptz DEFAULT now()
);

ALTER TABLE intervention_governance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own governance settings"
  ON intervention_governance_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own governance settings"
  ON intervention_governance_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own governance settings"
  ON intervention_governance_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own governance settings"
  ON intervention_governance_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update last_modified_at on change
CREATE OR REPLACE FUNCTION update_governance_settings_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_governance_settings_timestamp
  BEFORE UPDATE ON intervention_governance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_settings_modified_at();

-- Intervention Governance Rules Table
CREATE TABLE IF NOT EXISTS intervention_governance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('time_window', 'session_cap', 'context_exclusion')),
  rule_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE intervention_governance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own governance rules"
  ON intervention_governance_rules
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own governance rules"
  ON intervention_governance_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own governance rules"
  ON intervention_governance_rules
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own governance rules"
  ON intervention_governance_rules
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update updated_at on change
CREATE OR REPLACE FUNCTION update_governance_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_governance_rules_timestamp
  BEFORE UPDATE ON intervention_governance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_rules_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_governance_rules_user_id ON intervention_governance_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_governance_rules_status ON intervention_governance_rules(status);
CREATE INDEX IF NOT EXISTS idx_governance_rules_user_status ON intervention_governance_rules(user_id, status);
