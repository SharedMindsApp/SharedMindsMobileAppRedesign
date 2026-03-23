/*
  # Stage 4.7: Regulation Presets (Outcome-Based Configuration Layer)

  1. Overview
    - Add preset application tracking for Regulation system
    - Presets are composition layers over existing configuration
    - Everything is reversible, transparent, and layered (not overwriting)
    - No automation, no enforcement, no prescriptive logic

  2. New Tables
    - `regulation_preset_applications`
      - Tracks when users apply presets
      - Stores snapshot of changes made
      - Enables revert functionality
      - Tracks if user edited manually (breaks linkage)

  3. Profile Extensions
    - `active_preset_id` - Currently active preset (if any)
    - `active_preset_applied_at` - When current preset was applied

  4. Key Principles
    - Presets do NOT override existing settings
    - They apply changes as a delta
    - User sees preview before confirming
    - Everything is editable and reversible
    - No hidden logic, no automation

  5. Security
    - RLS policies ensure users only see their own preset applications
    - No cross-user visibility
    - Authenticated users only
*/

-- Create preset applications tracking table
CREATE TABLE IF NOT EXISTS regulation_preset_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id text NOT NULL,
  applied_at timestamptz DEFAULT now(),
  changes_made jsonb NOT NULL,
  reverted_at timestamptz,
  edited_manually boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_preset_applications_user_id ON regulation_preset_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_preset_applications_preset_id ON regulation_preset_applications(preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_applications_applied_at ON regulation_preset_applications(applied_at DESC);

-- Enable RLS
ALTER TABLE regulation_preset_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preset applications
CREATE POLICY "Users can view own preset applications"
  ON regulation_preset_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preset applications"
  ON regulation_preset_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preset applications"
  ON regulation_preset_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preset applications"
  ON regulation_preset_applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add preset tracking fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active_preset_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active_preset_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active_preset_applied_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active_preset_applied_at timestamptz;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON TABLE regulation_preset_applications IS 'Tracks Regulation preset applications for transparency and reversibility. Presets are composition layers, not enforcement rules.';
COMMENT ON COLUMN regulation_preset_applications.changes_made IS 'Snapshot of configuration changes made by preset. Used for revert functionality.';
COMMENT ON COLUMN regulation_preset_applications.edited_manually IS 'True if user edited configuration after preset application. Breaks preset linkage.';
