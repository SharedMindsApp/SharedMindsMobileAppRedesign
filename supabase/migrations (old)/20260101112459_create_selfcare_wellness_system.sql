/*
  # Create Self-Care & Wellness System

  ## Summary
  Creates a comprehensive self-care and wellness tracking system that is private by default
  with opt-in sharing to Shared Spaces. Supports physical, mental, and emotional wellbeing
  without clinical framing or judgment.

  ## New Tables
  1. `wellness_goals` - Gentle wellbeing intentions
  2. `exercise_entries` - Movement tracking without obsession
  3. `nutrition_logs` - Awareness-based meal logging
  4. `sleep_logs` - Rest quality tracking
  5. `mental_health_checkins` - Emotional awareness entries
  6. `mindfulness_sessions` - Meditation and presence practices
  7. `selfcare_routines` - Repeatable care habits
  8. `gratitude_entries` - Positive awareness journaling
  9. `beauty_routines` - Self-maintenance tracking
  10. `rest_recovery_logs` - Intentional rest tracking
  11. `wellness_shares` - Privacy control for sharing to spaces

  ## Key Principles
  - All data private by default
  - Explicit opt-in sharing only
  - No clinical/diagnostic language
  - No streak enforcement
  - Supportive, judgment-free design

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Sharing requires explicit consent
  - Read-only access for shared data
*/

-- Step 1: Create wellness_goals table
CREATE TABLE IF NOT EXISTS wellness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('physical', 'mental', 'emotional', 'social')),
  timeframe text,
  reflection text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create exercise_entries table
CREATE TABLE IF NOT EXISTS exercise_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  duration_minutes integer,
  intensity text CHECK (intensity IN ('low', 'medium', 'high')),
  notes text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create nutrition_logs table
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  content text NOT NULL,
  tags text[],
  mood_note text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Create sleep_logs table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  duration_hours numeric(4,2),
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Step 5: Create mental_health_checkins table
CREATE TABLE IF NOT EXISTS mental_health_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  checkin_time time NOT NULL DEFAULT CURRENT_TIME,
  mood text NOT NULL,
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 5),
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 6: Create mindfulness_sessions table
CREATE TABLE IF NOT EXISTS mindfulness_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  session_type text NOT NULL,
  duration_minutes integer,
  reflection text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 7: Create selfcare_routines table
CREATE TABLE IF NOT EXISTS selfcare_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  routine_name text NOT NULL,
  activities jsonb NOT NULL DEFAULT '[]',
  frequency text,
  reminder_enabled boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 8: Create selfcare_routine_completions table
CREATE TABLE IF NOT EXISTS selfcare_routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES selfcare_routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 9: Create gratitude_entries table
CREATE TABLE IF NOT EXISTS gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  format text DEFAULT 'free_write' CHECK (format IN ('free_write', 'bullets')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 10: Create beauty_routines table
CREATE TABLE IF NOT EXISTS beauty_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  routine_name text NOT NULL,
  routine_type text CHECK (routine_type IN ('morning', 'evening', 'weekly', 'other')),
  steps jsonb NOT NULL DEFAULT '[]',
  products jsonb DEFAULT '[]',
  frequency text,
  last_completed date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 11: Create rest_recovery_logs table
CREATE TABLE IF NOT EXISTS rest_recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  log_type text NOT NULL CHECK (log_type IN ('rest_block', 'recovery_day', 'burnout_note')),
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 12: Create wellness_shares table for privacy control
CREATE TABLE IF NOT EXISTS wellness_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  share_type text NOT NULL,
  entity_id uuid NOT NULL,
  share_mode text NOT NULL CHECK (share_mode IN ('none', 'summary', 'full')),
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, space_id, share_type)
);

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wellness_goals_user ON wellness_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_entries_user_date ON exercise_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_mental_health_checkins_user_date ON mental_health_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_mindfulness_sessions_user_date ON mindfulness_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_selfcare_routines_user ON selfcare_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_date ON gratitude_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_beauty_routines_user ON beauty_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_rest_recovery_logs_user_date ON rest_recovery_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_shares_user ON wellness_shares(user_id);

-- Step 14: Enable RLS on all tables
ALTER TABLE wellness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindfulness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfcare_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfcare_routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rest_recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_shares ENABLE ROW LEVEL SECURITY;

-- Step 15: Create RLS policies (all data private by default)

-- Wellness Goals Policies
CREATE POLICY "Users can view own wellness goals"
  ON wellness_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wellness goals"
  ON wellness_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wellness goals"
  ON wellness_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wellness goals"
  ON wellness_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Exercise Entries Policies
CREATE POLICY "Users can view own exercise entries"
  ON exercise_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exercise entries"
  ON exercise_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise entries"
  ON exercise_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise entries"
  ON exercise_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Nutrition Logs Policies
CREATE POLICY "Users can view own nutrition logs"
  ON nutrition_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own nutrition logs"
  ON nutrition_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition logs"
  ON nutrition_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition logs"
  ON nutrition_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sleep Logs Policies
CREATE POLICY "Users can view own sleep logs"
  ON sleep_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sleep logs"
  ON sleep_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs"
  ON sleep_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep logs"
  ON sleep_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Mental Health Check-ins Policies (most private)
CREATE POLICY "Users can view own mental health checkins"
  ON mental_health_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mental health checkins"
  ON mental_health_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mental health checkins"
  ON mental_health_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mental health checkins"
  ON mental_health_checkins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Mindfulness Sessions Policies
CREATE POLICY "Users can view own mindfulness sessions"
  ON mindfulness_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mindfulness sessions"
  ON mindfulness_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mindfulness sessions"
  ON mindfulness_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mindfulness sessions"
  ON mindfulness_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Self-Care Routines Policies
CREATE POLICY "Users can view own selfcare routines"
  ON selfcare_routines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own selfcare routines"
  ON selfcare_routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own selfcare routines"
  ON selfcare_routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own selfcare routines"
  ON selfcare_routines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Self-Care Routine Completions Policies
CREATE POLICY "Users can view own routine completions"
  ON selfcare_routine_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routine completions"
  ON selfcare_routine_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routine completions"
  ON selfcare_routine_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Gratitude Entries Policies
CREATE POLICY "Users can view own gratitude entries"
  ON gratitude_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own gratitude entries"
  ON gratitude_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gratitude entries"
  ON gratitude_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gratitude entries"
  ON gratitude_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Beauty Routines Policies
CREATE POLICY "Users can view own beauty routines"
  ON beauty_routines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own beauty routines"
  ON beauty_routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own beauty routines"
  ON beauty_routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own beauty routines"
  ON beauty_routines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Rest & Recovery Logs Policies
CREATE POLICY "Users can view own rest recovery logs"
  ON rest_recovery_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rest recovery logs"
  ON rest_recovery_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rest recovery logs"
  ON rest_recovery_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rest recovery logs"
  ON rest_recovery_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Wellness Shares Policies
CREATE POLICY "Users can view own wellness shares"
  ON wellness_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wellness shares"
  ON wellness_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wellness shares"
  ON wellness_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wellness shares"
  ON wellness_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);