/*
  # Stage 2.1: Reflection Layer (User Meaning, Zero Interpretation)

  1. New Tables
    - `reflection_entries`
      - User-authored reflections on insights or standalone
      - Write-only for system (NO analysis, NO interpretation)
      - Mutable and deletable (unlike Stage 0)
      - Optional linking to signals, projects, spaces
      - User-defined tags (no predefined taxonomy)
      - Self-reported context (mood, energy, etc.)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own reflections
    - Reflections are private by default

  3. Stage 2.1 Principles
    - User-owned meaning-making space
    - System NEVER interprets reflections
    - NO sentiment analysis, NO theme extraction
    - NO feeding into signals or automation
    - Optional (never required)
    - Available even when Safe Mode is ON

  4. Critical Constraints
    - NO NLP or AI analysis on reflection content
    - NO summarization or pattern detection
    - NO "insights from your reflections"
    - NO required for progress or unlocking features
    - NOT append-only (user can edit/delete)
*/

-- ==============================================================================
-- REFLECTION ENTRIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS reflection_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core reflection content
  content text NOT NULL,
  
  -- Optional linking (nullable)
  linked_signal_id uuid REFERENCES candidate_signals(signal_id) ON DELETE SET NULL,
  linked_project_id uuid REFERENCES master_projects(id) ON DELETE SET NULL,
  linked_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- User-defined tags (no predefined taxonomy)
  user_tags text[] DEFAULT '{}',
  
  -- Self-reported context (optional, user-defined structure)
  -- Example: {"mood": "5", "energy": "low", "context": "after meeting"}
  self_reported_context jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Soft delete (user can delete, but we keep for safety)
  deleted_at timestamptz,
  
  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Indexes for efficient queries
CREATE INDEX idx_reflection_entries_user_id ON reflection_entries(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reflection_entries_signal_id ON reflection_entries(linked_signal_id) WHERE deleted_at IS NULL AND linked_signal_id IS NOT NULL;
CREATE INDEX idx_reflection_entries_project_id ON reflection_entries(linked_project_id) WHERE deleted_at IS NULL AND linked_project_id IS NOT NULL;
CREATE INDEX idx_reflection_entries_user_tags ON reflection_entries USING gin(user_tags) WHERE deleted_at IS NULL;

COMMENT ON TABLE reflection_entries IS 'Stage 2.1: User-authored reflections (NO system interpretation, write-only for system)';
COMMENT ON COLUMN reflection_entries.content IS 'Free-text reflection - NEVER analysed by system';
COMMENT ON COLUMN reflection_entries.linked_signal_id IS 'Optional link to insight (nullable, not required)';
COMMENT ON COLUMN reflection_entries.user_tags IS 'User-defined tags (no predefined taxonomy)';
COMMENT ON COLUMN reflection_entries.self_reported_context IS 'Optional mood/energy/context (user-defined, NO interpretation)';
COMMENT ON COLUMN reflection_entries.deleted_at IS 'Soft delete timestamp (user can delete, we keep for safety)';

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE reflection_entries ENABLE ROW LEVEL SECURITY;

-- Users can view own reflections (excluding soft-deleted)
CREATE POLICY "Users can view own reflections"
  ON reflection_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can insert own reflections
CREATE POLICY "Users can insert own reflections"
  ON reflection_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own reflections
CREATE POLICY "Users can update own reflections"
  ON reflection_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can soft-delete own reflections
CREATE POLICY "Users can delete own reflections"
  ON reflection_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Soft delete reflection
CREATE OR REPLACE FUNCTION soft_delete_reflection(p_reflection_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot delete reflections for other users';
  END IF;
  
  UPDATE reflection_entries
  SET deleted_at = now(),
      updated_at = now()
  WHERE id = p_reflection_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION soft_delete_reflection IS 'Stage 2.1: Soft delete reflection (user can delete)';

-- Update reflection timestamp on edit
CREATE OR REPLACE FUNCTION update_reflection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_reflection_timestamp
  BEFORE UPDATE ON reflection_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_reflection_timestamp();

COMMENT ON TRIGGER trigger_update_reflection_timestamp ON reflection_entries IS 'Stage 2.1: Update timestamp on reflection edit';

-- ==============================================================================
-- IMPORTANT CONSTRAINTS (ARCHITECTURAL)
-- ==============================================================================

/*
  CRITICAL: The following operations are FORBIDDEN on reflection_entries:

  ❌ NO sentiment analysis or NLP
  ❌ NO theme extraction or pattern detection
  ❌ NO summarization or clustering
  ❌ NO feeding reflection content into signals
  ❌ NO AI analysis of any kind
  ❌ NO "insights from your reflections"
  ❌ NO search suggestions or autocomplete based on content
  
  Reflections are:
  ✅ User-owned
  ✅ Write-only for system (system never interprets)
  ✅ Mutable (user can edit)
  ✅ Deletable (user can delete)
  ✅ Private by default
  ✅ Optional (never required)
  
  This table exists for human cognition, not algorithms.
*/
