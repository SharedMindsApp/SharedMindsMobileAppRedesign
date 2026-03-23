/**
 * Phase 3.4: Track Research Notes Table
 * 
 * Creates the track_research_notes table for storing research notes
 * in Track & Subtrack Workspaces.
 * 
 * Research notes belong to workspaces, not roadmap.
 * Research notes are workspace-owned domain data.
 */

-- Create track_research_notes table
CREATE TABLE IF NOT EXISTS track_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  source_urls text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT track_research_notes_track_subtrack_check CHECK (
    (subtrack_id IS NULL) OR (track_id != subtrack_id)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_research_notes_track_id ON track_research_notes(track_id);
CREATE INDEX IF NOT EXISTS idx_track_research_notes_subtrack_id ON track_research_notes(subtrack_id) WHERE subtrack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_research_notes_created_by ON track_research_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_track_research_notes_updated_at ON track_research_notes(updated_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_track_research_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_research_notes_updated_at
  BEFORE UPDATE ON track_research_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_track_research_notes_updated_at();

-- RLS Policies
ALTER TABLE track_research_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view research notes for tracks they have access to
CREATE POLICY "Users can view research notes for accessible tracks"
  ON track_research_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      WHERE t.id = track_research_notes.track_id
      AND (
        -- User owns the project
        EXISTS (
          SELECT 1 FROM master_projects mp
          WHERE mp.id = t.master_project_id
          AND mp.user_id = auth.uid()
        )
        OR
        -- User has access via collaboration (future)
        FALSE
      )
    )
  );

-- Policy: Users can insert research notes for tracks they own
CREATE POLICY "Users can insert research notes for owned tracks"
  ON track_research_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_research_notes.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Policy: Users can update research notes they created or for tracks they own
CREATE POLICY "Users can update research notes for owned tracks"
  ON track_research_notes
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_research_notes.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Policy: Users can delete research notes they created or for tracks they own
CREATE POLICY "Users can delete research notes for owned tracks"
  ON track_research_notes
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_research_notes.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE track_research_notes IS 'Research notes stored in Track & Subtrack Workspaces. Research notes belong to workspaces, not roadmap.';
COMMENT ON COLUMN track_research_notes.track_id IS 'Parent track ID. Required.';
COMMENT ON COLUMN track_research_notes.subtrack_id IS 'Subtrack ID if note belongs to a subtrack. NULL if note belongs to parent track.';
COMMENT ON COLUMN track_research_notes.source_urls IS 'Array of source URLs for this research note.';
COMMENT ON COLUMN track_research_notes.tags IS 'Array of tags for categorizing research notes.';
