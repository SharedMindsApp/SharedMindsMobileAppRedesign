/*
  # Create Insights System Tables

  1. New Tables
    - `weekly_reports`
      - Stores generated weekly summary reports
      - Includes highlights, challenges, achievements
      - AI-generated suggestions and encouragement
    
    - `mood_check_ins`
      - Optional mood tracking for wellbeing insights
      - Links to household members
      - Tracks mood, energy, stress levels
    
    - `contribution_logs`
      - Tracks helpful actions between household members
      - Used for social insights and "top helper" badges
      - Records who helped whom and what type of help

  2. Security
    - Enable RLS on all tables
    - Users can only access data from their households
    - Mood data is private to the individual
*/

-- Create mood_level enum
DO $$ BEGIN
  CREATE TYPE mood_level AS ENUM('very_low','low','neutral','good','excellent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create contribution_type enum
DO $$ BEGIN
  CREATE TYPE contribution_type AS ENUM('task_completion','habit_support','calendar_event','reminder_help','goal_assistance','general_help');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create weekly_reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  total_tasks_completed int DEFAULT 0,
  total_habits_completed int DEFAULT 0,
  total_streak_days int DEFAULT 0,
  total_achievements_unlocked int DEFAULT 0,
  best_day_of_week text,
  household_completion_rate int DEFAULT 0,
  highlights jsonb DEFAULT '[]',
  challenges jsonb DEFAULT '[]',
  suggestions jsonb DEFAULT '[]',
  family_achievement text,
  top_helper_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(household_id, week_start_date)
);

-- Create mood_check_ins table
CREATE TABLE IF NOT EXISTS mood_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  mood mood_level NOT NULL,
  energy_level int CHECK (energy_level >= 1 AND energy_level <= 10),
  stress_level int CHECK (stress_level >= 1 AND stress_level <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, check_in_date)
);

-- Create contribution_logs table
CREATE TABLE IF NOT EXISTS contribution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  helped_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_type contribution_type NOT NULL,
  description text DEFAULT '',
  related_entity_id uuid,
  impact_score int DEFAULT 1 CHECK (impact_score >= 1 AND impact_score <= 10),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_logs ENABLE ROW LEVEL SECURITY;

-- Weekly reports policies
CREATE POLICY "Users can view reports in their household"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "System can create weekly reports"
  ON weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Mood check-ins policies
CREATE POLICY "Users can view own mood check-ins"
  ON mood_check_ins FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own mood check-ins"
  ON mood_check_ins FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own mood check-ins"
  ON mood_check_ins FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Contribution logs policies
CREATE POLICY "Users can view contributions in their household"
  ON contribution_logs FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create contribution logs in their household"
  ON contribution_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    AND helper_id = auth.uid()
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_reports_household ON weekly_reports(household_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start_date);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_profile ON mood_check_ins(profile_id);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_date ON mood_check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_contribution_logs_household ON contribution_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_contribution_logs_helper ON contribution_logs(helper_id);
CREATE INDEX IF NOT EXISTS idx_contribution_logs_helped ON contribution_logs(helped_id);
CREATE INDEX IF NOT EXISTS idx_contribution_logs_date ON contribution_logs(created_at);
