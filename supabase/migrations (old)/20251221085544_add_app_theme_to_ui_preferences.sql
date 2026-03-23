/*
  # Add App Theme to UI Preferences

  1. Changes
    - Add app_theme column to user_ui_preferences table
    - Support light, dark, and neon-dark theme modes
    - Set default to 'light' for existing users
    
  2. Security
    - No RLS changes needed (already enforced)
    - Column is user-specific and non-sensitive
*/

-- Add app_theme column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_ui_preferences' AND column_name = 'app_theme'
  ) THEN
    ALTER TABLE user_ui_preferences
    ADD COLUMN app_theme text DEFAULT 'light' CHECK (app_theme IN ('light', 'dark', 'neon-dark'));
  END IF;
END $$;

-- Update existing rows to have 'light' theme
UPDATE user_ui_preferences
SET app_theme = 'light'
WHERE app_theme IS NULL;
