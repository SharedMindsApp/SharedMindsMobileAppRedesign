/*
  # Create Guardrails Tracks System

  1. New Tables
    - `guardrails_tracks`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master_projects)
      - `name` (text, required) - Track name like "MVP Build", "Research", "Marketing"
      - `description` (text, nullable) - Optional description of track purpose
      - `color` (text, nullable) - Hex color or tailwind color token for visual grouping
      - `ordering_index` (integer, required) - For track ordering within project
      - `is_default` (boolean) - True if created by wizard/template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (master_project_id, ordering_index)

  2. Track References in Existing Tables
    - Add `track_id` (uuid, nullable) to:
      - `roadmap_items` - Group roadmap items by track
      - `side_ideas` - Associate side ideas with tracks
      - `focus_sessions` - Track focus sessions by track

  3. Security
    - Enable RLS on guardrails_tracks table
    - Users can only access tracks for their own master projects
    - All policies follow existing Guardrails security patterns

  4. Cascade Behavior
    - When master_project is deleted, tracks cascade delete
    - When track is deleted, track_id is set to NULL on referenced items

  5. Important Notes
    - All track_id columns are nullable for backward compatibility
    - No existing data requires modification
    - Tracks provide structural organization for all Guardrails modules
    - Wizard integration will come in future migrations
*/

-- Create guardrails_tracks table
CREATE TABLE IF NOT EXISTS guardrails_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  ordering_index integer NOT NULL DEFAULT 0 CHECK (ordering_index >= 0),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (master_project_id, ordering_index)
);

-- Add track_id to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE roadmap_items 
    ADD COLUMN track_id uuid REFERENCES guardrails_tracks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add track_id to side_ideas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'side_ideas' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE side_ideas 
    ADD COLUMN track_id uuid REFERENCES guardrails_tracks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add track_id to focus_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE focus_sessions 
    ADD COLUMN track_id uuid REFERENCES guardrails_tracks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_master_project ON guardrails_tracks(master_project_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_ordering ON guardrails_tracks(master_project_id, ordering_index);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_track ON roadmap_items(track_id);
CREATE INDEX IF NOT EXISTS idx_side_ideas_track ON side_ideas(track_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_track ON focus_sessions(track_id);

-- Enable Row Level Security
ALTER TABLE guardrails_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardrails_tracks
CREATE POLICY "Users can view tracks for their master projects"
  ON guardrails_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tracks for their master projects"
  ON guardrails_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tracks for their master projects"
  ON guardrails_tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tracks for their master projects"
  ON guardrails_tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guardrails_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for guardrails_tracks
DROP TRIGGER IF EXISTS guardrails_tracks_updated_at ON guardrails_tracks;
CREATE TRIGGER guardrails_tracks_updated_at
  BEFORE UPDATE ON guardrails_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_guardrails_tracks_updated_at();
