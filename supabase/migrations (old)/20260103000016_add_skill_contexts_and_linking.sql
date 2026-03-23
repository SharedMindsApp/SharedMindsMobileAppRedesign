/*
  # Add Skill Contexts and Linking System
  
  1. New Tables
    - `skill_contexts`: Multiple contexts per skill (work, education, hobby, etc.)
    - `skill_entity_links`: Proper many-to-many linking (not arrays)
  
  2. Architecture
    - A skill can have zero or many contexts
    - Each context represents a different lens (work vs hobby vs education)
    - Links are contextual (same skill, different contexts, different links)
    - All changes are additive and backward-compatible
  
  3. Security
    - Enable RLS on new tables
    - Users can only manage their own skill contexts
*/

-- ============================================================================
-- SKILL CONTEXTS TABLE
-- ============================================================================
-- Allows multiple contextual layers per skill
-- Example: "Writing" skill in "work" context vs "hobby" context

CREATE TYPE skill_context_type AS ENUM (
  'work',
  'education',
  'hobby',
  'life',
  'health',
  'therapy',
  'parenting',
  'coaching',
  'other'
);

CREATE TYPE skill_context_status AS ENUM (
  'active',
  'background',
  'paused'
);

CREATE TYPE skill_context_visibility AS ENUM (
  'private',
  'shared',
  'assessed'
);

CREATE TYPE skill_pressure_level AS ENUM (
  'none',
  'low',
  'moderate',
  'high'
);

CREATE TABLE IF NOT EXISTS skill_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context identification
  context_type skill_context_type NOT NULL,
  role_label text, -- e.g., "Student", "Manager", "Parent"
  
  -- Context-specific metadata
  intent text, -- Why this skill matters in this context
  confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 5),
  pressure_level skill_pressure_level DEFAULT 'low',
  visibility skill_context_visibility DEFAULT 'private',
  status skill_context_status DEFAULT 'active',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(skill_id, user_id, context_type) -- One context per type per skill per user
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_contexts_skill_id ON skill_contexts(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_contexts_user_id ON skill_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_contexts_type ON skill_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_skill_contexts_status ON skill_contexts(user_id, status) WHERE status = 'active';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_skill_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skill_contexts_updated_at_trigger ON skill_contexts;
CREATE TRIGGER skill_contexts_updated_at_trigger
  BEFORE UPDATE ON skill_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_contexts_updated_at();

-- RLS
ALTER TABLE skill_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill contexts"
  ON skill_contexts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own skill contexts"
  ON skill_contexts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill contexts"
  ON skill_contexts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill contexts"
  ON skill_contexts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- SKILL ENTITY LINKS TABLE
-- ============================================================================
-- Proper many-to-many linking (replaces array-based linking)
-- Links are contextual - same skill can link to different entities in different contexts

CREATE TYPE skill_link_entity_type AS ENUM (
  'habit',
  'goal',
  'project',
  'trip',
  'calendar_event',
  'journal_entry',
  'learning_resource'
);

CREATE TABLE IF NOT EXISTS skill_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  context_id uuid REFERENCES skill_contexts(id) ON DELETE CASCADE, -- Optional: link is contextual
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Link target
  entity_type skill_link_entity_type NOT NULL,
  entity_id uuid NOT NULL, -- Polymorphic reference
  
  -- Link metadata
  link_notes text, -- Optional context about the link
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(skill_id, context_id, entity_type, entity_id) -- One link per skill-context-entity combination
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_entity_links_skill_id ON skill_entity_links(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_entity_links_context_id ON skill_entity_links(context_id) WHERE context_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_entity_links_user_id ON skill_entity_links(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_entity_links_entity ON skill_entity_links(entity_type, entity_id);

-- RLS
ALTER TABLE skill_entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill links"
  ON skill_entity_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own skill links"
  ON skill_entity_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill links"
  ON skill_entity_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill links"
  ON skill_entity_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE skill_contexts IS
'Multiple contextual layers per skill. A skill is universal, but can exist in different contexts (work, education, hobby, etc.). Each context has its own intent, confidence, pressure level, and status.';

COMMENT ON TABLE skill_entity_links IS
'Many-to-many linking between skills and entities (habits, goals, projects, etc.). Links can be contextual (tied to a specific skill_context) or global (context_id is null).';

COMMENT ON COLUMN skill_entity_links.context_id IS
'Optional context ID. If null, link is global to the skill. If set, link is specific to that context.';






