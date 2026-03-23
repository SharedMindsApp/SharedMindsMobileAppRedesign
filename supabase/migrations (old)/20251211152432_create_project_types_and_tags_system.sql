/*
  # Create Project Types and Tags System

  1. New Tables
    - `guardrails_project_types`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - e.g., "Music Production", "MVP Build"
      - `domain_type` (text, not null) - one of: work, personal, passion, startup
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `guardrails_template_tags`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - e.g., "writing", "design", "research"
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `guardrails_track_template_tags` (linking table)
      - `id` (uuid, primary key)
      - `track_template_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)
      - Unique constraint on (track_template_id, tag_id)

    - `guardrails_project_type_tags` (linking table)
      - `id` (uuid, primary key)
      - `project_type_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)
      - Unique constraint on (project_type_id, tag_id)

  2. Schema Changes
    - Add `project_type_id` to `master_projects`
    - Add `has_completed_wizard` to `master_projects`

  3. Security
    - Enable RLS on all new tables
    - Read-only access for authenticated users (project types and tags controlled by system)

  4. Indexes
    - Index on `domain_type` for project_types
    - Index on `name` for tags
    - Indexes on foreign keys for linking tables

  5. Notes
    - Project types are domain-specific specializations
    - Tags enable flexible template filtering
    - Many-to-many relationships allow complex associations
    - Backward compatible with existing projects (project_type_id nullable)
*/

-- Create guardrails_project_types table
CREATE TABLE IF NOT EXISTS guardrails_project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  domain_type text NOT NULL CHECK (domain_type IN ('work', 'personal', 'passion', 'startup')),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create guardrails_template_tags table
CREATE TABLE IF NOT EXISTS guardrails_template_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create guardrails_track_template_tags linking table
CREATE TABLE IF NOT EXISTS guardrails_track_template_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_template_id uuid NOT NULL REFERENCES guardrails_track_templates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES guardrails_template_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(track_template_id, tag_id)
);

-- Create guardrails_project_type_tags linking table
CREATE TABLE IF NOT EXISTS guardrails_project_type_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id uuid NOT NULL REFERENCES guardrails_project_types(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES guardrails_template_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_type_id, tag_id)
);

-- Add project_type_id to master_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'project_type_id'
  ) THEN
    ALTER TABLE master_projects
    ADD COLUMN project_type_id uuid REFERENCES guardrails_project_types(id);
  END IF;
END $$;

-- Add has_completed_wizard to master_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'has_completed_wizard'
  ) THEN
    ALTER TABLE master_projects
    ADD COLUMN has_completed_wizard boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_types_domain ON guardrails_project_types(domain_type);
CREATE INDEX IF NOT EXISTS idx_template_tags_name ON guardrails_template_tags(name);
CREATE INDEX IF NOT EXISTS idx_track_template_tags_template ON guardrails_track_template_tags(track_template_id);
CREATE INDEX IF NOT EXISTS idx_track_template_tags_tag ON guardrails_track_template_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_project_type_tags_project_type ON guardrails_project_type_tags(project_type_id);
CREATE INDEX IF NOT EXISTS idx_project_type_tags_tag ON guardrails_project_type_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_master_projects_project_type ON master_projects(project_type_id);

-- Enable RLS
ALTER TABLE guardrails_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_track_template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_project_type_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardrails_project_types (read-only for authenticated users)
CREATE POLICY "Authenticated users can view project types"
  ON guardrails_project_types
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for guardrails_template_tags (read-only for authenticated users)
CREATE POLICY "Authenticated users can view template tags"
  ON guardrails_template_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for guardrails_track_template_tags (read-only for authenticated users)
CREATE POLICY "Authenticated users can view track template tags"
  ON guardrails_track_template_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for guardrails_project_type_tags (read-only for authenticated users)
CREATE POLICY "Authenticated users can view project type tags"
  ON guardrails_project_type_tags
  FOR SELECT
  TO authenticated
  USING (true);