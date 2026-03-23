/*
  # Add Include Location in AI Preference
  
  ## Problem
  Users need to control whether their location information is included in AI recipe prompts.
  Some users may prefer not to share location data with AI services for privacy reasons,
  or may want generic recipes without location-specific tailoring.
  
  ## Solution
  Add `include_location_in_ai` column to `user_ui_preferences` table:
  - Boolean field (default: true)
  - When true: Location is included in AI prompts for culturally relevant recipes
  - When false: Location is excluded from AI prompts, recipes will be more generic
  
  This gives users control over their privacy and recipe personalization preferences.
*/

-- Add include_location_in_ai column to user_ui_preferences
ALTER TABLE user_ui_preferences
  ADD COLUMN IF NOT EXISTS include_location_in_ai BOOLEAN DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN user_ui_preferences.include_location_in_ai IS 
  'Whether to include location information in AI recipe prompts. When true (default), location is included for culturally relevant recipes. When false, location is excluded for privacy or to get more generic recipes.';

-- Add index for efficient querying (though this is likely not needed for filtering)
-- CREATE INDEX IF NOT EXISTS idx_user_ui_preferences_include_location_in_ai 
--   ON user_ui_preferences(include_location_in_ai) 
--   WHERE include_location_in_ai = false;
