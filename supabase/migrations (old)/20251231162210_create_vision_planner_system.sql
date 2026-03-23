/*
  # Vision Planner System

  1. New Tables
    - `vision_life_statements`
      - Core life vision with timestamped revisions
      - Freeform statement and optional prompts
    
    - `vision_long_term_goals`
      - High-level, non-task-based goals
      - Time horizons and intent notes
    
    - `vision_five_year_outlook`
      - 5-year snapshot across life domains
      - Narrative-style with confidence levels
    
    - `vision_areas`
      - Life domains with vision statements
      - Current vs desired reflections
    
    - `vision_board_items`
      - Visual inspiration blocks
      - Images, captions, layout data
    
    - `vision_monthly_checkins`
      - Lightweight recurring reflections
      - Alignment tracking
    
    - `vision_career_purpose`
      - Career direction and themes
      - Skills, impact, narrative
    
    - `vision_relationships`
      - Relationship clarity and intentions
      - Boundaries and values
    
    - `vision_values`
      - Core values with descriptions
      - Alignment checks

  2. Security
    - Enable RLS on all tables
    - Users can only access their own vision data

  3. Integration Points
    - Links to Journal entries
    - Referenced by Guardrails (read-only)
    - Feeds into Planning sections
*/

-- Life Vision Statements
CREATE TABLE IF NOT EXISTS vision_life_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  statement text,
  what_good_life_looks_like text,
  want_more_of text,
  want_less_of text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Long-Term Goals
CREATE TABLE IF NOT EXISTS vision_long_term_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  time_horizon text CHECK (time_horizon IN ('1-3_years', '5_plus_years')),
  category text CHECK (category IN ('career', 'personal', 'health', 'relationships', 'financial', 'learning', 'other')),
  intent_notes text,
  status text DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'evolving', 'paused')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-Year Outlook
CREATE TABLE IF NOT EXISTS vision_five_year_outlook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lifestyle_vision text,
  lifestyle_confidence integer DEFAULT 50 CHECK (lifestyle_confidence >= 0 AND lifestyle_confidence <= 100),
  work_income_vision text,
  work_income_confidence integer DEFAULT 50 CHECK (work_income_confidence >= 0 AND work_income_confidence <= 100),
  home_environment_vision text,
  home_environment_confidence integer DEFAULT 50 CHECK (home_environment_confidence >= 0 AND home_environment_confidence <= 100),
  relationships_vision text,
  relationships_confidence integer DEFAULT 50 CHECK (relationships_confidence >= 0 AND relationships_confidence <= 100),
  health_energy_vision text,
  health_energy_confidence integer DEFAULT 50 CHECK (health_energy_confidence >= 0 AND health_energy_confidence <= 100),
  overall_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vision Areas (Life Domains)
CREATE TABLE IF NOT EXISTS vision_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area_name text NOT NULL,
  area_type text DEFAULT 'custom' CHECK (area_type IN ('personal_growth', 'career_work', 'health_wellbeing', 'relationships_social', 'finances_security', 'home_lifestyle', 'learning_creativity', 'custom')),
  vision_statement text,
  current_state text,
  desired_state text,
  notes text,
  is_visible boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vision Board Items
CREATE TABLE IF NOT EXISTS vision_board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  caption text,
  quote text,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 1,
  height integer DEFAULT 1,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Monthly Vision Check-Ins
CREATE TABLE IF NOT EXISTS vision_monthly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checkin_date date NOT NULL,
  what_felt_aligned text,
  what_didnt_feel_aligned text,
  small_adjustment text,
  overall_feeling text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Career & Purpose Vision
CREATE TABLE IF NOT EXISTS vision_career_purpose (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  desired_work_themes text,
  impact_preferences text,
  skills_to_grow text,
  career_narrative text,
  what_matters_most text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relationship Vision
CREATE TABLE IF NOT EXISTS vision_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  what_matters text,
  boundaries_non_negotiables text,
  how_to_show_up text,
  long_term_intentions text,
  relationship_values text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Values Alignment
CREATE TABLE IF NOT EXISTS vision_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  value_name text NOT NULL,
  description text,
  what_it_means_to_me text,
  current_alignment_feeling text,
  priority_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_life_statements_user ON vision_life_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_life_statements_active ON vision_life_statements(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_long_term_goals_user ON vision_long_term_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_five_year_outlook_user ON vision_five_year_outlook(user_id);
CREATE INDEX IF NOT EXISTS idx_vision_areas_user ON vision_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_vision_areas_visible ON vision_areas(user_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_vision_board_user ON vision_board_items(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_checkins_user ON vision_monthly_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_checkins_date ON vision_monthly_checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_career_purpose_user ON vision_career_purpose(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user ON vision_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_values_user ON vision_values(user_id);
CREATE INDEX IF NOT EXISTS idx_values_active ON vision_values(user_id, is_active);

-- Enable RLS
ALTER TABLE vision_life_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_long_term_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_five_year_outlook ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_monthly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_career_purpose ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Life Statements
CREATE POLICY "Users can view own life statements"
  ON vision_life_statements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own life statements"
  ON vision_life_statements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own life statements"
  ON vision_life_statements FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own life statements"
  ON vision_life_statements FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Long-Term Goals
CREATE POLICY "Users can view own long-term goals"
  ON vision_long_term_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own long-term goals"
  ON vision_long_term_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own long-term goals"
  ON vision_long_term_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own long-term goals"
  ON vision_long_term_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for 5-Year Outlook
CREATE POLICY "Users can view own 5-year outlook"
  ON vision_five_year_outlook FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own 5-year outlook"
  ON vision_five_year_outlook FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own 5-year outlook"
  ON vision_five_year_outlook FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own 5-year outlook"
  ON vision_five_year_outlook FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Vision Areas
CREATE POLICY "Users can view own vision areas"
  ON vision_areas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vision areas"
  ON vision_areas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vision areas"
  ON vision_areas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vision areas"
  ON vision_areas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Vision Board
CREATE POLICY "Users can view own vision board"
  ON vision_board_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vision board items"
  ON vision_board_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vision board items"
  ON vision_board_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vision board items"
  ON vision_board_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Monthly Check-Ins
CREATE POLICY "Users can view own monthly check-ins"
  ON vision_monthly_checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own monthly check-ins"
  ON vision_monthly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own monthly check-ins"
  ON vision_monthly_checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own monthly check-ins"
  ON vision_monthly_checkins FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Career Purpose
CREATE POLICY "Users can view own career purpose"
  ON vision_career_purpose FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own career purpose"
  ON vision_career_purpose FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own career purpose"
  ON vision_career_purpose FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own career purpose"
  ON vision_career_purpose FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Relationships
CREATE POLICY "Users can view own relationship vision"
  ON vision_relationships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own relationship vision"
  ON vision_relationships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own relationship vision"
  ON vision_relationships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own relationship vision"
  ON vision_relationships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for Values
CREATE POLICY "Users can view own values"
  ON vision_values FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own values"
  ON vision_values FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own values"
  ON vision_values FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own values"
  ON vision_values FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());