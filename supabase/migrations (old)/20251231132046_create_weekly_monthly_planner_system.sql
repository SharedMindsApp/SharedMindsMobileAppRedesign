/*
  # Create Weekly and Monthly Planner System

  1. New Tables
    - `weekly_planner_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `week_start_date` (date, Monday of the week)
      - `notes` (text, weekly notes)
      - `goals` (jsonb, array of goals)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weekly_planner_events`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, foreign key to weekly_planner_entries)
      - `day_of_week` (integer, 0-6 for Mon-Sun)
      - `hour` (integer, hour of day 0-23)
      - `title` (text)
      - `description` (text)
      - `duration_minutes` (integer, default 60)
      - `color` (text, hex color)
      - `created_at` (timestamptz)

    - `monthly_planner_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `year` (integer)
      - `month` (integer, 1-12)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `monthly_planner_todos`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, foreign key to monthly_planner_entries)
      - `title` (text)
      - `completed` (boolean)
      - `order_index` (integer)
      - `created_at` (timestamptz)

    - `monthly_planner_events`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, foreign key to monthly_planner_entries)
      - `date` (date)
      - `title` (text)
      - `description` (text)
      - `color` (text, hex color)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own entries
*/

-- Create weekly planner entries table
CREATE TABLE IF NOT EXISTS weekly_planner_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  notes text DEFAULT '',
  goals jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create weekly planner events table
CREATE TABLE IF NOT EXISTS weekly_planner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES weekly_planner_entries(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour integer NOT NULL CHECK (hour >= 0 AND hour <= 23),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  duration_minutes integer DEFAULT 60 CHECK (duration_minutes > 0),
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Create monthly planner entries table
CREATE TABLE IF NOT EXISTS monthly_planner_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Create monthly planner todos table
CREATE TABLE IF NOT EXISTS monthly_planner_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES monthly_planner_entries(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create monthly planner events table
CREATE TABLE IF NOT EXISTS monthly_planner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES monthly_planner_entries(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_entries_user_week 
  ON weekly_planner_entries(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_events_entry 
  ON weekly_planner_events(entry_id, day_of_week, hour);

CREATE INDEX IF NOT EXISTS idx_monthly_entries_user_date 
  ON monthly_planner_entries(user_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_todos_entry 
  ON monthly_planner_todos(entry_id, order_index);

CREATE INDEX IF NOT EXISTS idx_monthly_events_entry_date 
  ON monthly_planner_events(entry_id, date);

-- Enable RLS
ALTER TABLE weekly_planner_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_planner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_planner_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_planner_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_planner_events ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_planner_entries
CREATE POLICY "Users can view own weekly entries"
  ON weekly_planner_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly entries"
  ON weekly_planner_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly entries"
  ON weekly_planner_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly entries"
  ON weekly_planner_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for weekly_planner_events
CREATE POLICY "Users can view own weekly events"
  ON weekly_planner_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_planner_entries
      WHERE weekly_planner_entries.id = weekly_planner_events.entry_id
      AND weekly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own weekly events"
  ON weekly_planner_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_planner_entries
      WHERE weekly_planner_entries.id = weekly_planner_events.entry_id
      AND weekly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own weekly events"
  ON weekly_planner_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_planner_entries
      WHERE weekly_planner_entries.id = weekly_planner_events.entry_id
      AND weekly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own weekly events"
  ON weekly_planner_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_planner_entries
      WHERE weekly_planner_entries.id = weekly_planner_events.entry_id
      AND weekly_planner_entries.user_id = auth.uid()
    )
  );

-- Policies for monthly_planner_entries
CREATE POLICY "Users can view own monthly entries"
  ON monthly_planner_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own monthly entries"
  ON monthly_planner_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly entries"
  ON monthly_planner_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly entries"
  ON monthly_planner_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for monthly_planner_todos
CREATE POLICY "Users can view own monthly todos"
  ON monthly_planner_todos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_todos.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own monthly todos"
  ON monthly_planner_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_todos.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own monthly todos"
  ON monthly_planner_todos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_todos.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own monthly todos"
  ON monthly_planner_todos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_todos.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

-- Policies for monthly_planner_events
CREATE POLICY "Users can view own monthly events"
  ON monthly_planner_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_events.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own monthly events"
  ON monthly_planner_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_events.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own monthly events"
  ON monthly_planner_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_events.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own monthly events"
  ON monthly_planner_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_planner_entries
      WHERE monthly_planner_entries.id = monthly_planner_events.entry_id
      AND monthly_planner_entries.user_id = auth.uid()
    )
  );

-- Functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_weekly_planner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_monthly_planner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_weekly_planner_entries_updated_at
  BEFORE UPDATE ON weekly_planner_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_planner_updated_at();

CREATE TRIGGER update_monthly_planner_entries_updated_at
  BEFORE UPDATE ON monthly_planner_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_planner_updated_at();