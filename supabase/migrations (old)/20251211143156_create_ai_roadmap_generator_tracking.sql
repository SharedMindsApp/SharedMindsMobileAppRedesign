/*
  # Create AI Roadmap Generator Tracking System

  1. New Fields
    - Add `generation_group` to `roadmap_items`
      - Groups items created together by AI
      - Allows tracking multiple AI generation runs
      - UUID type for unique identification per batch
    - Add `subtrack_id` to `roadmap_items`
      - Links items to subtracks when applicable
      - References guardrails_subtracks table
    - Add `estimated_hours` to `roadmap_items`
      - For AI-generated time estimates

  2. New Tables
    - `ai_logs`
      - Tracks all AI generation attempts
      - Stores prompts, responses, and errors
      - Essential for debugging and improving prompts
      - Columns:
        - `id` (uuid, primary key)
        - `master_project_id` (uuid, foreign key)
        - `generation_group` (uuid, links to generated items)
        - `model` (text, which LLM was used)
        - `prompt` (text, the full prompt sent)
        - `output` (text, raw LLM response)
        - `error` (text, any errors encountered)
        - `tokens_used` (integer, for cost tracking)
        - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `ai_logs`
    - Users can only view logs for their own projects

  4. Important Notes
    - Generation groups allow re-running AI without duplication
    - Logs help improve prompt engineering over time
    - Nullable generation_group for manual items
*/

-- Add generation_group to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' 
    AND column_name = 'generation_group'
  ) THEN
    ALTER TABLE roadmap_items 
    ADD COLUMN generation_group uuid;
  END IF;
END $$;

-- Add subtrack_id to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' 
    AND column_name = 'subtrack_id'
  ) THEN
    ALTER TABLE roadmap_items 
    ADD COLUMN subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add estimated_hours to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' 
    AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE roadmap_items 
    ADD COLUMN estimated_hours integer;
  END IF;
END $$;

-- Create AI logs table
CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  generation_group uuid NOT NULL,
  model text NOT NULL,
  prompt text NOT NULL,
  output text,
  error text,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own project AI logs" ON ai_logs;
  DROP POLICY IF EXISTS "Users can insert AI logs" ON ai_logs;
END $$;

-- Users can view logs for their own projects
CREATE POLICY "Users can view own project AI logs"
  ON ai_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = ai_logs.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can insert logs for their own projects
CREATE POLICY "Users can insert AI logs"
  ON ai_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = ai_logs.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_project_id 
  ON ai_logs(master_project_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_generation_group 
  ON ai_logs(generation_group);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_generation_group 
  ON roadmap_items(generation_group) 
  WHERE generation_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_subtrack 
  ON roadmap_items(subtrack_id) 
  WHERE subtrack_id IS NOT NULL;
