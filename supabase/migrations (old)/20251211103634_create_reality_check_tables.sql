/*
  # Reality Check System - Skills and Tools Tables

  1. New Tables
    - user_skills: Skills the user already has
    - project_required_skills: Skills needed for each master project
    - user_tools: Tools the user owns
    - project_required_tools: Tools needed for each project

  2. Security
    - Enable RLS on all tables
    - Users can only access their own skills and tools
    - Users can manage required skills/tools for their projects

  3. Indexes
    - Index on user_id and master_project_id for performance
    - Index on name for faster matching

  4. Notes
    - Skills and tools stored as text for flexibility
    - Proficiency and importance use 1-5 scale
    - Feasibility calculations in application layer
*/

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  proficiency integer NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  created_at timestamptz DEFAULT now()
);

-- Create project_required_skills table
CREATE TABLE IF NOT EXISTS project_required_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  importance integer NOT NULL CHECK (importance >= 1 AND importance <= 5),
  estimated_learning_hours integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_tools table
CREATE TABLE IF NOT EXISTS user_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  cost numeric,
  created_at timestamptz DEFAULT now()
);

-- Create project_required_tools table
CREATE TABLE IF NOT EXISTS project_required_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  is_essential boolean DEFAULT false,
  estimated_cost numeric,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(name);
CREATE INDEX IF NOT EXISTS idx_project_required_skills_project_id ON project_required_skills(master_project_id);
CREATE INDEX IF NOT EXISTS idx_project_required_skills_name ON project_required_skills(name);
CREATE INDEX IF NOT EXISTS idx_user_tools_user_id ON user_tools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tools_name ON user_tools(name);
CREATE INDEX IF NOT EXISTS idx_project_required_tools_project_id ON project_required_tools(master_project_id);
CREATE INDEX IF NOT EXISTS idx_project_required_tools_name ON project_required_tools(name);

-- Enable RLS on all tables
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_required_tools ENABLE ROW LEVEL SECURITY;

-- User Skills policies
CREATE POLICY "Users can view their own skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Project Required Skills policies
CREATE POLICY "Users can view required skills for their projects"
  ON project_required_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add required skills to their projects"
  ON project_required_skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update required skills in their projects"
  ON project_required_skills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete required skills from their projects"
  ON project_required_skills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- User Tools policies
CREATE POLICY "Users can view their own tools"
  ON user_tools FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tools"
  ON user_tools FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tools"
  ON user_tools FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tools"
  ON user_tools FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Project Required Tools policies
CREATE POLICY "Users can view required tools for their projects"
  ON project_required_tools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_tools.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add required tools to their projects"
  ON project_required_tools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_tools.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update required tools in their projects"
  ON project_required_tools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_tools.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_tools.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete required tools from their projects"
  ON project_required_tools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_tools.master_project_id
      AND mp.user_id = auth.uid()
    )
  );