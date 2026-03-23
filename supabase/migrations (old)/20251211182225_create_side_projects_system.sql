/*
  # Create Side Projects System

  1. New Tables
    - `side_projects`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master projects)
      - `title` (text, required)
      - `description` (text, optional)
      - `color` (text, default purple #A855F7)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `archived_at` (timestamptz, null when active)

  2. Modifications
    - Add `side_project_id` foreign key to roadmap_items
    - Add `side_project_id` foreign key to guardrails_nodes
    
  3. Purpose
    - Side projects are "secondary orbit" mini-projects connected to a master project
    - Visually distinct with purple color (#A855F7)
    - Can be converted to full master projects
    - Tracked separately from main tracks and offshoots

  4. Security
    - Enable RLS on side_projects table
    - Users can only access side projects for their own master projects
*/

-- Drop existing if recreating
DROP TABLE IF EXISTS side_projects CASCADE;

-- Create side_projects table
CREATE TABLE side_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text DEFAULT '#A855F7',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz DEFAULT NULL
);

-- Add indexes for performance
CREATE INDEX idx_side_projects_master_project ON side_projects(master_project_id) WHERE archived_at IS NULL;
CREATE INDEX idx_side_projects_created ON side_projects(created_at DESC);

-- Add foreign keys to link items to side projects
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS side_project_id uuid REFERENCES side_projects(id) ON DELETE SET NULL;
ALTER TABLE guardrails_nodes ADD COLUMN IF NOT EXISTS side_project_id uuid REFERENCES side_projects(id) ON DELETE SET NULL;

-- Add indexes for side project queries
CREATE INDEX IF NOT EXISTS idx_roadmap_items_side_project ON roadmap_items(side_project_id) WHERE side_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_side_project ON guardrails_nodes(side_project_id) WHERE side_project_id IS NOT NULL;

-- Enable RLS
ALTER TABLE side_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for side_projects
CREATE POLICY "Users can view side projects for their master projects"
  ON side_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create side projects for their master projects"
  ON side_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their side projects"
  ON side_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their side projects"
  ON side_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_projects.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Create a view for side project statistics
CREATE OR REPLACE VIEW side_projects_stats AS
SELECT 
  sp.id,
  sp.master_project_id,
  sp.title,
  sp.color,
  COUNT(DISTINCT ri.id) as roadmap_items_count,
  COUNT(DISTINCT n.id) as nodes_count,
  COUNT(DISTINCT ri.id) + COUNT(DISTINCT n.id) as total_items_count,
  sp.created_at,
  sp.updated_at,
  sp.archived_at
FROM side_projects sp
LEFT JOIN roadmap_items ri ON ri.side_project_id = sp.id
LEFT JOIN guardrails_nodes n ON n.side_project_id = sp.id
GROUP BY sp.id, sp.master_project_id, sp.title, sp.color, sp.created_at, sp.updated_at, sp.archived_at;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_side_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger
DROP TRIGGER IF EXISTS trigger_update_side_project_timestamp ON side_projects;
CREATE TRIGGER trigger_update_side_project_timestamp
  BEFORE UPDATE ON side_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_side_project_timestamp();
