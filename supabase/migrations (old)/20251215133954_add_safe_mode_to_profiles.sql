/*
  # Add Safe Mode to Profiles

  1. Changes
    - Add safe_mode_enabled boolean field to profiles table
    - Default to FALSE (Safe Mode OFF by default)
    - Used for Stage 3.1 intervention registry integration

  2. Security
    - Users can update their own safe_mode_enabled field
*/

-- Add safe_mode_enabled field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'safe_mode_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN safe_mode_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
