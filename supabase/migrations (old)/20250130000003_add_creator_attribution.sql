/*
  # Add Creator Attribution to Tracks and Subtracks (Phase 1)
  
  This migration adds creator provenance tracking to tracks and subtracks.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  1. Columns Added
    - guardrails_tracks.created_by (nullable, references profiles.id)
    - guardrails_subtracks.created_by (nullable, references profiles.id)
  
  2. Constraints
    - Foreign key to profiles.id
    - Nullable for backward compatibility
    - No backfill in Phase 1 (Phase 3)
  
  3. Security
    - No RLS policy changes (existing policies remain)
    - Column exists only to support creator rights in later phases
  
  4. Notes
    - All changes are additive (no existing columns modified)
    - No data migration (backfill in Phase 3)
    - No triggers (service layer sets created_by in Phase 2)
*/

-- Add created_by to guardrails_tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for created_by on guardrails_tracks
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_created_by 
  ON guardrails_tracks(created_by) 
  WHERE created_by IS NOT NULL;

-- Add created_by to guardrails_subtracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_subtracks' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE guardrails_subtracks
    ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for created_by on guardrails_subtracks
CREATE INDEX IF NOT EXISTS idx_guardrails_subtracks_created_by 
  ON guardrails_subtracks(created_by) 
  WHERE created_by IS NOT NULL;

-- Comments
COMMENT ON COLUMN guardrails_tracks.created_by IS 'User who created the track (references profiles.id). Used for creator default rights.';
COMMENT ON COLUMN guardrails_subtracks.created_by IS 'User who created the subtrack (references profiles.id). Used for creator default rights.';
