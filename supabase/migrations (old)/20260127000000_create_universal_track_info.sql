/*
  # Create Universal Track Info Table

  ## Overview
  Stores Layer 1 universal mandatory information for main tracks (not subtracks).
  This information is required for every track created through the Quick Setup wizard.

  ## Schema
  - `universal_track_info`: Stores objective, definition of done, and time intent for each track
  - One row per track (enforced by UNIQUE constraint on track_id)
  - Cascades on track/project deletion

  ## Validation Rules (enforced in app logic)
  - objective: required (NOT NULL)
  - definition_of_done: required (NOT NULL)
  - time_mode: required (NOT NULL, CHECK constraint)
  - If time_mode = 'target' → target_date required
  - If time_mode = 'ranged' → start_date and end_date required
  - Other date fields must be NULL when not applicable

  ## Security
  - RLS enabled
  - Users can only access info for tracks in projects they own
*/

-- Create the universal_track_info table
CREATE TABLE IF NOT EXISTS universal_track_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  master_project_id uuid NOT NULL
    REFERENCES master_projects(id)
    ON DELETE CASCADE,

  track_id uuid NOT NULL
    REFERENCES guardrails_tracks(id)
    ON DELETE CASCADE,

  objective text NOT NULL,
  definition_of_done text NOT NULL,

  time_mode text NOT NULL CHECK (
    time_mode IN ('unscheduled', 'target', 'ranged', 'ongoing')
  ),

  start_date date NULL,
  end_date date NULL,
  target_date date NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (track_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_universal_track_info_master_project
  ON universal_track_info(master_project_id);

CREATE INDEX IF NOT EXISTS idx_universal_track_info_track
  ON universal_track_info(track_id);

-- Enable RLS
ALTER TABLE universal_track_info ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access universal_track_info for projects they own
-- Drop policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can view universal_track_info for their projects" ON universal_track_info;
DROP POLICY IF EXISTS "Users can insert universal_track_info for their projects" ON universal_track_info;
DROP POLICY IF EXISTS "Users can update universal_track_info for their projects" ON universal_track_info;
DROP POLICY IF EXISTS "Users can delete universal_track_info for their projects" ON universal_track_info;

CREATE POLICY "Users can view universal_track_info for their projects"
  ON universal_track_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = universal_track_info.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert universal_track_info for their projects"
  ON universal_track_info
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = universal_track_info.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update universal_track_info for their projects"
  ON universal_track_info
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = universal_track_info.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = universal_track_info.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete universal_track_info for their projects"
  ON universal_track_info
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = universal_track_info.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_universal_track_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to allow re-running migration)
DROP TRIGGER IF EXISTS update_universal_track_info_updated_at ON universal_track_info;

CREATE TRIGGER update_universal_track_info_updated_at
  BEFORE UPDATE ON universal_track_info
  FOR EACH ROW
  EXECUTE FUNCTION update_universal_track_info_updated_at();
