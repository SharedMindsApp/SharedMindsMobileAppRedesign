/*
  # Add Missing Fields to Focus Sessions

  1. Changes
    - Add target_end_time field to track when the session should end
    - Add goal_minutes field for easier access to the goal (mirrors intended_duration_minutes)
    - These fields support the timer and UI display

  2. Notes
    - target_end_time is calculated as start_time + intended_duration_minutes
    - goal_minutes is the same as intended_duration_minutes but used by the UI
*/

-- Add target_end_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'target_end_time'
  ) THEN
    ALTER TABLE focus_sessions ADD COLUMN target_end_time timestamptz;
  END IF;
END $$;

-- Add goal_minutes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'goal_minutes'
  ) THEN
    ALTER TABLE focus_sessions ADD COLUMN goal_minutes int;
  END IF;
END $$;

-- Update existing sessions to set target_end_time and goal_minutes
UPDATE focus_sessions
SET 
  target_end_time = start_time + (intended_duration_minutes || ' minutes')::interval,
  goal_minutes = intended_duration_minutes
WHERE target_end_time IS NULL OR goal_minutes IS NULL;

-- Create function to set target_end_time and goal_minutes on insert
CREATE OR REPLACE FUNCTION set_focus_session_targets()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.intended_duration_minutes IS NOT NULL THEN
    NEW.target_end_time = NEW.start_time + (NEW.intended_duration_minutes || ' minutes')::interval;
    NEW.goal_minutes = NEW.intended_duration_minutes;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set targets
DROP TRIGGER IF EXISTS focus_sessions_set_targets ON focus_sessions;
CREATE TRIGGER focus_sessions_set_targets
  BEFORE INSERT ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_focus_session_targets();
