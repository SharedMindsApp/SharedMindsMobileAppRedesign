/*
  # Create Personal Growth Features (Linked, Non-Duplicative)

  1. New Tables
    - hobbies_interests: Joy, curiosity, and identity beyond productivity
    - values_principles: Anchor decisions, goals, and behaviour to identity
    - ideas_inspiration: Capture sparks without obligation
    - personal_habits: Personal habit tracking with reflection (separate from household habits)
    - habit_completions: Non-streak completion tracking

  2. Key Principles
    - Single source of truth in Personal Spaces / Shared Spaces
    - Opt-in sharing (private by default)
    - No gamification (no streaks, scores, rankings)
    - Human, reflective language
    - Integration with Skills, Goals, Journal, Planning

  3. Security
    - Enable RLS on all tables
    - Private by default
    - Optional sharing to Shared Spaces

  This creates a calm, pressure-free personal growth system.
*/

-- ============================================================================
-- HOBBIES & INTERESTS (Joy, Curiosity, Identity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hobbies_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core data
  name text NOT NULL,
  description text,
  
  -- Categorisation (optional)
  category text CHECK (category IN ('creative', 'physical', 'social', 'intellectual', 'relaxation')),
  
  -- Reflective notes
  why_i_enjoy text,
  how_it_makes_me_feel text,
  
  -- Time engagement (qualitative, not tracked)
  engagement_level text CHECK (engagement_level IN ('occasional', 'regular', 'frequent', 'deep_focus')),
  
  -- Linking
  linked_skills uuid[],
  linked_self_care uuid[],
  linked_social_activities uuid[],
  
  -- Sharing
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hobbies_interests_user_id ON hobbies_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_hobbies_interests_category ON hobbies_interests(user_id, category);
CREATE INDEX IF NOT EXISTS idx_hobbies_interests_shared_space ON hobbies_interests(shared_space_id) WHERE shared_space_id IS NOT NULL;

-- Enable RLS
ALTER TABLE hobbies_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own hobbies"
  ON hobbies_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own hobbies"
  ON hobbies_interests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own hobbies"
  ON hobbies_interests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own hobbies"
  ON hobbies_interests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Space members can view shared hobbies
CREATE POLICY "Space members can view shared hobbies"
  ON hobbies_interests FOR SELECT
  TO authenticated
  USING (
    shared_space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = hobbies_interests.shared_space_id
      AND space_members.user_id = auth.uid()
      AND space_members.status = 'accepted'
    )
  );

-- ============================================================================
-- VALUES & PRINCIPLES (Identity, Decisions, Behaviour)
-- ============================================================================

CREATE TABLE IF NOT EXISTS values_principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core data
  name text NOT NULL,
  personal_definition text,
  how_it_shows_up text,
  
  -- Examples and evidence
  example_moments jsonb DEFAULT '[]'::jsonb,
  
  -- Priority (soft, not ranked)
  importance_level text CHECK (importance_level IN ('foundational', 'important', 'emerging', 'exploring')),
  
  -- Linking
  linked_goals uuid[],
  linked_skills uuid[],
  linked_decisions text[],
  linked_vision_themes uuid[],
  
  -- Sharing
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  share_level text CHECK (share_level IN ('name_only', 'full')) DEFAULT 'full',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_values_principles_user_id ON values_principles(user_id);
CREATE INDEX IF NOT EXISTS idx_values_principles_importance ON values_principles(user_id, importance_level);
CREATE INDEX IF NOT EXISTS idx_values_principles_shared_space ON values_principles(shared_space_id) WHERE shared_space_id IS NOT NULL;

-- Enable RLS
ALTER TABLE values_principles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own values"
  ON values_principles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own values"
  ON values_principles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own values"
  ON values_principles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own values"
  ON values_principles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Space members can view shared values
CREATE POLICY "Space members can view shared values"
  ON values_principles FOR SELECT
  TO authenticated
  USING (
    shared_space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = values_principles.shared_space_id
      AND space_members.user_id = auth.uid()
      AND space_members.status = 'accepted'
    )
  );

