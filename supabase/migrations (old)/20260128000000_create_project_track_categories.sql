/*
  # Create Project Track Categories Table

  ## Overview
  Stores project-scoped track purpose categories (default system categories + custom project categories).
  Each main track in a project must have a purpose category assigned.
  
  ## Schema
  - `project_track_categories`: Stores categories for a project
  - `key`: Normalized identifier (used for system categories, auto-generated for custom)
  - `name`: Display name
  - `description`: Optional description
  - `is_system`: Whether this is a system category (seeded) or custom
  - Categories are project-scoped (not user-scoped)
  
  ## Security
  - RLS enabled
  - Users can only access categories for projects they own
*/

-- Create the project_track_categories table
CREATE TABLE IF NOT EXISTS project_track_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  master_project_id uuid NOT NULL
    REFERENCES master_projects(id)
    ON DELETE CASCADE,
  
  key text NOT NULL,              -- Normalized identifier (e.g., 'vision', 'self_improvement')
  name text NOT NULL,             -- Display name (e.g., 'Vision', 'Self-Improvement')
  description text,                -- Optional description
  
  is_system boolean NOT NULL DEFAULT false,  -- true for system categories, false for custom
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (master_project_id, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_track_categories_master_project
  ON project_track_categories(master_project_id);

CREATE INDEX IF NOT EXISTS idx_project_track_categories_is_system
  ON project_track_categories(master_project_id, is_system);

-- Enable RLS
ALTER TABLE project_track_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view categories for their projects
CREATE POLICY "Users can view categories for their projects"
  ON project_track_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_track_categories.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert categories for their projects
CREATE POLICY "Users can insert categories for their projects"
  ON project_track_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_track_categories.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update categories for their projects
CREATE POLICY "Users can update categories for their projects"
  ON project_track_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_track_categories.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_track_categories.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete categories for their projects (only custom, not system)
CREATE POLICY "Users can delete custom categories for their projects"
  ON project_track_categories
  FOR DELETE
  USING (
    NOT is_system
    AND EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_track_categories.master_project_id
      AND mp.user_id = auth.uid()
    )
  );
