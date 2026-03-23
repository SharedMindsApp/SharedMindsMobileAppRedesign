/*
  # Create Behaviour Engine Tables

  1. New Tables
    - `habits`
      - Tracks household habits with scheduling and assignment
      - Links to goals for progress tracking
      - Supports daily, weekly, monthly, and custom repeat patterns
    
    - `habit_entries`
      - Records habit completions per user per date
      - Tracks streaks and consistency
      - Unique constraint ensures one entry per habit/user/date
    
    - `achievement_logs`
      - Stores achievement unlock events
      - Tracks streaks, milestones, goal progress
      - Links to habits and goals
    
    - `achievements_meta`
      - Defines all available achievements
      - Categories: streaks, habits, goals, consistency, calendar
      - Pre-populated with 20+ default achievements

  2. Security
    - Enable RLS on all tables
    - Users can only access data from their households
    - Completion entries tied to authenticated users
*/

-- Create repeat_type enum
DO $$ BEGIN
  CREATE TYPE repeat_type AS ENUM('daily','weekly','monthly','custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_type enum
DO $$ BEGIN
  CREATE TYPE achievement_type AS ENUM('streak','milestone','goal_progress','habit_mastery','calendar_consistency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_category enum
DO $$ BEGIN
  CREATE TYPE achievement_category AS ENUM('streaks','habits','goals','consistency','calendar');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to uuid[] DEFAULT '{}',
  goal_id uuid REFERENCES household_goals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  repeat_type repeat_type NOT NULL DEFAULT 'daily',
  repeat_config jsonb DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  color text DEFAULT 'blue',
  reset_on_miss boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_habit_dates CHECK (ends_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT valid_color CHECK (color IN ('blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink'))
);

-- Create habit_entries table
CREATE TABLE IF NOT EXISTS habit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  completed boolean DEFAULT true,
  completed_at timestamptz DEFAULT now(),
  notes text DEFAULT '',
  UNIQUE(habit_id, profile_id, entry_date)
);

-- Create achievement_logs table
CREATE TABLE IF NOT EXISTS achievement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES habits(id) ON DELETE SET NULL,
  goal_id uuid REFERENCES household_goals(id) ON DELETE SET NULL,
  type achievement_type NOT NULL,
  label text NOT NULL,
  value int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create achievements_meta table
CREATE TABLE IF NOT EXISTS achievements_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  threshold int NOT NULL,
  category achievement_category NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Populate achievements_meta with default achievements
INSERT INTO achievements_meta (code, title, description, icon, threshold, category) VALUES
  -- Streak Achievements
  ('STREAK_3', '3-Day Streak', 'Complete a habit for 3 days in a row', '🔥', 3, 'streaks'),
  ('STREAK_7', 'Week Warrior', 'Complete a habit for 7 days in a row', '💪', 7, 'streaks'),
  ('STREAK_14', 'Two Week Champion', 'Complete a habit for 14 days in a row', '⭐', 14, 'streaks'),
  ('STREAK_30', 'Monthly Master', 'Complete a habit for 30 days in a row', '🏆', 30, 'streaks'),
  ('STREAK_60', 'Unstoppable', 'Complete a habit for 60 days in a row', '💎', 60, 'streaks'),
  ('STREAK_100', 'Century Club', 'Complete a habit for 100 days in a row', '👑', 100, 'streaks'),
  
  -- Habit Completion Achievements
  ('COMPLETIONS_10', 'Getting Started', 'Complete any habit 10 times', '🌱', 10, 'habits'),
  ('COMPLETIONS_25', 'Building Momentum', 'Complete any habit 25 times', '🚀', 25, 'habits'),
  ('COMPLETIONS_50', 'Halfway Hero', 'Complete any habit 50 times', '🎯', 50, 'habits'),
  ('COMPLETIONS_100', 'Habit Master', 'Complete any habit 100 times', '🏅', 100, 'habits'),
  ('COMPLETIONS_250', 'Legendary', 'Complete any habit 250 times', '⚡', 250, 'habits'),
  
  -- Goal Achievements
  ('GOAL_25', 'Quarter Way There', 'Reach 25% progress on a goal', '📈', 25, 'goals'),
  ('GOAL_50', 'Halfway Point', 'Reach 50% progress on a goal', '🎉', 50, 'goals'),
  ('GOAL_75', 'Almost There', 'Reach 75% progress on a goal', '🌟', 75, 'goals'),
  ('GOAL_100', 'Goal Crusher', 'Complete a goal', '🎊', 100, 'goals'),
  
  -- Consistency Achievements
  ('ALL_TODAY', 'Perfect Day', 'Complete all habits for today', '✨', 1, 'consistency'),
  ('ALL_WEEK', 'Perfect Week', 'Complete all habits every day for a week', '🌈', 7, 'consistency'),
  ('FIRST_HABIT', 'First Step', 'Complete your first habit', '👣', 1, 'consistency'),
  
  -- Calendar Achievements
  ('CALENDAR_WEEK', 'Calendar Pro', 'Complete all calendar events for a week', '📅', 7, 'calendar'),
  ('FIRST_EVENT', 'Event Master', 'Complete your first calendar event', '📌', 1, 'calendar')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements_meta ENABLE ROW LEVEL SECURITY;

-- Habits policies
CREATE POLICY "Users can view habits in their household"
  ON habits FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create habits in their household"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update habits they created"
  ON habits FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete habits they created"
  ON habits FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Habit entries policies
CREATE POLICY "Users can view entries in their household"
  ON habit_entries FOR SELECT
  TO authenticated
  USING (
    habit_id IN (
      SELECT id FROM habits WHERE household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Users can create their own entries"
  ON habit_entries FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own entries"
  ON habit_entries FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
  ON habit_entries FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Achievement logs policies
CREATE POLICY "Users can view achievements in their household"
  ON achievement_logs FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "System can create achievement logs"
  ON achievement_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Achievements meta policies (read-only for users)
CREATE POLICY "Anyone can view achievement definitions"
  ON achievements_meta FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_household ON habits(household_id);
CREATE INDEX IF NOT EXISTS idx_habits_created_by ON habits(created_by);
CREATE INDEX IF NOT EXISTS idx_habits_goal ON habits(goal_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit ON habit_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_profile ON habit_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_household ON achievement_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_profile ON achievement_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_habit ON achievement_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_achievement_logs_goal ON achievement_logs(goal_id);
