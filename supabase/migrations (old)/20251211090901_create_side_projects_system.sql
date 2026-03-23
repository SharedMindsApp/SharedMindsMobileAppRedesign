/*
  # Side Projects System - Extending Master Projects

  1. New Tables
    - `side_projects`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master_projects)
      - `name` (text)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `side_project_tasks`
      - `id` (uuid, primary key)
      - `side_project_id` (uuid, foreign key to side_projects)
      - `title` (text)
      - `is_completed` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their side projects and tasks
    - All deletes cascade to maintain referential integrity

  3. Indexes
    - Index on master_project_id for side_projects
    - Index on side_project_id for side_project_tasks

  4. Notes
    - Side projects belong only to master projects (not directly to domains)
    - Each side project can have a maximum of 5 tasks (enforced at service layer)
    - Side projects cannot have sub-projects
*/

-- Create side_projects table
CREATE TABLE IF NOT EXISTS side_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create side_project_tasks table
CREATE TABLE IF NOT EXISTS side_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  side_project_id uuid NOT NULL REFERENCES side_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_side_projects_master_project_id ON side_projects(master_project_id);
CREATE INDEX IF NOT EXISTS idx_side_project_tasks_side_project_id ON side_project_tasks(side_project_id);

-- Enable RLS on both tables
ALTER TABLE side_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_project_tasks ENABLE ROW LEVEL SECURITY;

-- Side Projects policies
CREATE POLICY "Users can view their side projects"
  ON side_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create side projects in their master projects"
  ON side_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their side projects"
  ON side_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their side projects"
  ON side_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Side Project Tasks policies
CREATE POLICY "Users can view tasks in their side projects"
  ON side_project_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM side_projects sp
      JOIN master_projects mp ON mp.id = sp.master_project_id
      WHERE sp.id = side_project_tasks.side_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their side projects"
  ON side_project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM side_projects sp
      JOIN master_projects mp ON mp.id = sp.master_project_id
      WHERE sp.id = side_project_tasks.side_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their side projects"
  ON side_project_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM side_projects sp
      JOIN master_projects mp ON mp.id = sp.master_project_id
      WHERE sp.id = side_project_tasks.side_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM side_projects sp
      JOIN master_projects mp ON mp.id = sp.master_project_id
      WHERE sp.id = side_project_tasks.side_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their side projects"
  ON side_project_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM side_projects sp
      JOIN master_projects mp ON mp.id = sp.master_project_id
      WHERE sp.id = side_project_tasks.side_project_id
      AND mp.user_id = auth.uid()
    )
  );
