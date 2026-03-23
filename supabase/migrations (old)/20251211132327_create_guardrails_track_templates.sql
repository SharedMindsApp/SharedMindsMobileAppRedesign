/*
  # Add Domain Track Templates (Archetype System) to Guardrails

  This migration creates a reusable template system for tracks and sub-tracks
  linked to domain types. Projects can be initialized with intelligent defaults.

  1. New Tables
    - `guardrails_track_templates`
      - `id` (uuid, primary key)
      - `domain_type` (text, one of: work, personal, passion, startup)
      - `name` (text, track template name)
      - `description` (text, optional description)
      - `ordering_index` (integer, for display ordering)
      - `is_default` (boolean, auto-selected flag)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `guardrails_subtrack_templates`
      - `id` (uuid, primary key)
      - `track_template_id` (uuid, foreign key to track templates)
      - `name` (text, sub-track template name)
      - `description` (text, optional description)
      - `ordering_index` (integer, for display ordering)
      - `is_default` (boolean, auto-selected flag)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Read-only access for all authenticated users
    - Templates are system-managed

  3. Seed Data
    - Predefined templates for all 4 domain types
    - Startup: MVP Build, Marketing, Operations
    - Work: Strategic Work, Project Delivery, Skill Growth
    - Personal: Life Admin, Health, Learning
    - Passion: Creative Project, Craft/Hobby, Writing

  4. Constraints
    - Unique ordering per domain type
    - Cascade delete for sub-track templates
*/

-- Create guardrails_track_templates table
CREATE TABLE IF NOT EXISTS guardrails_track_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_type text NOT NULL CHECK (domain_type IN ('work', 'personal', 'passion', 'startup')),
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_track_template_order_per_domain UNIQUE(domain_type, ordering_index)
);

