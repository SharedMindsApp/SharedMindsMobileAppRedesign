/*
  # Add Fitness Tracker ID to User Movement Profile
  
  This migration adds a field to store the single Fitness Tracker ID
  so we can reference the unified tracker instead of multiple trackers.
*/

-- Add fitness_tracker_id column to user_movement_profiles
ALTER TABLE user_movement_profiles
  ADD COLUMN IF NOT EXISTS fitness_tracker_id UUID REFERENCES trackers(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_user_movement_profiles_fitness_tracker_id 
  ON user_movement_profiles(fitness_tracker_id) 
  WHERE fitness_tracker_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN user_movement_profiles.fitness_tracker_id IS 
  'Reference to the single unified Fitness Tracker for this user';
