/*
  # Enable User-Created Custom Project Types

  1. Schema Changes
    - Add `created_by` field to `guardrails_project_types` to track user-created types
    - Add `is_system` field to distinguish system types from user types

  2. Security Updates
    - Allow authenticated users to create their own custom project types
    - Allow users to update/delete only their own custom project types
    - System project types remain read-only for all users

  3. Notes
    - Backward compatible: existing project types are marked as system types
    - Users can create project types for any domain they have access to
*/

-- Add created_by column to track user-created project types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_project_types' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE guardrails_project_types
    ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add is_system column to distinguish system types from user types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_project_types' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE guardrails_project_types
    ADD COLUMN is_system boolean DEFAULT false;
  END IF;
END $$;

-- Mark existing project types as system types
UPDATE guardrails_project_types
SET is_system = true
WHERE created_by IS NULL;

-- Create index on created_by for efficient lookups
CREATE INDEX IF NOT EXISTS idx_project_types_created_by ON guardrails_project_types(created_by);

-- Drop existing read-only policy (will be replaced with more granular policies)
DROP POLICY IF EXISTS "Authenticated users can view project types" ON guardrails_project_types;

-- Allow all authenticated users to view all project types (system and custom)
CREATE POLICY "Users can view all project types"
  ON guardrails_project_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create their own custom project types
CREATE POLICY "Users can create custom project types"
  ON guardrails_project_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_system = false);

-- Allow users to update their own custom project types
CREATE POLICY "Users can update own custom project types"
  ON guardrails_project_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false)
  WITH CHECK (auth.uid() = created_by AND is_system = false);

-- Allow users to delete their own custom project types
CREATE POLICY "Users can delete own custom project types"
  ON guardrails_project_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND is_system = false);

-- Allow users to create domain associations for their custom project types
DROP POLICY IF EXISTS "Authenticated users can view project type domains" ON guardrails_project_type_domains;

CREATE POLICY "Users can view all project type domains"
  ON guardrails_project_type_domains
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create project type domains for their types"
  ON guardrails_project_type_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_project_types
      WHERE id = project_type_id
      AND created_by = auth.uid()
      AND is_system = false
    )
  );

CREATE POLICY "Users can delete project type domains for their types"
  ON guardrails_project_type_domains
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_project_types
      WHERE id = project_type_id
      AND created_by = auth.uid()
      AND is_system = false
    )
  );
