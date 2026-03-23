/*
  # Create Daily Planner System

  1. New Tables
    - `daily_planner_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date, the day this entry is for)
      - `focus_text` (text, today's main focus)
      - `breakfast` (text)
      - `lunch` (text)
      - `dinner` (text)
      - `snacks` (text)
      - `hydration_count` (integer, glasses of water)
      - `mood_rating` (integer, 1-6 scale)
      - `sleep_rating` (integer, 1-6 scale)
      - `improvements` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `daily_planner_expenses`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, foreign key to daily_planner_entries)
      - `description` (text)
      - `amount` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own entries
*/

-- Create daily planner entries table
CREATE TABLE IF NOT EXISTS daily_planner_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  focus_text text DEFAULT '',
  breakfast text DEFAULT '',
  lunch text DEFAULT '',
  dinner text DEFAULT '',
  snacks text DEFAULT '',
  hydration_count integer DEFAULT 0 CHECK (hydration_count >= 0 AND hydration_count <= 8),
  mood_rating integer CHECK (mood_rating >= 1 AND mood_rating <= 6),
  sleep_rating integer CHECK (sleep_rating >= 1 AND sleep_rating <= 6),
  improvements text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create daily planner expenses table
CREATE TABLE IF NOT EXISTS daily_planner_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES daily_planner_entries(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL DEFAULT '',
  amount decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_planner_entries_user_date 
  ON daily_planner_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_planner_expenses_entry 
  ON daily_planner_expenses(entry_id);

-- Enable RLS
ALTER TABLE daily_planner_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_planner_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for daily_planner_entries
CREATE POLICY "Users can view own daily planner entries"
  ON daily_planner_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own daily planner entries"
  ON daily_planner_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily planner entries"
  ON daily_planner_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily planner entries"
  ON daily_planner_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for daily_planner_expenses
CREATE POLICY "Users can view own expenses"
  ON daily_planner_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_planner_entries
      WHERE daily_planner_entries.id = daily_planner_expenses.entry_id
      AND daily_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own expenses"
  ON daily_planner_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_planner_entries
      WHERE daily_planner_entries.id = daily_planner_expenses.entry_id
      AND daily_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own expenses"
  ON daily_planner_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_planner_entries
      WHERE daily_planner_entries.id = daily_planner_expenses.entry_id
      AND daily_planner_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_planner_entries
      WHERE daily_planner_entries.id = daily_planner_expenses.entry_id
      AND daily_planner_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own expenses"
  ON daily_planner_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_planner_entries
      WHERE daily_planner_entries.id = daily_planner_expenses.entry_id
      AND daily_planner_entries.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_planner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_planner_entries_updated_at
  BEFORE UPDATE ON daily_planner_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_planner_updated_at();