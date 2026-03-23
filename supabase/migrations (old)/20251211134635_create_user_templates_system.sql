/*
  # Create User Template System

  This migration extends the template system to allow users to create, manage,
  and reuse their own track and sub-track templates alongside system templates.

  1. New Tables
    - `guardrails_user_track_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `domain_type` (text, one of: work, personal, passion, startup)
      - `name` (text, template name)
      - `description` (text, optional description)
      - `ordering_index` (integer, for display ordering)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `guardrails_user_subtrack_templates`
      - `id` (uuid, primary key)
      - `user_track_template_id` (uuid, foreign key to user track templates)
      - `name` (text, sub-track template name)
      - `description` (text, optional description)
      - `ordering_index` (integer, for display ordering)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only see, create, update, and delete their own templates
    - Templates are private to the creating user

  3. Features
    - User templates work exactly like system templates
    - Can be used to instantiate tracks and subtracks
    - Merged with system templates in template retrieval
    - Cascade delete for sub-track templates

  4. Constraints
    - User templates belong to a single user
    - Domain type validation enforced
    - Ordering maintained per user per domain
*/

-- Create guardrails_user_track_templates table
CREATE TABLE IF NOT EXISTS guardrails_user_track_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_type text NOT NULL CHECK (domain_type IN ('work', 'personal', 'passion', 'startup')),
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create guardrails_user_subtrack_templates table
CREATE TABLE IF NOT EXISTS guardrails_user_subtrack_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_track_template_id uuid NOT NULL REFERENCES guardrails_user_track_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_track_templates_user ON guardrails_user_track_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_track_templates_domain ON guardrails_user_track_templates(user_id, domain_type);
CREATE INDEX IF NOT EXISTS idx_user_track_templates_ordering ON guardrails_user_track_templates(user_id, domain_type, ordering_index);
CREATE INDEX IF NOT EXISTS idx_user_subtrack_templates_track ON guardrails_user_subtrack_templates(user_track_template_id);
CREATE INDEX IF NOT EXISTS idx_user_subtrack_templates_ordering ON guardrails_user_subtrack_templates(user_track_template_id, ordering_index);

-- Enable RLS
ALTER TABLE guardrails_user_track_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_user_subtrack_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User track templates
CREATE POLICY "Users can view own track templates"
  ON guardrails_user_track_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own track templates"
  ON guardrails_user_track_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own track templates"
  ON guardrails_user_track_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own track templates"
  ON guardrails_user_track_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies: User subtrack templates
CREATE POLICY "Users can view own subtrack templates"
  ON guardrails_user_subtrack_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_user_track_templates
      WHERE guardrails_user_track_templates.id = guardrails_user_subtrack_templates.user_track_template_id
      AND guardrails_user_track_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own subtrack templates"
  ON guardrails_user_subtrack_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_user_track_templates
      WHERE guardrails_user_track_templates.id = guardrails_user_subtrack_templates.user_track_template_id
      AND guardrails_user_track_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own subtrack templates"
  ON guardrails_user_subtrack_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_user_track_templates
      WHERE guardrails_user_track_templates.id = guardrails_user_subtrack_templates.user_track_template_id
      AND guardrails_user_track_templates.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_user_track_templates
      WHERE guardrails_user_track_templates.id = guardrails_user_subtrack_templates.user_track_template_id
      AND guardrails_user_track_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own subtrack templates"
  ON guardrails_user_subtrack_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_user_track_templates
      WHERE guardrails_user_track_templates.id = guardrails_user_subtrack_templates.user_track_template_id
      AND guardrails_user_track_templates.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp for user track templates
CREATE OR REPLACE FUNCTION update_user_track_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_subtrack_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_track_template_updated_at_trigger ON guardrails_user_track_templates;
CREATE TRIGGER update_user_track_template_updated_at_trigger
  BEFORE UPDATE ON guardrails_user_track_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_user_track_template_updated_at();

DROP TRIGGER IF EXISTS update_user_subtrack_template_updated_at_trigger ON guardrails_user_subtrack_templates;
CREATE TRIGGER update_user_subtrack_template_updated_at_trigger
  BEFORE UPDATE ON guardrails_user_subtrack_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subtrack_template_updated_at();
