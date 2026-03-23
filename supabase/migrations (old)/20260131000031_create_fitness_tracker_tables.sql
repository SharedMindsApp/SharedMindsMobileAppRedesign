/*
  # Create Fitness Tracker Tables
  
  This migration creates the tables needed for the Fitness Tracker system:
  - user_movement_profiles: Stores user's movement discovery and profile
  - movement_sessions: Stores individual movement sessions (will use tracker_entries later)
*/

-- Create user_movement_profiles table
CREATE TABLE IF NOT EXISTS user_movement_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discovery data
  primary_domains TEXT[] NOT NULL DEFAULT '{}',
  domain_details JSONB NOT NULL DEFAULT '{}',
  movement_level TEXT CHECK (movement_level IN ('casual', 'regular', 'structured', 'competitive')),
  
  -- Generated from discovery
  tracker_structure JSONB NOT NULL DEFAULT '{}',
  ui_configuration JSONB NOT NULL DEFAULT '{}',
  insight_preferences JSONB NOT NULL DEFAULT '{}',
  
  -- Capability unlocks (auto-detected)
  unlocked_features TEXT[] DEFAULT '{}',
  capability_unlocks JSONB DEFAULT '[]',
  
  -- Metadata
  discovery_completed BOOLEAN DEFAULT FALSE,
  discovery_date TIMESTAMPTZ,
  last_reconfiguration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_movement_profiles_discovery 
  ON user_movement_profiles(discovery_completed);

-- Enable RLS
ALTER TABLE user_movement_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON user_movement_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_movement_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_movement_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_movement_profiles IS 'Stores user movement discovery and personalized tracker configuration';
COMMENT ON COLUMN user_movement_profiles.primary_domains IS 'Array of movement domains user selected (gym, running, etc.)';
COMMENT ON COLUMN user_movement_profiles.domain_details IS 'Detailed information about each selected domain';
COMMENT ON COLUMN user_movement_profiles.tracker_structure IS 'Dynamically assembled tracker structure based on discovery';
COMMENT ON COLUMN user_movement_profiles.ui_configuration IS 'UI configuration (quick log buttons, visualizations)';
