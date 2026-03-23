/**
 * Phase 3.3: Track Documents Table
 * 
 * Creates the track_documents table for storing document metadata
 * in Track & Subtrack Workspaces.
 * 
 * Documents belong to workspaces, not roadmap.
 * Documents are workspace-owned domain data.
 */

-- Create track_documents table
CREATE TABLE IF NOT EXISTS track_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT track_documents_track_subtrack_check CHECK (
    (subtrack_id IS NULL) OR (track_id != subtrack_id)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_documents_track_id ON track_documents(track_id);
CREATE INDEX IF NOT EXISTS idx_track_documents_subtrack_id ON track_documents(subtrack_id) WHERE subtrack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_documents_uploaded_by ON track_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_track_documents_uploaded_at ON track_documents(uploaded_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_track_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_documents_updated_at
  BEFORE UPDATE ON track_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_track_documents_updated_at();

-- RLS Policies
ALTER TABLE track_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for tracks they have access to
CREATE POLICY "Users can view documents for accessible tracks"
  ON track_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      WHERE t.id = track_documents.track_id
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

-- Policy: Users can insert documents for tracks they own
CREATE POLICY "Users can insert documents for owned tracks"
  ON track_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_documents.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Policy: Users can update documents they uploaded or for tracks they own
CREATE POLICY "Users can update documents for owned tracks"
  ON track_documents
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_documents.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Policy: Users can delete documents they uploaded or for tracks they own
CREATE POLICY "Users can delete documents for owned tracks"
  ON track_documents
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM guardrails_tracks t
      INNER JOIN master_projects mp ON mp.id = t.master_project_id
      WHERE t.id = track_documents.track_id
      AND mp.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE track_documents IS 'Documents stored in Track & Subtrack Workspaces. Documents belong to workspaces, not roadmap.';
COMMENT ON COLUMN track_documents.track_id IS 'Parent track ID. Required.';
COMMENT ON COLUMN track_documents.subtrack_id IS 'Subtrack ID if document belongs to a subtrack. NULL if document belongs to parent track.';
COMMENT ON COLUMN track_documents.file_path IS 'Path in Supabase Storage bucket: {projectId}/{trackId}/{subtrackId?}/{documentId}';
COMMENT ON COLUMN track_documents.metadata IS 'Additional document metadata (JSON).';
