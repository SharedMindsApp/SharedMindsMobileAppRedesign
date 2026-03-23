/*
  # Create User Tag Preferences Table
  
  Allows users to save and mark preferred recipe tags for personalized searches.
*/

-- Create user_tag_preferences table
CREATE TABLE IF NOT EXISTS user_tag_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  is_preferred BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one preference record per tag per user per space
  UNIQUE (profile_id, space_id, tag)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_profile_space ON user_tag_preferences(profile_id, space_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_tag ON user_tag_preferences(tag);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_preferred ON user_tag_preferences(is_preferred) WHERE is_preferred = TRUE;

-- Enable RLS
ALTER TABLE user_tag_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own tag preferences and those in their household spaces
CREATE POLICY "Users can view tag preferences in their spaces"
  ON user_tag_preferences FOR SELECT
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_user_household_member(space_id)
  );

-- Users can insert their own tag preferences
CREATE POLICY "Users can insert tag preferences"
  ON user_tag_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_user_household_member(space_id)
  );

-- Users can update their own tag preferences
CREATE POLICY "Users can update tag preferences"
  ON user_tag_preferences FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_user_household_member(space_id)
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_user_household_member(space_id)
  );

-- Users can delete their own tag preferences
CREATE POLICY "Users can delete tag preferences"
  ON user_tag_preferences FOR DELETE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_user_household_member(space_id)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tag_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER handle_user_tag_preferences_updated_at
  BEFORE UPDATE ON user_tag_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tag_preferences_updated_at();

-- Add comment
COMMENT ON TABLE user_tag_preferences IS 'Stores user preferences for recipe tags, allowing personalized tag lists and quick filtering';
