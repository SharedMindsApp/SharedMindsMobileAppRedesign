/*
  # Create Task Flow System with Roadmap One-Way Sync

  1. New Tables
    - `taskflow_tasks`
      - `id` (uuid, primary key)
      - `roadmap_item_id` (uuid, nullable, references roadmap_items)
      - `master_project_id` (uuid, references master_projects)
      - `title` (text)
      - `description` (text, nullable)
      - `status` (roadmap_item_status enum)
      - `archived` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `synced_at` (timestamptz, nullable - last sync from roadmap)

  2. Indexes
    - Unique index on roadmap_item_id (one task per roadmap item)
    - Index on master_project_id for project filtering
    - Index on status for Kanban views

  3. Security
    - Enable RLS
    - Users can view tasks in projects they have access to
    - Users can edit tasks in projects they have editor+ permissions

  4. Notes
    - Task Flow is a derived execution view from Roadmap
    - Roadmap remains source of truth
    - Only task, habit, goal types sync to Task Flow
    - Backward compatible: tasks can exist without roadmap linkage
*/

-- Create taskflow_tasks table
CREATE TABLE IF NOT EXISTS taskflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status roadmap_item_status NOT NULL DEFAULT 'not_started',
  archived boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_taskflow_tasks_roadmap_item_unique 
ON taskflow_tasks(roadmap_item_id) 
WHERE roadmap_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_taskflow_tasks_project 
ON taskflow_tasks(master_project_id) 
WHERE NOT archived;

CREATE INDEX IF NOT EXISTS idx_taskflow_tasks_status 
ON taskflow_tasks(master_project_id, status) 
WHERE NOT archived;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_taskflow_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_taskflow_tasks_updated_at ON taskflow_tasks;
CREATE TRIGGER update_taskflow_tasks_updated_at
  BEFORE UPDATE ON taskflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_taskflow_tasks_updated_at();

-- Enable RLS
ALTER TABLE taskflow_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Reuse project permissions
-- Users can view tasks in projects they have access to
CREATE POLICY "Users can view tasks in their projects"
  ON taskflow_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.master_project_id = taskflow_tasks.master_project_id
      AND project_users.user_id = auth.uid()
    )
  );

-- Users with editor+ role can create tasks
CREATE POLICY "Editors can create tasks"
  ON taskflow_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.master_project_id = taskflow_tasks.master_project_id
      AND project_users.user_id = auth.uid()
      AND project_users.role IN ('editor', 'owner')
    )
  );

-- Users with editor+ role can update tasks
CREATE POLICY "Editors can update tasks"
  ON taskflow_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.master_project_id = taskflow_tasks.master_project_id
      AND project_users.user_id = auth.uid()
      AND project_users.role IN ('editor', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.master_project_id = taskflow_tasks.master_project_id
      AND project_users.user_id = auth.uid()
      AND project_users.role IN ('editor', 'owner')
    )
  );

-- Users with editor+ role can delete tasks
CREATE POLICY "Editors can delete tasks"
  ON taskflow_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.master_project_id = taskflow_tasks.master_project_id
      AND project_users.user_id = auth.uid()
      AND project_users.role IN ('editor', 'owner')
    )
  );

-- Add helpful comments
COMMENT ON TABLE taskflow_tasks IS 'Task Flow execution view - derived from Roadmap Items. Roadmap is source of truth.';
COMMENT ON COLUMN taskflow_tasks.roadmap_item_id IS 'Optional link to roadmap_items. One-way sync: only task, habit, goal types create Task Flow entries.';
COMMENT ON COLUMN taskflow_tasks.synced_at IS 'Last time this task was synced from its linked roadmap item. NULL if not synced or standalone task.';