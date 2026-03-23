-- ============================================================================
-- SHARED UNDERSTANDING & ROLES SYSTEM
-- ============================================================================
-- Allows people to observe, understand, and support another person's skills
-- without control, judgment, or optimization.
--
-- PRINCIPLES:
-- - Observation ≠ Evaluation
-- - Support ≠ Direction
-- - Visibility ≠ Control
-- - Skills remain owned by the individual
-- - No role may imply improvement, performance, or deficiency
-- - Everything is explicit, consent-based, and revocable

-- ============================================================================
-- ROLE TYPES
-- ============================================================================

CREATE TYPE shared_understanding_role AS ENUM (
  'observer',        -- Neutral viewer, no interaction
  'supporter',       -- Emotional or practical support (no edits)
  'guide',           -- Can add reflections/questions (non-binding)
  'educator',        -- Learning-oriented observer
  'mentor',          -- Experience-based perspective
  'coach',           -- Process-oriented observer (no outcomes)
  'therapist',       -- Reflective, wellbeing-oriented
  'parent',          -- Care-oriented perspective
  'partner',         -- Shared life context
  'peer',            -- Equal-level understanding
  'manager',         -- Organisational context (no authority)
  'leader',          -- Strategic context (no evaluation)
  'student',         -- Reverse mentorship context
  'self',            -- Explicit self-view mode
  'custom'           -- User-defined label
);

-- ============================================================================
-- SHARED UNDERSTANDING AGREEMENTS
-- ============================================================================

CREATE TYPE shared_understanding_scope AS ENUM (
  'skills_only',           -- All skills, no contexts
  'specific_contexts',     -- Specific contexts only
  'specific_skills'        -- Specific skills only
);

CREATE TYPE shared_understanding_interaction AS ENUM (
  'view_only',        -- Read-only observation
  'reflect',          -- Can add reflections (non-binding)
  'ask_questions'     -- Can ask questions (non-binding)
);

CREATE TYPE shared_understanding_visibility AS ENUM (
  'overview',         -- High-level summary only
  'detailed'          -- Full detail access
);

CREATE TABLE IF NOT EXISTS shared_understanding_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agreement parties
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role and scope
  role shared_understanding_role NOT NULL,
  role_label text, -- Custom label if role is 'custom'
  
  scope shared_understanding_scope NOT NULL DEFAULT 'skills_only',
  
  -- Context and skill filters (optional, depends on scope)
  context_ids uuid[] DEFAULT '{}', -- Only if scope is 'specific_contexts'
  skill_ids uuid[] DEFAULT '{}',   -- Only if scope is 'specific_skills'
  
  -- Interaction boundaries
  allowed_interactions shared_understanding_interaction[] NOT NULL DEFAULT ARRAY['view_only']::shared_understanding_interaction[],
  visibility_level shared_understanding_visibility NOT NULL DEFAULT 'overview',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  revoked_at timestamptz, -- Soft delete / revocation
  
  -- Constraints
  UNIQUE(owner_user_id, viewer_user_id, role) -- One agreement per owner-viewer-role combination
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shared_understanding_owner ON shared_understanding_agreements(owner_user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shared_understanding_viewer ON shared_understanding_agreements(viewer_user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shared_understanding_active ON shared_understanding_agreements(owner_user_id, viewer_user_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- EXTERNAL REFLECTIONS (Non-binding notes from external viewers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_external_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reflection target
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  context_id uuid REFERENCES skill_contexts(id) ON DELETE CASCADE,
  
  -- Reflection author
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_id uuid NOT NULL REFERENCES shared_understanding_agreements(id) ON DELETE CASCADE,
  
  -- Reflection content
  reflection_text text NOT NULL,
  reflection_type text DEFAULT 'observation', -- 'observation', 'question', 'reflection'
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  dismissed_at timestamptz, -- Owner can dismiss
  
  -- Constraints
  CHECK (reflection_text IS NOT NULL AND length(trim(reflection_text)) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_reflections_skill ON skill_external_reflections(skill_id) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_external_reflections_author ON skill_external_reflections(author_user_id);
CREATE INDEX IF NOT EXISTS idx_external_reflections_agreement ON skill_external_reflections(agreement_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE shared_understanding_agreements ENABLE ROW LEVEL SECURITY;

-- Owners can view their own agreements
CREATE POLICY "Owners can view their agreements"
  ON shared_understanding_agreements FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() OR viewer_user_id = auth.uid());

-- Owners can create agreements
CREATE POLICY "Owners can create agreements"
  ON shared_understanding_agreements FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Owners can update their agreements
CREATE POLICY "Owners can update their agreements"
  ON shared_understanding_agreements FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Owners can revoke their agreements
CREATE POLICY "Owners can revoke their agreements"
  ON shared_understanding_agreements FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- External reflections RLS
ALTER TABLE skill_external_reflections ENABLE ROW LEVEL SECURITY;

-- Authors can view their own reflections
CREATE POLICY "Authors can view their reflections"
  ON skill_external_reflections FOR SELECT
  TO authenticated
  USING (author_user_id = auth.uid());

-- Skill owners can view reflections on their skills
CREATE POLICY "Owners can view reflections on their skills"
  ON skill_external_reflections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_external_reflections.skill_id
      AND user_skills.user_id = auth.uid()
    )
  );

-- Authors can create reflections (if they have an active agreement)
CREATE POLICY "Authors can create reflections"
  ON skill_external_reflections FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shared_understanding_agreements
      WHERE shared_understanding_agreements.id = skill_external_reflections.agreement_id
      AND shared_understanding_agreements.viewer_user_id = auth.uid()
      AND shared_understanding_agreements.revoked_at IS NULL
      AND 'reflect' = ANY(shared_understanding_agreements.allowed_interactions)
    )
  );

-- Authors can update their own reflections
CREATE POLICY "Authors can update their reflections"
  ON skill_external_reflections FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

-- Skill owners can dismiss reflections
CREATE POLICY "Owners can dismiss reflections"
  ON skill_external_reflections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_external_reflections.skill_id
      AND user_skills.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_skills
      WHERE user_skills.id = skill_external_reflections.skill_id
      AND user_skills.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_shared_understanding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_understanding_agreements_updated_at
  BEFORE UPDATE ON shared_understanding_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_understanding_updated_at();

CREATE TRIGGER skill_external_reflections_updated_at
  BEFORE UPDATE ON skill_external_reflections
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_understanding_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shared_understanding_agreements IS
'Explicit agreements that allow one person to observe and understand another person''s skills. 
Roles define perspective, not permission by default. All agreements are consent-based and revocable.';

COMMENT ON COLUMN shared_understanding_agreements.role IS
'Defines the perspective from which the viewer observes. Does not grant authority or control.';

COMMENT ON COLUMN shared_understanding_agreements.scope IS
'Defines what skills/contexts are visible. Can be all skills, specific contexts, or specific skills.';

COMMENT ON COLUMN shared_understanding_agreements.allowed_interactions IS
'Defines what the viewer can do: view only, add reflections, or ask questions. All interactions are non-binding.';

COMMENT ON COLUMN shared_understanding_agreements.visibility_level IS
'Defines detail level: overview (summary) or detailed (full access).';

COMMENT ON TABLE skill_external_reflections IS
'Non-binding notes, questions, or reflections added by external viewers. 
These are clearly marked, never merged into owner''s narrative, and dismissible by the owner.';

COMMENT ON COLUMN skill_external_reflections.reflection_type IS
'Type of reflection: observation (factual), question (inquiry), or reflection (thoughtful note).';






