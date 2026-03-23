/*
  # Create Reminders Table

  1. New Tables
    - `reminders`
      - Stores reminders generated from habits, goals, and manual entries
      - Links to habits for automatic completion
      - Supports assignment to multiple household members
      - Tracks completion status

  2. Security
    - Enable RLS on reminders table
    - Users can only access reminders from their households
    - Users can complete reminders assigned to them
*/

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to uuid[] DEFAULT '{}',
  habit_id uuid REFERENCES habits(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  reminder_date date NOT NULL,
  reminder_time time,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Reminders policies
CREATE POLICY "Users can view reminders in their household"
  ON reminders FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create reminders in their household"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update reminders they created or are assigned to"
  ON reminders FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR auth.uid() = ANY(assigned_to)
  )
  WITH CHECK (
    created_by = auth.uid() OR auth.uid() = ANY(assigned_to)
  );

CREATE POLICY "Users can delete reminders they created"
  ON reminders FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_household ON reminders(household_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_habit ON reminders(habit_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed);
