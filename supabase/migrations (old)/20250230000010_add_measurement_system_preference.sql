-- Add measurement_system column to user_ui_preferences
-- This allows users to toggle between metric and imperial units for recipe display

ALTER TABLE user_ui_preferences
ADD COLUMN IF NOT EXISTS measurement_system text DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial'));

-- Add comment
COMMENT ON COLUMN user_ui_preferences.measurement_system IS 'Measurement system preference: metric (default) or imperial. Used for recipe ingredient display conversion.';