-- Create guardrails_subtrack_templates table
CREATE TABLE IF NOT EXISTS guardrails_subtrack_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_template_id uuid NOT NULL REFERENCES guardrails_track_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_subtrack_template_order_per_track UNIQUE(track_template_id, ordering_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_templates_domain ON guardrails_track_templates(domain_type);
CREATE INDEX IF NOT EXISTS idx_track_templates_ordering ON guardrails_track_templates(domain_type, ordering_index);
CREATE INDEX IF NOT EXISTS idx_subtrack_templates_track ON guardrails_subtrack_templates(track_template_id);
CREATE INDEX IF NOT EXISTS idx_subtrack_templates_ordering ON guardrails_subtrack_templates(track_template_id, ordering_index);

-- Enable RLS
ALTER TABLE guardrails_track_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_subtrack_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read-only access for authenticated users
CREATE POLICY "All authenticated users can view track templates"
  ON guardrails_track_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view subtrack templates"
  ON guardrails_subtrack_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to seed track templates (idempotent)
CREATE OR REPLACE FUNCTION seed_track_templates()
RETURNS void AS $$
DECLARE
  v_track_id uuid;
BEGIN
  -- Startup Domain Templates
  
  -- MVP Build
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'MVP Build', 'Core product development from concept to launch', 0, true)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Research', 'Market research and user discovery', 0, true),
    (v_track_id, 'UX/UI Design', 'User experience and interface design', 1, true),
    (v_track_id, 'Development', 'Core feature implementation', 2, true),
    (v_track_id, 'Testing', 'QA and user testing', 3, true),
    (v_track_id, 'Launch', 'Deployment and go-to-market', 4, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Marketing
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Marketing', 'Brand development and customer acquisition', 1, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Branding', 'Brand identity and positioning', 0, true),
    (v_track_id, 'Market Analysis', 'Competitor and market research', 1, true),
    (v_track_id, 'Acquisition', 'Customer acquisition channels', 2, true),
    (v_track_id, 'Content', 'Content creation and distribution', 3, true),
    (v_track_id, 'Analytics', 'Marketing metrics and optimization', 4, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Operations
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Operations', 'Business operations and infrastructure', 2, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Finance', 'Financial planning and management', 0, true),
    (v_track_id, 'Legal', 'Legal compliance and contracts', 1, true),
    (v_track_id, 'Infrastructure', 'Technical and operational infrastructure', 2, true),
    (v_track_id, 'Partnerships', 'Strategic partnerships and relationships', 3, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Work Domain Templates
  
  -- Strategic Work
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Strategic Work', 'High-level planning and strategic initiatives', 0, true)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Planning', 'Strategic planning and goal setting', 0, true),
    (v_track_id, 'Execution', 'Implementation of strategic initiatives', 1, true),
    (v_track_id, 'Review', 'Progress review and adjustment', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Project Delivery
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Project Delivery', 'End-to-end project execution', 1, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Requirements', 'Requirement gathering and analysis', 0, true),
    (v_track_id, 'Build', 'Development and implementation', 1, true),
    (v_track_id, 'QA', 'Quality assurance and testing', 2, true),
    (v_track_id, 'Delivery', 'Deployment and handoff', 3, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Skill Growth
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Skill Growth', 'Professional development and learning', 2, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Learning', 'Acquiring new knowledge and skills', 0, true),
    (v_track_id, 'Practice', 'Hands-on practice and application', 1, true),
    (v_track_id, 'Review', 'Assessment and feedback', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Personal Domain Templates
  
  -- Life Admin
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Life Admin', 'Personal administration and errands', 0, true)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Home', 'Home maintenance and organization', 0, true),
    (v_track_id, 'Finance', 'Personal finance management', 1, true),
    (v_track_id, 'Errands', 'Daily tasks and errands', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Health
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Health', 'Physical and mental wellness', 1, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Exercise', 'Physical activity and fitness', 0, true),
    (v_track_id, 'Nutrition', 'Diet and nutrition planning', 1, true),
    (v_track_id, 'Sleep', 'Sleep quality and routine', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Learning
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Learning', 'Personal education and skill development', 2, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Courses', 'Structured learning and courses', 0, true),
    (v_track_id, 'Practice', 'Hands-on practice and experimentation', 1, true),
    (v_track_id, 'Assessment', 'Testing knowledge and progress', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Passion Domain Templates
  
  -- Creative Project
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Creative Project', 'End-to-end creative work', 0, true)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Inspiration', 'Idea generation and research', 0, true),
    (v_track_id, 'Drafting', 'Initial creation and prototyping', 1, true),
    (v_track_id, 'Iteration', 'Refinement and improvement', 2, true),
    (v_track_id, 'Completion', 'Finalization and sharing', 3, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Craft / Hobby
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Craft / Hobby', 'Skill-based hobby development', 1, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Research', 'Learning techniques and methods', 0, true),
    (v_track_id, 'Practice', 'Regular practice and skill building', 1, true),
    (v_track_id, 'Build', 'Creating finished pieces', 2, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

  -- Writing
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Writing', 'Writing projects and publications', 2, false)
  ON CONFLICT (domain_type, ordering_index) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_track_id;
  
  INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
  VALUES 
    (v_track_id, 'Outline', 'Structure and planning', 0, true),
    (v_track_id, 'Write', 'First draft creation', 1, true),
    (v_track_id, 'Edit', 'Revision and editing', 2, true),
    (v_track_id, 'Publish', 'Publishing and sharing', 3, true)
  ON CONFLICT (track_template_id, ordering_index) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Execute seeding function
SELECT seed_track_templates();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_track_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_subtrack_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_track_template_updated_at_trigger ON guardrails_track_templates;
CREATE TRIGGER update_track_template_updated_at_trigger
  BEFORE UPDATE ON guardrails_track_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_track_template_updated_at();

DROP TRIGGER IF EXISTS update_subtrack_template_updated_at_trigger ON guardrails_subtrack_templates;
CREATE TRIGGER update_subtrack_template_updated_at_trigger
  BEFORE UPDATE ON guardrails_subtrack_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_subtrack_template_updated_at();
