/*
  # Create Mind Mesh Node System

  1. New Tables
    - `guardrails_nodes`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master projects)
      - `track_id` (uuid, optional foreign key to tracks)
      - `subtrack_id` (uuid, optional foreign key to subtracks)
      - `title` (text)
      - `content` (text, optional description)
      - `node_type` (text: idea, task, note, offshoot, group)
      - `x_position` (double precision)
      - `y_position` (double precision)
      - `width` (double precision)
      - `height` (double precision)
      - `color` (text, hex color)
      - `is_offshoot` (boolean, for drift tracking)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `guardrails_node_links`
      - `id` (uuid, primary key)
      - `from_node_id` (uuid, foreign key to nodes)
      - `to_node_id` (uuid, foreign key to nodes)
      - `link_type` (text: dependency, supporting, reference, offshoot)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access nodes belonging to their own master projects
    - Links inherit security from nodes

  3. Performance
    - Index on master_project_id for fast project loading
    - Index on track_id and subtrack_id for filtering
    - Index on x_position/y_position for spatial queries
    - Index on from/to node ids for link queries
*/

-- Create guardrails_nodes table
CREATE TABLE IF NOT EXISTS guardrails_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid REFERENCES guardrails_tracks(id) ON DELETE SET NULL,
  subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE SET NULL,
  title text DEFAULT '',
  content text DEFAULT '',
  node_type text NOT NULL CHECK (node_type IN ('idea', 'task', 'note', 'offshoot', 'group')),
  x_position double precision NOT NULL DEFAULT 0,
  y_position double precision NOT NULL DEFAULT 0,
  width double precision DEFAULT 200,
  height double precision DEFAULT 100,
  color text DEFAULT '#ffffff',
  is_offshoot boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create guardrails_node_links table
CREATE TABLE IF NOT EXISTS guardrails_node_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id uuid NOT NULL REFERENCES guardrails_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES guardrails_nodes(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('dependency', 'supporting', 'reference', 'offshoot')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_node_id, to_node_id, link_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_master_project ON guardrails_nodes(master_project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_track ON guardrails_nodes(track_id);
CREATE INDEX IF NOT EXISTS idx_nodes_subtrack ON guardrails_nodes(subtrack_id);
CREATE INDEX IF NOT EXISTS idx_nodes_position ON guardrails_nodes(master_project_id, x_position, y_position);
CREATE INDEX IF NOT EXISTS idx_nodes_offshoot ON guardrails_nodes(master_project_id, is_offshoot);
CREATE INDEX IF NOT EXISTS idx_node_links_from ON guardrails_node_links(from_node_id);
CREATE INDEX IF NOT EXISTS idx_node_links_to ON guardrails_node_links(to_node_id);

-- Enable RLS
ALTER TABLE guardrails_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails_node_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardrails_nodes

-- Users can view nodes in their own projects
CREATE POLICY "Users can view own project nodes"
  ON guardrails_nodes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = guardrails_nodes.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can insert nodes in their own projects
CREATE POLICY "Users can insert nodes in own projects"
  ON guardrails_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = guardrails_nodes.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can update nodes in their own projects
CREATE POLICY "Users can update own project nodes"
  ON guardrails_nodes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = guardrails_nodes.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = guardrails_nodes.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can delete nodes in their own projects
CREATE POLICY "Users can delete own project nodes"
  ON guardrails_nodes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = guardrails_nodes.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- RLS Policies for guardrails_node_links

-- Users can view links between their own nodes
CREATE POLICY "Users can view own node links"
  ON guardrails_node_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_nodes
      JOIN master_projects ON guardrails_nodes.master_project_id = master_projects.id
      WHERE guardrails_nodes.id = guardrails_node_links.from_node_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can create links between their own nodes
CREATE POLICY "Users can create links in own projects"
  ON guardrails_node_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_nodes
      JOIN master_projects ON guardrails_nodes.master_project_id = master_projects.id
      WHERE guardrails_nodes.id = guardrails_node_links.from_node_id
      AND master_projects.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM guardrails_nodes
      JOIN master_projects ON guardrails_nodes.master_project_id = master_projects.id
      WHERE guardrails_nodes.id = guardrails_node_links.to_node_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can delete their own node links
CREATE POLICY "Users can delete own node links"
  ON guardrails_node_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_nodes
      JOIN master_projects ON guardrails_nodes.master_project_id = master_projects.id
      WHERE guardrails_nodes.id = guardrails_node_links.from_node_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_guardrails_nodes_updated_at ON guardrails_nodes;
CREATE TRIGGER update_guardrails_nodes_updated_at
  BEFORE UPDATE ON guardrails_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
