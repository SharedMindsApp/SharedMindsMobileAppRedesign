/*
  # Create Todo Routines System
  
  This migration creates a system for daily routines - recurring todos that appear every day.
  Routines are synced to calendar as recurring events.
  
  Changes:
  1. Create todo_routines table
  2. Add indexes for performance
  3. Enable RLS
*/

-- Step 1: Create todo_routines table
CREATE TABLE IF NOT EXISTS todo_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time TEXT NOT NULL, -- HH:MM format (e.g., "09:00")
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_time_format CHECK (time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 1440)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_todo_routines_user_id 
  ON todo_routines(user_id) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_todo_routines_time 
  ON todo_routines(user_id, time) 
  WHERE enabled = true;

-- Step 3: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_todo_routines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todo_routines_updated_at
  BEFORE UPDATE ON todo_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_todo_routines_updated_at();

-- Step 4: Enable RLS
ALTER TABLE todo_routines ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies
-- Users can view their own routines
CREATE POLICY "Users can view own routines"
  ON todo_routines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own routines
CREATE POLICY "Users can create own routines"
  ON todo_routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own routines
CREATE POLICY "Users can update own routines"
  ON todo_routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own routines
CREATE POLICY "Users can delete own routines"
  ON todo_routines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
