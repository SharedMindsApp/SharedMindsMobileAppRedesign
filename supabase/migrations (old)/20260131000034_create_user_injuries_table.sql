/*
  # Create User Injuries Table
  
  This migration creates the user_injuries table to track current and historical injuries/health conditions
*/

-- Create user_injuries table
CREATE TABLE IF NOT EXISTS user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Injury details
  name TEXT NOT NULL, -- e.g., "Lower back pain", "Left knee ACL"
  type TEXT NOT NULL CHECK (type IN ('current', 'historical')),
  body_area TEXT NOT NULL, -- e.g., "lower_back", "left_knee", "right_shoulder"
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  
  -- Dates
  started_date DATE, -- For current injuries: when it started; for historical: when it originally occurred
  resolved_date DATE, -- For historical injuries: when it healed
  
  -- Impact on activities
  affected_activities TEXT[] DEFAULT '{}', -- Array of movement domains affected (gym, running, etc.)
  limitations TEXT, -- Free text description of limitations
  notes TEXT, -- Additional notes about the injury
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_injuries_user_id 
  ON user_injuries(user_id);

CREATE INDEX IF NOT EXISTS idx_user_injuries_user_type 
  ON user_injuries(user_id, type);

CREATE INDEX IF NOT EXISTS idx_user_injuries_user_current 
  ON user_injuries(user_id, type) 
  WHERE type = 'current';

-- Enable RLS
ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own injuries"
  ON user_injuries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own injuries"
  ON user_injuries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own injuries"
  ON user_injuries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own injuries"
  ON user_injuries FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_injuries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_injuries_updated_at
  BEFORE UPDATE ON user_injuries
  FOR EACH ROW
  EXECUTE FUNCTION update_user_injuries_updated_at();

-- Comments
COMMENT ON TABLE user_injuries IS 'Tracks current and historical injuries/health conditions for users';
COMMENT ON COLUMN user_injuries.type IS 'current: active injury; historical: past injury';
COMMENT ON COLUMN user_injuries.body_area IS 'Location of injury (e.g., lower_back, left_knee, right_shoulder)';
COMMENT ON COLUMN user_injuries.affected_activities IS 'Movement domains impacted by this injury';
