/*
  # Fix guardrails_tracks unique constraint for hierarchical tracks
  
  The original migration created a UNIQUE constraint on (master_project_id, ordering_index),
  which doesn't work for hierarchical tracks where subtracks (tracks with parent_track_id)
  should have independent ordering_index values per parent track.
  
  This migration:
  1. Drops the old unique constraint
  2. Creates a new unique constraint that includes parent_track_id
  3. Updates the ordering index to support hierarchical ordering
*/

-- Drop the old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guardrails_tracks_master_project_id_ordering_index_key'
  ) THEN
    ALTER TABLE guardrails_tracks
    DROP CONSTRAINT guardrails_tracks_master_project_id_ordering_index_key;
  END IF;
END $$;

-- Create new unique constraint that includes parent_track_id
-- This allows subtracks to have their own ordering_index values per parent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guardrails_tracks_master_project_parent_ordering_key'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD CONSTRAINT guardrails_tracks_master_project_parent_ordering_key
    UNIQUE (master_project_id, parent_track_id, ordering_index);
  END IF;
END $$;

-- Note: The index idx_guardrails_tracks_ordering already includes parent_track_id,
-- so we don't need to recreate it
