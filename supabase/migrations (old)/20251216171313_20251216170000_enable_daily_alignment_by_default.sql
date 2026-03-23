/*
  # Enable Daily Alignment by Default

  1. Changes
    - Change default value of daily_alignment_enabled to true
    - Update existing users to have daily_alignment_enabled = true

  2. Reason
    - Daily Alignment should be visible by default for better user experience
    - Users can disable it in settings if they don't want it
    - Makes the feature discoverable without requiring settings navigation
*/

-- Update default value for new profiles
ALTER TABLE profiles ALTER COLUMN daily_alignment_enabled SET DEFAULT true;

-- Enable for all existing users who don't have it explicitly set
UPDATE profiles 
SET daily_alignment_enabled = true 
WHERE daily_alignment_enabled IS NULL OR daily_alignment_enabled = false;
