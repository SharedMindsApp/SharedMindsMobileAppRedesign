/*
  # Stage 4.6: Testing Mode Toggle
  
  1. Overview
    - Add simple toggle state for Testing Mode
    - Stores ONLY whether testing mode is enabled
    - Does NOT store any trace data, logs, or history
    - Pure visibility toggle, not telemetry
  
  2. Changes
    - Add `testing_mode_enabled` to profiles
    - Default: false (opt-in only)
  
  3. Important Notes
    - This is the toggle state only
    - No trace data is ever persisted
    - No analytics or telemetry
    - Testing mode does not change signal behavior
*/

-- Add testing mode toggle to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'testing_mode_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN testing_mode_enabled boolean DEFAULT false;
  END IF;
END $$;
