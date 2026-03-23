/*
  # Add Global Tracker Templates Support
  
  1. Changes
    - Add scope field ('user' | 'global') to tracker_templates
    - Add created_by field (nullable, for global templates)
    - Add is_locked field (prevents non-admin edits)
    - Add published_at field (for rollout/versioning)
    - Update RLS policies to support global templates
    - Add admin helper function for checking admin/developer roles
  
  2. Notes
    - Global templates are visible to all users
    - Only admins/developers can create/edit global templates
    - Users can duplicate global templates to personal templates
    - Global templates cannot be deleted (archive instead)
*/

-- Add new columns to tracker_templates
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add constraint for scope values
ALTER TABLE tracker_templates
  ADD CONSTRAINT check_scope_valid CHECK (scope IN ('user', 'global'));

-- Add constraint: global templates must have is_locked = true
ALTER TABLE tracker_templates
  ADD CONSTRAINT check_global_locked CHECK (
    (scope = 'user') OR (scope = 'global' AND is_locked = true)
  );

-- Add constraint: global templates should have created_by set (or NULL for system)
-- We allow NULL for backward compatibility with existing system templates
ALTER TABLE tracker_templates
  ADD CONSTRAINT check_global_created_by CHECK (
    (scope = 'user') OR (scope = 'global')
  );

-- Create index for scope queries
CREATE INDEX IF NOT EXISTS idx_tracker_templates_scope 
  ON tracker_templates(scope) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tracker_templates_published 
  ON tracker_templates(published_at) 
  WHERE scope = 'global' AND archived_at IS NULL;

-- Helper function to check if user is admin or developer
CREATE OR REPLACE FUNCTION is_admin_or_developer()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'developer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing data
-- Set scope='user' for existing user templates (non-system templates)
UPDATE tracker_templates
SET scope = 'user', created_by = owner_id
WHERE is_system_template = false AND owner_id IS NOT NULL;

-- Set scope='global' for existing system templates
UPDATE tracker_templates
SET scope = 'global', is_locked = true, created_by = NULL
WHERE is_system_template = true;

-- Drop old policies (we'll recreate them)
DROP POLICY IF EXISTS "Users can read their own templates" ON tracker_templates;
DROP POLICY IF EXISTS "Users can read system templates" ON tracker_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON tracker_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON tracker_templates;
DROP POLICY IF EXISTS "Users can archive their own templates" ON tracker_templates;

-- New RLS Policies

-- SELECT: Everyone can see global templates, users can see their own templates
CREATE POLICY "Users can read global templates and their own templates"
  ON tracker_templates
  FOR SELECT
  USING (
    (scope = 'global' AND archived_at IS NULL) OR
    (scope = 'user' AND created_by = auth.uid())
  );

-- INSERT: Users can create user templates, admins can create global templates
CREATE POLICY "Users can create user templates, admins can create global templates"
  ON tracker_templates
  FOR INSERT
  WITH CHECK (
    (scope = 'user' AND created_by = auth.uid()) OR
    (scope = 'global' AND is_admin_or_developer())
  );

-- UPDATE: Users can update their own user templates, admins can update global templates
CREATE POLICY "Users can update their own templates, admins can update global templates"
  ON tracker_templates
  FOR UPDATE
  USING (
    (scope = 'user' AND created_by = auth.uid() AND is_locked = false) OR
    (scope = 'global' AND is_admin_or_developer())
  )
  WITH CHECK (
    (scope = 'user' AND created_by = auth.uid() AND is_locked = false) OR
    (scope = 'global' AND is_admin_or_developer())
  );

-- DELETE: Users can delete their own user templates, global templates cannot be deleted
CREATE POLICY "Users can delete their own user templates"
  ON tracker_templates
  FOR DELETE
  USING (
    scope = 'user' AND created_by = auth.uid()
  );

-- Comments
COMMENT ON COLUMN tracker_templates.scope IS 'Template scope: user (owned by user) or global (visible to all)';
COMMENT ON COLUMN tracker_templates.created_by IS 'User who created the template (auth.uid). NULL for system global templates.';
COMMENT ON COLUMN tracker_templates.is_locked IS 'Prevents non-admin edits. Global templates are always locked.';
COMMENT ON COLUMN tracker_templates.published_at IS 'Timestamp when template was published/made visible. Used for rollout/versioning.';
COMMENT ON FUNCTION is_admin_or_developer IS 'Checks if current user has admin or developer role';
