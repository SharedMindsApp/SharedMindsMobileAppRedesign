/*
  # Neurotype-Based UI Preferences System

  1. New Tables
    - `neurotype_profiles`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., 'neurotypical', 'adhd', 'autism', 'dyslexia', 'anxiety'
      - `display_name` (text) - Human-readable name
      - `description` (text) - Description of the profile
      - `default_layout` (text) - 'standard' or 'nd-optimized'
      - `default_density` (text) - 'compact', 'standard', 'spacious'
      - `default_theme` (jsonb) - Default color/font settings
      - `is_active` (boolean) - Whether this profile is available
      - `created_at` (timestamp)
    
    - `user_ui_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles.user_id)
      - `neurotype_profile_id` (uuid, foreign key to neurotype_profiles.id, nullable)
      - `layout_mode` (text) - 'standard' or 'nd-optimized'
      - `ui_density` (text) - 'compact', 'standard', 'spacious'
      - `font_scale` (text) - 's', 'm', 'l', 'xl'
      - `color_theme` (text) - 'default', 'cream', 'pastel-yellow', 'pastel-blue', 'light-grey', 'monochrome'
      - `contrast_level` (text) - 'normal', 'high', 'reduced'
      - `reduced_motion` (boolean) - Reduce animations
      - `custom_overrides` (jsonb) - Additional custom preferences
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can read neurotype_profiles (public reference data)
    - Users can only manage their own UI preferences
    - Admins can manage neurotype profiles
*/

-- Create neurotype_profiles table
CREATE TABLE IF NOT EXISTS neurotype_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  default_layout text DEFAULT 'standard' CHECK (default_layout IN ('standard', 'nd-optimized')),
  default_density text DEFAULT 'standard' CHECK (default_density IN ('compact', 'standard', 'spacious')),
  default_theme jsonb DEFAULT '{"colorTheme": "default", "contrastLevel": "normal", "fontScale": "m"}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_ui_preferences table
CREATE TABLE IF NOT EXISTS user_ui_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  neurotype_profile_id uuid REFERENCES neurotype_profiles(id) ON DELETE SET NULL,
  layout_mode text DEFAULT 'standard' CHECK (layout_mode IN ('standard', 'nd-optimized')),
  ui_density text DEFAULT 'standard' CHECK (ui_density IN ('compact', 'standard', 'spacious')),
  font_scale text DEFAULT 'm' CHECK (font_scale IN ('s', 'm', 'l', 'xl')),
  color_theme text DEFAULT 'default',
  contrast_level text DEFAULT 'normal' CHECK (contrast_level IN ('normal', 'high', 'reduced')),
  reduced_motion boolean DEFAULT false,
  custom_overrides jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE neurotype_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ui_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for neurotype_profiles
CREATE POLICY "Anyone can view active neurotype profiles"
  ON neurotype_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage neurotype profiles"
  ON neurotype_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_ui_preferences
CREATE POLICY "Users can view own UI preferences"
  ON user_ui_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own UI preferences"
  ON user_ui_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own UI preferences"
  ON user_ui_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own UI preferences"
  ON user_ui_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Insert default neurotype profiles
INSERT INTO neurotype_profiles (name, display_name, description, default_layout, default_density, default_theme) VALUES
  (
    'neurotypical',
    'Neurotypical',
    'Standard layout with medium information density, suitable for most users',
    'standard',
    'standard',
    '{"colorTheme": "default", "contrastLevel": "normal", "fontScale": "m"}'::jsonb
  ),
  (
    'adhd',
    'ADHD',
    'Reduced clutter with single task focus and enhanced feedback for better concentration',
    'nd-optimized',
    'spacious',
    '{"colorTheme": "default", "contrastLevel": "high", "fontScale": "l"}'::jsonb
  ),
  (
    'autism',
    'Autism',
    'High predictability with minimal transitions and structured grids for clarity',
    'nd-optimized',
    'spacious',
    '{"colorTheme": "default", "contrastLevel": "normal", "fontScale": "m"}'::jsonb
  ),
  (
    'dyslexia',
    'Dyslexia',
    'Enhanced readability with color filters and increased text spacing',
    'standard',
    'spacious',
    '{"colorTheme": "cream", "contrastLevel": "high", "fontScale": "l"}'::jsonb
  ),
  (
    'anxiety',
    'Anxiety',
    'Gentle interface with soft colors and simplified tasks to reduce stress',
    'nd-optimized',
    'spacious',
    '{"colorTheme": "pastel-blue", "contrastLevel": "reduced", "fontScale": "m"}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ui_preferences_user_id ON user_ui_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ui_preferences_neurotype ON user_ui_preferences(neurotype_profile_id);
