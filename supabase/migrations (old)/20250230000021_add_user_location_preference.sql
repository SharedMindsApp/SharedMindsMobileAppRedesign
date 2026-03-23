/*
  # Add User Location Preference for Recipe Search
  
  ## Problem
  Users need to be able to set their location so AI recipe searches can be tailored
  to their region/country. This helps find culturally relevant recipes and ingredients
  that are available in their area.
  
  ## Solution
  Add location fields to user_ui_preferences table:
  - recipe_location: User's current location (country/region) for recipe searches
  - recipe_location_override: Optional temporary override (e.g., when on holiday)
  
  Location format: Free-form text (e.g., "United Kingdom", "London, UK", "New York, USA")
  This allows flexibility while being specific enough for AI prompts.
*/

-- Add location columns to user_ui_preferences
ALTER TABLE user_ui_preferences
  ADD COLUMN IF NOT EXISTS recipe_location TEXT,
  ADD COLUMN IF NOT EXISTS recipe_location_override TEXT;

-- Add comments
COMMENT ON COLUMN user_ui_preferences.recipe_location IS 'User''s default location for recipe searches (e.g., "United Kingdom", "London, UK"). Used to tailor AI recipe searches to regional/cultural preferences.';
COMMENT ON COLUMN user_ui_preferences.recipe_location_override IS 'Optional temporary location override (e.g., when on holiday). If set, this takes precedence over recipe_location for recipe searches.';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_ui_preferences_recipe_location 
  ON user_ui_preferences(recipe_location) 
  WHERE recipe_location IS NOT NULL;
