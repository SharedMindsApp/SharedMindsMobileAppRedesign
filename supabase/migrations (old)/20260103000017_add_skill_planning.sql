-- ============================================================================
-- SKILL PLANNING TABLE
-- ============================================================================
-- Optional, non-binding planning layer for skill contexts
-- No metrics, no targets, no success/failure fields
-- Planning is user-initiated, optional, and reversible

CREATE TYPE skill_plan_timeframe AS ENUM (
  'short',    -- Near-term (weeks to months)
  'medium',  -- Medium-term (months to year)
  'long',     -- Long-term (year+)
  'open'      -- No specific timeframe
);

CREATE TABLE IF NOT EXISTS skill_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  context_id uuid REFERENCES skill_contexts(id) ON DELETE CASCADE, -- Optional: plan can be context-specific
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Planning content (non-binding)
  timeframe skill_plan_timeframe NOT NULL DEFAULT 'open',
  intent_note text, -- Free text: "What would you like this skill to support?"
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz, -- Soft delete
  
  -- Constraints
  UNIQUE(skill_id, context_id, user_id) -- One active plan per skill-context-user combination
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_plans_skill_id ON skill_plans(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_plans_context_id ON skill_plans(context_id) WHERE context_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_plans_user_id ON skill_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_plans_active ON skill_plans(skill_id, context_id, user_id) WHERE archived_at IS NULL;

-- RLS
ALTER TABLE skill_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill plans"
  ON skill_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own skill plans"
  ON skill_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill plans"
  ON skill_plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill plans"
  ON skill_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_skill_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_plans_updated_at
  BEFORE UPDATE ON skill_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_plans_updated_at();

-- Comments
COMMENT ON TABLE skill_plans IS
'Optional, non-binding planning layer for skills. Allows users to express intentions and hypothetical paths without creating pressure, metrics, or auto-enforcement. Planning is user-initiated, optional, and reversible.';

COMMENT ON COLUMN skill_plans.intent_note IS
'Free text field for expressing what the user would like this skill to support. No validation, no structure, no metrics.';

COMMENT ON COLUMN skill_plans.timeframe IS
'Non-binding timeframe indicator. Does not create deadlines or expectations.';

COMMENT ON COLUMN skill_plans.archived_at IS
'Soft delete. Archived plans are not shown but remain in database for historical reference.';






