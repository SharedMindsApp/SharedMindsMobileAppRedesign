/*
  # Add Sub-Tracks to Guardrails Architecture

  This migration extends the existing Tracks system by adding a Sub-Track layer
  for additional organizational structure within tracks.

  1. New Table
    - `guardrails_subtracks`
      - `id` (uuid, primary key)
      - `track_id` (uuid, foreign key to guardrails_tracks)
      - `name` (text, sub-track title)
      - `description` (text, optional description)
      - `ordering_index` (integer, for ordering within track)
      - `is_default` (boolean, flag for wizard-created sub-tracks)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Schema Extensions
    - Add `subtrack_id` to `roadmap_items` (nullable)
    - Add `subtrack_id` to `side_ideas` (nullable)
    - Add `subtrack_id` to `focus_sessions` (nullable)

  3. Security
    - Enable RLS on `guardrails_subtracks`
    - Users can only access sub-tracks belonging to their tracks
    - Cascade deletion: deleting a track removes all its sub-tracks
    - Nullify references: deleting a sub-track sets items to NULL

  4. Constraints
    - Unique ordering within each track
    - Foreign key constraints with appropriate CASCADE/SET NULL behavior
*/

-- Create guardrails_subtracks table
CREATE TABLE IF NOT EXISTS guardrails_subtracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique ordering within each track
  CONSTRAINT unique_subtrack_order_per_track UNIQUE(track_id, ordering_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtracks_track_id ON guardrails_subtracks(track_id);
CREATE INDEX IF NOT EXISTS idx_subtracks_ordering ON guardrails_subtracks(track_id, ordering_index);

-- Enable RLS
ALTER TABLE guardrails_subtracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardrails_subtracks
-- Users can view sub-tracks if they own the parent track
CREATE POLICY "Users can view subtracks of their tracks"
  ON guardrails_subtracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert sub-tracks if they own the parent track
CREATE POLICY "Users can create subtracks for their tracks"
  ON guardrails_subtracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update sub-tracks if they own the parent track
CREATE POLICY "Users can update their subtracks"
  ON guardrails_subtracks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete sub-tracks if they own the parent track
CREATE POLICY "Users can delete their subtracks"
  ON guardrails_subtracks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  );

-- Add subtrack_id to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' AND column_name = 'subtrack_id'
  ) THEN
    ALTER TABLE roadmap_items ADD COLUMN subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_subtrack_id ON roadmap_items(subtrack_id);
  END IF;
END $$;

-- Add subtrack_id to side_ideas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'side_ideas' AND column_name = 'subtrack_id'
  ) THEN
    ALTER TABLE side_ideas ADD COLUMN subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_side_ideas_subtrack_id ON side_ideas(subtrack_id);
  END IF;
END $$;

-- Add subtrack_id to focus_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'subtrack_id'
  ) THEN
    ALTER TABLE focus_sessions ADD COLUMN subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_subtrack_id ON focus_sessions(subtrack_id);
  END IF;
END $$;

-- Function to auto-increment ordering_index within a track
CREATE OR REPLACE FUNCTION set_subtrack_ordering_index()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ordering_index IS NULL OR NEW.ordering_index = 0 THEN
    SELECT COALESCE(MAX(ordering_index), 0) + 1
    INTO NEW.ordering_index
    FROM guardrails_subtracks
    WHERE track_id = NEW.track_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set ordering_index
DROP TRIGGER IF EXISTS set_subtrack_ordering_index_trigger ON guardrails_subtracks;
CREATE TRIGGER set_subtrack_ordering_index_trigger
  BEFORE INSERT ON guardrails_subtracks
  FOR EACH ROW
  EXECUTE FUNCTION set_subtrack_ordering_index();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subtrack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_subtrack_updated_at_trigger ON guardrails_subtracks;
CREATE TRIGGER update_subtrack_updated_at_trigger
  BEFORE UPDATE ON guardrails_subtracks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtrack_updated_at();