-- ============================================================================
-- IDEAS & INSPIRATION (Capture Sparks, No Pressure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ideas_inspiration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core data
  title text NOT NULL,
  description text,
  
  -- Content
  content_type text CHECK (content_type IN ('text', 'link', 'image')) DEFAULT 'text',
  content_data jsonb,
  
  -- Tagging
  tags text[],
  
  -- Status (exploratory, not prescriptive)
  status text CHECK (status IN ('just_a_thought', 'exploring', 'ready_to_act')) DEFAULT 'just_a_thought',
  
  -- Reflection
  captured_because text,
  energy_level text CHECK (energy_level IN ('curious', 'excited', 'inspired', 'urgent')),
  
  -- Linking
  linked_goals uuid[],
  linked_projects uuid[],
  linked_skills uuid[],
  linked_journal_entries uuid[],
  
  -- Promotion tracking (if converted)
  promoted_to text,
  promoted_at timestamptz,
  promoted_reference_id uuid,
  
  -- Sharing
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ideas_inspiration_user_id ON ideas_inspiration(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_inspiration_status ON ideas_inspiration(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ideas_inspiration_tags ON ideas_inspiration USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_ideas_inspiration_shared_space ON ideas_inspiration(shared_space_id) WHERE shared_space_id IS NOT NULL;

-- Enable RLS
ALTER TABLE ideas_inspiration ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ideas"
  ON ideas_inspiration FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own ideas"
  ON ideas_inspiration FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas"
  ON ideas_inspiration FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas"
  ON ideas_inspiration FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Space members can view shared ideas
CREATE POLICY "Space members can view shared ideas"
  ON ideas_inspiration FOR SELECT
  TO authenticated
  USING (
    shared_space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = ideas_inspiration.shared_space_id
      AND space_members.user_id = auth.uid()
      AND space_members.status = 'accepted'
    )
  );

-- ============================================================================
-- PERSONAL HABITS (Reflection, No Streaks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS personal_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core data
  name text NOT NULL,
  description text,
  
  -- Category
  category text CHECK (category IN ('health', 'mental', 'home', 'learning', 'relationships', 'creative')),
  
  -- Frequency (flexible, not rigid)
  frequency_type text CHECK (frequency_type IN ('daily', 'weekly', 'flexible', 'rhythm')),
  frequency_description text, -- "Most mornings" or "When I feel like it"
  
  -- Reflection
  reflection_notes text,
  what_helps text, -- "What helps me do this?"
  what_gets_in_way text, -- "What makes this harder?"
  
  -- Linking
  linked_goals uuid[],
  linked_skills uuid[],
  linked_self_care uuid[],
  linked_values uuid[], -- Link to values_principles
  
  -- Sharing
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_habits_user_id ON personal_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_habits_category ON personal_habits(user_id, category);
CREATE INDEX IF NOT EXISTS idx_personal_habits_active ON personal_habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_personal_habits_shared_space ON personal_habits(shared_space_id) WHERE shared_space_id IS NOT NULL;

-- Enable RLS
ALTER TABLE personal_habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own personal habits"
  ON personal_habits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own personal habits"
  ON personal_habits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own personal habits"
  ON personal_habits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own personal habits"
  ON personal_habits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Space members can view shared habits
CREATE POLICY "Space members can view shared personal habits"
  ON personal_habits FOR SELECT
  TO authenticated
  USING (
    shared_space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = personal_habits.shared_space_id
      AND space_members.user_id = auth.uid()
      AND space_members.status = 'accepted'
    )
  );

-- ============================================================================
-- HABIT COMPLETIONS (Non-Streak Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES personal_habits(id) ON DELETE CASCADE,
  
  -- Completion data
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_date date NOT NULL DEFAULT current_date,
  
  -- Reflection (qualitative, not scored)
  felt_like text,
  context_notes text,
  energy_level text CHECK (energy_level IN ('depleted', 'low', 'moderate', 'high')),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate completions per day
  UNIQUE(habit_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON habit_completions(user_id, completion_date DESC);

-- Enable RLS
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_completions
CREATE POLICY "Users can view their own habit completions"
  ON habit_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own habit completions"
  ON habit_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own habit completions"
  ON habit_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own habit completions"
  ON habit_completions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- HELPER VIEWS (Optional, for performance)
-- ============================================================================

-- View for habit consistency (trend, not streak)
CREATE OR REPLACE VIEW habit_consistency_view AS
SELECT 
  h.id as habit_id,
  h.user_id,
  h.name as habit_name,
  COUNT(DISTINCT hc.completion_date) FILTER (WHERE hc.completion_date >= current_date - interval '30 days') as completed_days_last_30,
  MAX(hc.completion_date) as last_completed,
  COUNT(DISTINCT hc.completion_date) FILTER (WHERE hc.completion_date >= current_date - interval '7 days') as completed_days_last_7
FROM personal_habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id
GROUP BY h.id, h.user_id, h.name;

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at for hobbies_interests
CREATE OR REPLACE FUNCTION update_hobbies_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hobbies_interests_updated_at_trigger
  BEFORE UPDATE ON hobbies_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_hobbies_interests_updated_at();

-- Auto-update updated_at for values_principles
CREATE OR REPLACE FUNCTION update_values_principles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER values_principles_updated_at_trigger
  BEFORE UPDATE ON values_principles
  FOR EACH ROW
  EXECUTE FUNCTION update_values_principles_updated_at();

-- Auto-update updated_at for ideas_inspiration
CREATE OR REPLACE FUNCTION update_ideas_inspiration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_inspiration_updated_at_trigger
  BEFORE UPDATE ON ideas_inspiration
  FOR EACH ROW
  EXECUTE FUNCTION update_ideas_inspiration_updated_at();

-- Auto-update updated_at for personal_habits
CREATE OR REPLACE FUNCTION update_personal_habits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personal_habits_updated_at_trigger
  BEFORE UPDATE ON personal_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();
