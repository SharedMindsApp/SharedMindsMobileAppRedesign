/*
  # Add parent_track_id column to guardrails_tracks
  
  This migration adds the parent_track_id column to the existing guardrails_tracks table.
  The original hierarchical tracks migration used CREATE TABLE IF NOT EXISTS, which
  didn't add the column if the table already existed from an earlier migration.
  
  This migration safely adds the column if it doesn't already exist.
*/

-- Add parent_track_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'parent_track_id'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN parent_track_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on parent_track_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_parent
  ON guardrails_tracks(parent_track_id);

-- Update the ordering index to include parent_track_id if needed
-- (This might fail if the index already exists with a different definition, but that's OK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'guardrails_tracks'
    AND indexname = 'idx_guardrails_tracks_ordering'
    AND indexdef LIKE '%parent_track_id%'
  ) THEN
    -- Drop the old index if it exists without parent_track_id
    DROP INDEX IF EXISTS idx_guardrails_tracks_ordering;
    
    -- Create the new index with parent_track_id
    CREATE INDEX idx_guardrails_tracks_ordering
      ON guardrails_tracks(master_project_id, parent_track_id, ordering_index);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Index might already exist with correct definition, ignore error
    NULL;
END $$;

-- Add metadata column if it doesn't exist (also needed for hierarchical system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Create GIN index on metadata if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_metadata
  ON guardrails_tracks USING gin(metadata);
