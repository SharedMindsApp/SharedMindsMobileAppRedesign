/*
  # Create Personal Development System

  1. Purpose
    Build a comprehensive Personal Development section that visualises, organises, and reflects data
    from Personal Spaces and Shared Spaces without duplicating data.

  2. Core Principles
    - NO duplicate data - all entries reference existing entities
    - Opt-in sharing (Private or Shared)
    - Single source of truth
    - Human-centered design (no gamification, no streak pressure)

  3. New Tables
    - `personal_dev_goals` - Goal tracking across life domains
    - `personal_dev_motivation_items` - Motivation board cards
    - `personal_dev_hobbies` - Hobbies and interests tracking
    - `personal_dev_milestones` - Life milestones and achievements
    - `personal_dev_growth_checkins` - Qualitative growth tracking
    - `personal_dev_values` - Values and principles
    - `personal_dev_ideas` - Ideas and inspiration
    - `personal_dev_skills` - Skills development tracking

  4. Security
    - Enable RLS on all tables
    - Users can only access their own items or shared space items
    - Granular sharing controls
*/

-- Personal Development Goals
CREATE TABLE IF NOT EXISTS personal_dev_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('personal_growth', 'career', 'health', 'learning', 'relationships', 'other')),
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  linked_habits text[], -- Array of habit IDs
  linked_journal_entries text[], -- Array of journal entry IDs
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Motivation Board Items
CREATE TABLE IF NOT EXISTS personal_dev_motivation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('text', 'quote', 'image', 'affirmation')),
  content text NOT NULL,
  image_url text,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  is_pinned boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Hobbies and Interests
CREATE TABLE IF NOT EXISTS personal_dev_hobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  time_spent_hours numeric DEFAULT 0,
  notes text,
  mood_association text CHECK (mood_association IN ('energizing', 'calming', 'inspiring', 'social', 'solitary', 'neutral')),
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'occasional', 'seasonal')),
  last_practiced_at timestamptz,
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Life Milestones
CREATE TABLE IF NOT EXISTS personal_dev_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reflection text,
  milestone_date date NOT NULL,
  is_approximate_date boolean DEFAULT false,
  category text,
  tags text[],
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Growth Tracking Check-ins
CREATE TABLE IF NOT EXISTS personal_dev_growth_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 10),
  emotional_resilience integer CHECK (emotional_resilience >= 1 AND emotional_resilience <= 10),
  focus_clarity integer CHECK (focus_clarity >= 1 AND focus_clarity <= 10),
  self_trust integer CHECK (self_trust >= 1 AND self_trust <= 10),
  notes text,
  reflection text,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Values and Principles
CREATE TABLE IF NOT EXISTS personal_dev_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  value_name text NOT NULL,
  user_definition text,
  how_it_shows_up text,
  priority_order integer DEFAULT 0,
  linked_goals text[], -- Array of goal IDs
  linked_decisions text[], -- Array of decision/reflection IDs
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ideas and Inspiration
CREATE TABLE IF NOT EXISTS personal_dev_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  tags text[],
  linked_goals text[], -- Array of goal IDs
  linked_projects text[], -- Array of project IDs
  linked_journal_entries text[], -- Array of journal entry IDs
  status text DEFAULT 'captured' CHECK (status IN ('captured', 'exploring', 'active', 'completed', 'archived')),
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Skills Development
CREATE TABLE IF NOT EXISTS personal_dev_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  category text,
  current_level text CHECK (current_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  desired_level text CHECK (desired_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  notes text,
  linked_resources text[], -- Array of resource references
  linked_projects text[], -- Array of project IDs
  practice_log jsonb DEFAULT '[]'::jsonb,
  is_private boolean DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE personal_dev_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_motivation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_growth_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_dev_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_dev_goals
CREATE POLICY "Users can view their own goals or shared goals"
  ON personal_dev_goals FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_goals.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own goals"
  ON personal_dev_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals"
  ON personal_dev_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
  ON personal_dev_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_motivation_items
CREATE POLICY "Users can view their own motivation items or shared items"
  ON personal_dev_motivation_items FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_motivation_items.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own motivation items"
  ON personal_dev_motivation_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own motivation items"
  ON personal_dev_motivation_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own motivation items"
  ON personal_dev_motivation_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_hobbies
CREATE POLICY "Users can view their own hobbies or shared hobbies"
  ON personal_dev_hobbies FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_hobbies.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own hobbies"
  ON personal_dev_hobbies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own hobbies"
  ON personal_dev_hobbies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own hobbies"
  ON personal_dev_hobbies FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_milestones
CREATE POLICY "Users can view their own milestones or shared milestones"
  ON personal_dev_milestones FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_milestones.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own milestones"
  ON personal_dev_milestones FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own milestones"
  ON personal_dev_milestones FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own milestones"
  ON personal_dev_milestones FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_growth_checkins
CREATE POLICY "Users can view their own growth check-ins"
  ON personal_dev_growth_checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own growth check-ins"
  ON personal_dev_growth_checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own growth check-ins"
  ON personal_dev_growth_checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own growth check-ins"
  ON personal_dev_growth_checkins FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_values
CREATE POLICY "Users can view their own values or shared values"
  ON personal_dev_values FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_values.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own values"
  ON personal_dev_values FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own values"
  ON personal_dev_values FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own values"
  ON personal_dev_values FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_ideas
CREATE POLICY "Users can view their own ideas or shared ideas"
  ON personal_dev_ideas FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_ideas.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own ideas"
  ON personal_dev_ideas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas"
  ON personal_dev_ideas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas"
  ON personal_dev_ideas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for personal_dev_skills
CREATE POLICY "Users can view their own skills or shared skills"
  ON personal_dev_skills FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      shared_space_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM space_members
        WHERE space_members.space_id = personal_dev_skills.shared_space_id
        AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND space_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert their own skills"
  ON personal_dev_skills FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skills"
  ON personal_dev_skills FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own skills"
  ON personal_dev_skills FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_dev_goals_user_id ON personal_dev_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_goals_shared_space_id ON personal_dev_goals(shared_space_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_motivation_items_user_id ON personal_dev_motivation_items(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_hobbies_user_id ON personal_dev_hobbies(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_milestones_user_id ON personal_dev_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_growth_checkins_user_id ON personal_dev_growth_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_values_user_id ON personal_dev_values(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_ideas_user_id ON personal_dev_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dev_skills_user_id ON personal_dev_skills(user_id);