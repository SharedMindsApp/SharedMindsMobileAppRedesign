/*
  # Create Offshoot Ideas Table

  1. New Types
    - `idea_type` enum: 'exploration', 'idea_only', 'feature_request'

  2. New Tables
    - `offshoot_ideas`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master_projects)
      - `origin_task_id` (uuid, nullable, no FK constraint - for future use)
      - `title` (text, not null)
      - `description` (text, nullable)
      - `idea_type` (idea_type enum)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on `offshoot_ideas` table
    - Add policies for authenticated users to manage their offshoot ideas
    - Users can only access offshoot ideas for master projects they own

  4. Notes
    - Offshoot ideas always belong to a Master Project
    - They represent captured "drift" moments that need evaluation
    - Can optionally reference the task where the drift originated (stored as uuid)
    - Cascade delete when master project is deleted
*/

-- Create idea_type enum
DO $$ BEGIN
  CREATE TYPE idea_type AS ENUM ('exploration', 'idea_only', 'feature_request');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create offshoot_ideas table
CREATE TABLE IF NOT EXISTS offshoot_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  origin_task_id uuid,
  title text NOT NULL,
  description text,
  idea_type idea_type NOT NULL DEFAULT 'idea_only',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offshoot_ideas ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_offshoot_ideas_master_project ON offshoot_ideas(master_project_id);
CREATE INDEX IF NOT EXISTS idx_offshoot_ideas_origin_task ON offshoot_ideas(origin_task_id);

-- RLS Policies: Users can view offshoot ideas for their master projects
CREATE POLICY "Users can view their offshoot ideas"
  ON offshoot_ideas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = offshoot_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can create offshoot ideas in their master projects
CREATE POLICY "Users can create offshoot ideas in their master projects"
  ON offshoot_ideas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = offshoot_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can update their offshoot ideas
CREATE POLICY "Users can update their offshoot ideas"
  ON offshoot_ideas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = offshoot_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = offshoot_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can delete their offshoot ideas
CREATE POLICY "Users can delete their offshoot ideas"
  ON offshoot_ideas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = offshoot_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_offshoot_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offshoot_ideas_updated_at ON offshoot_ideas;
CREATE TRIGGER offshoot_ideas_updated_at
  BEFORE UPDATE ON offshoot_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_offshoot_ideas_updated_at();