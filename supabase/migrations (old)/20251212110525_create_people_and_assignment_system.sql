/*
  # People and Task Assignment System

  1. Overview
    - Introduces project-scoped People (not system users)
    - Enables many-to-many assignment of people to roadmap items
    - Purely informational - no permissions or access control
    - Analytics-ready for future workflow automation

  2. New Tables
    - `project_people`
      - Project-scoped people involved in projects
      - May or may not be system users
      - Supports name, email, role metadata
      - Soft-delete support via archived flag
    
    - `roadmap_item_assignees`
      - Many-to-many junction table
      - Links people to roadmap items
      - Tracks assignment timestamp for analytics

  3. Security
    - RLS enabled on both tables
    - Access controlled through project ownership
    - No invitation or authentication logic

  4. Important Notes
    - UI terminology: "People"
    - Domain model: project-scoped entities
    - Assignment is informational, not enforceable
    - No permissions implications
*/

-- Create project_people table
CREATE TABLE IF NOT EXISTS project_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_name CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create roadmap_item_assignees junction table
CREATE TABLE IF NOT EXISTS roadmap_item_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES project_people(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate assignments
  CONSTRAINT unique_assignment UNIQUE (roadmap_item_id, person_id)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_people_master_project 
  ON project_people(master_project_id) WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_project_people_email 
  ON project_people(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_assignees_item 
  ON roadmap_item_assignees(roadmap_item_id);

CREATE INDEX IF NOT EXISTS idx_roadmap_assignees_person 
  ON roadmap_item_assignees(person_id);

-- Add updated_at trigger for project_people
CREATE OR REPLACE FUNCTION update_project_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_people_updated_at
  BEFORE UPDATE ON project_people
  FOR EACH ROW
  EXECUTE FUNCTION update_project_people_updated_at();

-- Enable RLS
ALTER TABLE project_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_item_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_people
CREATE POLICY "Users can view people in their projects"
  ON project_people
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_people.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create people in their projects"
  ON project_people
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_people.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update people in their projects"
  ON project_people
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_people.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_people.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete people in their projects"
  ON project_people
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_people.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies for roadmap_item_assignees
CREATE POLICY "Users can view assignments in their projects"
  ON roadmap_item_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN guardrails_tracks gt ON gt.id = ri.track_id
      JOIN master_projects mp ON mp.id = gt.master_project_id
      WHERE ri.id = roadmap_item_assignees.roadmap_item_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assignments in their projects"
  ON roadmap_item_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN guardrails_tracks gt ON gt.id = ri.track_id
      JOIN master_projects mp ON mp.id = gt.master_project_id
      WHERE ri.id = roadmap_item_assignees.roadmap_item_id
      AND mp.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM project_people pp
      JOIN master_projects mp ON mp.id = pp.master_project_id
      WHERE pp.id = roadmap_item_assignees.person_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignments in their projects"
  ON roadmap_item_assignees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN guardrails_tracks gt ON gt.id = ri.track_id
      JOIN master_projects mp ON mp.id = gt.master_project_id
      WHERE ri.id = roadmap_item_assignees.roadmap_item_id
      AND mp.user_id = auth.uid()
    )
  );