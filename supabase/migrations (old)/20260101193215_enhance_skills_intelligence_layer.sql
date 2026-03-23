/*
  # Enhance Skills System with Intelligence Layer

  1. Changes to user_skills (canonical source)
    - Add sub-skill support and prerequisites
    - Add confidence_level (separate from proficiency)
    - Add consistency_score (derived, nullable)
    - Add capacity_context (health, stress, workload signals)
    - Add parent_skill_id for sub-skills

  2. Changes to personal_skills_context
    - Add status: active, background, paused (not just boolean)
    - Add life_area linkage
    - Add momentum indicator (derived)
    - Add practice_logs (qualitative JSONB)
    - Add blocked_notes and growth_conditions

  3. New Tables
    - skill_insights: Non-intrusive, explainable insights
    - skill_evidence: Structured evidence tracking

  4. Indexes
    - Performance indexes for intelligent queries

  This creates a deep, adaptive, human-centered skills system.
*/

-- ============================================================================
-- ENHANCE user_skills (Canonical Source)
-- ============================================================================

-- Add intelligence fields to user_skills
ALTER TABLE user_skills
  ADD COLUMN IF NOT EXISTS parent_skill_id uuid REFERENCES user_skills(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS prerequisites uuid[], -- Soft dependencies, not blockers
  ADD COLUMN IF NOT EXISTS confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 5),
  ADD COLUMN IF NOT EXISTS consistency_score numeric(3,2) CHECK (consistency_score >= 0 AND consistency_score <= 1),
  ADD COLUMN IF NOT EXISTS capacity_context jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

-- Create index for sub-skills
CREATE INDEX IF NOT EXISTS idx_user_skills_parent_skill_id ON user_skills(parent_skill_id) WHERE parent_skill_id IS NOT NULL;

-- ============================================================================
-- ENHANCE personal_skills_context
-- ============================================================================

-- Update status to be more nuanced than boolean
ALTER TABLE personal_skills_context
  DROP COLUMN IF EXISTS is_active CASCADE;

ALTER TABLE personal_skills_context
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'background', 'paused')) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS life_area text, -- Work, Health, Relationships, Creativity, etc.
  ADD COLUMN IF NOT EXISTS momentum text CHECK (momentum IN ('dormant', 'emerging', 'stabilising', 'integrated')),
  ADD COLUMN IF NOT EXISTS practice_logs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_notes text,
  ADD COLUMN IF NOT EXISTS growth_conditions text,
  ADD COLUMN IF NOT EXISTS effort_level text CHECK (effort_level IN ('minimal', 'moderate', 'significant', 'intense')),
  ADD COLUMN IF NOT EXISTS last_practice_at timestamptz;

-- Create index for active skills queries
CREATE INDEX IF NOT EXISTS idx_personal_skills_context_status ON personal_skills_context(user_id, status);
CREATE INDEX IF NOT EXISTS idx_personal_skills_context_momentum ON personal_skills_context(user_id, momentum);

-- ============================================================================
-- CREATE skill_evidence (Structured Evidence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,

  -- Evidence type and reference
  evidence_type text NOT NULL CHECK (evidence_type IN ('journal', 'project', 'habit', 'task', 'learning_resource', 'reflection', 'feedback')),
  reference_id uuid, -- ID in the referenced system
  reference_data jsonb, -- Lightweight snapshot for display

  -- Qualitative context
  context_notes text, -- "Where/how did I use this?"
  difficulty_felt text CHECK (difficulty_felt IN ('easier_than_before', 'about_the_same', 'harder_than_expected', 'surprisingly_easy', 'blockers_encountered')),

  -- Metadata
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- Ensure uniqueness per evidence piece
  UNIQUE(user_id, skill_id, evidence_type, reference_id, occurred_at)
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_skill ON skill_evidence(user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_occurred_at ON skill_evidence(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_type ON skill_evidence(evidence_type);

-- Enable RLS
ALTER TABLE skill_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_evidence
CREATE POLICY "Users can view their own skill evidence"
  ON skill_evidence FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own skill evidence"
  ON skill_evidence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill evidence"
  ON skill_evidence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill evidence"
  ON skill_evidence FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- CREATE skill_insights (Smart but Calm)
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,

  -- Insight data
  insight_type text NOT NULL CHECK (insight_type IN (
    'confidence_gap',
    'usage_pattern',
    'correlated_growth',
    'dormant_skill',
    'capacity_impact',
    'consistency_trend'
  )),
  message text NOT NULL, -- Human-readable insight
  explanation text NOT NULL, -- Why this insight appeared
  supporting_data jsonb, -- Evidence backing the insight

  -- State management
  is_dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  expires_at timestamptz, -- Insights can expire if no longer relevant

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_insights_user_skill ON skill_insights(user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_insights_active ON skill_insights(user_id, is_dismissed) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_skill_insights_expires_at ON skill_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE skill_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_insights
CREATE POLICY "Users can view their own skill insights"
  ON skill_insights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own skill insights"
  ON skill_insights FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill insights"
  ON skill_insights FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert insights (handled by service layer with service role)
CREATE POLICY "System can create skill insights"
  ON skill_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- CREATE trigger functions for intelligence
-- ============================================================================

-- Auto-update skill evidence updated_at
CREATE OR REPLACE FUNCTION update_skill_evidence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_evidence_updated_at_trigger
  BEFORE UPDATE ON skill_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_evidence_updated_at();

-- Auto-update skill insights updated_at
CREATE OR REPLACE FUNCTION update_skill_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skill_insights_updated_at_trigger
  BEFORE UPDATE ON skill_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_insights_updated_at();

-- ============================================================================
-- HELPER VIEWS (Optional, for performance)
-- ============================================================================

-- View for active skills with context
CREATE OR REPLACE VIEW active_skills_view AS
SELECT 
  us.*,
  psc.status,
  psc.life_area,
  psc.momentum,
  psc.personal_intention,
  psc.effort_level,
  psc.last_practice_at,
  COUNT(DISTINCT se.id) as evidence_count,
  MAX(se.occurred_at) as last_evidence_at
FROM user_skills us
LEFT JOIN personal_skills_context psc ON us.id = psc.skill_id AND us.user_id = psc.user_id
LEFT JOIN skill_evidence se ON us.id = se.skill_id AND us.user_id = se.user_id
GROUP BY us.id, psc.id;
