/*
  Create Household Dashboard Schema

  1. New Tables
    - fridge_board_items
      - id (uuid, primary key)
      - household_id (uuid, foreign key to households)
      - member_id (uuid, foreign key to members) - who created it
      - item_type (text) - note, photo, reminder, achievement, quote
      - content (text) - main content
      - image_url (text, nullable) - for photos
      - color (text) - magnet/sticky note color
      - position_x (integer) - grid position
      - position_y (integer) - grid position
      - pinned (boolean) - stays at top
      - created_at (timestamptz)
      - expires_at (timestamptz, nullable) - auto-remove date

    - household_calendar_events
      - id (uuid, primary key)
      - household_id (uuid, foreign key to households)
      - member_id (uuid, foreign key to members) - who created it
      - title (text)
      - description (text, nullable)
      - event_date (date)
      - event_time (time, nullable)
      - event_type (text) - appointment, celebration, routine, deadline
      - color (text)
      - all_day (boolean)
      - created_at (timestamptz)

    - household_habits
      - id (uuid, primary key)
      - household_id (uuid, foreign key to households)
      - title (text)
      - description (text, nullable)
      - frequency (text) - daily, weekly, custom
      - icon (text) - lucide icon name
      - color (text)
      - active (boolean)
      - created_at (timestamptz)

    - household_habit_completions
      - id (uuid, primary key)
      - habit_id (uuid, foreign key to household_habits)
      - member_id (uuid, foreign key to members)
      - completed_date (date)
      - created_at (timestamptz)

    - household_goals
      - id (uuid, primary key)
      - household_id (uuid, foreign key to households)
      - title (text)
      - description (text, nullable)
      - target_date (date, nullable)
      - category (text) - health, financial, relationship, home, fun, growth
      - progress_percent (integer) - 0-100
      - icon (text)
      - color (text)
      - completed (boolean)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read/write their household data
    - Users must be household members to access

  3. Indexes
    - Add indexes on household_id for all tables
    - Add index on event_date for calendar
    - Add index on completed_date for habit completions
*/

-- Create fridge_board_items table
CREATE TABLE IF NOT EXISTS fridge_board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('note', 'photo', 'reminder', 'achievement', 'quote')),
  content text NOT NULL,
  image_url text,
  color text DEFAULT 'yellow',
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create household_calendar_events table
CREATE TABLE IF NOT EXISTS household_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time,
  event_type text NOT NULL CHECK (event_type IN ('appointment', 'celebration', 'routine', 'deadline')),
  color text DEFAULT 'blue',
  all_day boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create household_habits table
CREATE TABLE IF NOT EXISTS household_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
  icon text DEFAULT 'check-circle',
  color text DEFAULT 'green',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create household_habit_completions table
CREATE TABLE IF NOT EXISTS household_habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES household_habits(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, member_id, completed_date)
);

-- Create household_goals table
CREATE TABLE IF NOT EXISTS household_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  target_date date,
  category text NOT NULL CHECK (category IN ('health', 'financial', 'relationship', 'home', 'fun', 'growth')),
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  icon text DEFAULT 'target',
  color text DEFAULT 'blue',
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE fridge_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_goals ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fridge_board_household ON fridge_board_items(household_id);
CREATE INDEX IF NOT EXISTS idx_fridge_board_member ON fridge_board_items(member_id);
CREATE INDEX IF NOT EXISTS idx_fridge_board_expires ON fridge_board_items(expires_at);

CREATE INDEX IF NOT EXISTS idx_calendar_household ON household_calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON household_calendar_events(event_date);

CREATE INDEX IF NOT EXISTS idx_habits_household ON household_habits(household_id);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON household_habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON household_habit_completions(completed_date);

CREATE INDEX IF NOT EXISTS idx_goals_household ON household_goals(household_id);

-- RLS Policies for fridge_board_items
CREATE POLICY "Users can read household fridge items"
  ON fridge_board_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_board_items.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household fridge items"
  ON fridge_board_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_board_items.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household fridge items"
  ON fridge_board_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_board_items.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_board_items.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household fridge items"
  ON fridge_board_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_board_items.household_id
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for household_calendar_events
CREATE POLICY "Users can read household calendar"
  ON household_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_calendar_events.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household calendar events"
  ON household_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_calendar_events.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household calendar events"
  ON household_calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_calendar_events.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_calendar_events.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household calendar events"
  ON household_calendar_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_calendar_events.household_id
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for household_habits
CREATE POLICY "Users can read household habits"
  ON household_habits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_habits.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household habits"
  ON household_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_habits.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household habits"
  ON household_habits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_habits.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_habits.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household habits"
  ON household_habits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_habits.household_id
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for household_habit_completions
CREATE POLICY "Users can read household habit completions"
  ON household_habit_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_habits
      JOIN members ON members.household_id = household_habits.household_id
      WHERE household_habits.id = household_habit_completions.habit_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household habit completions"
  ON household_habit_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_habits
      JOIN members ON members.household_id = household_habits.household_id
      WHERE household_habits.id = household_habit_completions.habit_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household habit completions"
  ON household_habit_completions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_habits
      JOIN members ON members.household_id = household_habits.household_id
      WHERE household_habits.id = household_habit_completions.habit_id
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for household_goals
CREATE POLICY "Users can read household goals"
  ON household_goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_goals.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household goals"
  ON household_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_goals.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household goals"
  ON household_goals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_goals.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_goals.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household goals"
  ON household_goals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_goals.household_id
      AND members.user_id = auth.uid()
    )
  );