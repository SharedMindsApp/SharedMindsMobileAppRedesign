/*
  # Create Mobile UI System

  1. Schema Changes
    - Add `ui_mode` column to profiles table
      - Type: enum ('fridge' | 'mobile')
      - Default: 'fridge'

  2. New Tables
    - `mobile_app_layout`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key to profiles)
      - `widget_id` (uuid, nullable, foreign key to fridge_widgets)
      - `app_type` (text, app identifier like "calendar", "meal_planner")
      - `page` (int, home screen page number, default 0)
      - `position` (int, position on page)
      - `folder_id` (uuid, nullable, for folder grouping)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `mobile_app_folders`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key to profiles)
      - `name` (text, folder name)
      - `page` (int, home screen page)
      - `position` (int, position on page)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Users can only manage their own layouts
*/

-- Add ui_mode to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ui_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ui_mode text DEFAULT 'fridge' CHECK (ui_mode IN ('fridge', 'mobile'));
  END IF;
END $$;

-- Create mobile_app_folders table
CREATE TABLE IF NOT EXISTS mobile_app_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  page int NOT NULL DEFAULT 0,
  position int NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mobile_app_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
  ON mobile_app_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own folders"
  ON mobile_app_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own folders"
  ON mobile_app_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own folders"
  ON mobile_app_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Create mobile_app_layout table
CREATE TABLE IF NOT EXISTS mobile_app_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  widget_id uuid REFERENCES fridge_widgets(id) ON DELETE CASCADE,
  app_type text NOT NULL,
  page int NOT NULL DEFAULT 0,
  position int NOT NULL,
  folder_id uuid REFERENCES mobile_app_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT mobile_app_layout_check CHECK (
    (widget_id IS NULL AND app_type IS NOT NULL) OR
    (widget_id IS NOT NULL)
  )
);

ALTER TABLE mobile_app_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app layout"
  ON mobile_app_layout FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own app layout"
  ON mobile_app_layout FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own app layout"
  ON mobile_app_layout FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own app layout"
  ON mobile_app_layout FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mobile_app_layout_profile
  ON mobile_app_layout(profile_id);

CREATE INDEX IF NOT EXISTS idx_mobile_app_layout_page
  ON mobile_app_layout(profile_id, page);

CREATE INDEX IF NOT EXISTS idx_mobile_app_folders_profile
  ON mobile_app_folders(profile_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_mobile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mobile_app_layout_updated_at
  BEFORE UPDATE ON mobile_app_layout
  FOR EACH ROW
  EXECUTE FUNCTION update_mobile_updated_at();

CREATE TRIGGER update_mobile_app_folders_updated_at
  BEFORE UPDATE ON mobile_app_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_mobile_updated_at();
