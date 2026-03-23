/*
  # Add Shared Tracks Architecture to guardrails_tracks

  ## Summary
  Applies the shared tracks architecture to the active unified tracks table (guardrails_tracks).
  This is a corrective migration to ensure shared track support is on the correct table.

  ## Changes
  - Add is_shared, primary_owner_project_id, authority_mode to guardrails_tracks
  - Update helper functions to work with v2 table
  - Create compatibility view for services
*/

-- Step 1: Add shared track columns to guardrails_tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks'
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN is_shared boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks'
    AND column_name = 'primary_owner_project_id'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN primary_owner_project_id uuid REFERENCES master_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks'
    AND column_name = 'authority_mode'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN authority_mode track_authority_mode DEFAULT 'primary_project_only';
  END IF;
END $$;

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_is_shared 
  ON guardrails_tracks(is_shared) 
  WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_primary_owner 
  ON guardrails_tracks(primary_owner_project_id) 
  WHERE primary_owner_project_id IS NOT NULL;

-- Step 3: Update track_project_instances to reference v2 table
-- (Already references guardrails_tracks which includes v2)

-- Step 4: Create helper function for v2 table
CREATE OR REPLACE FUNCTION get_track_projects(track_id uuid)
RETURNS TABLE (
  project_id uuid,
  is_primary boolean,
  include_in_roadmap boolean,
  visibility_state text
) AS $$
DECLARE
  track_is_shared boolean;
  track_master_project uuid;
BEGIN
  SELECT is_shared, master_project_id 
  INTO track_is_shared, track_master_project
  FROM guardrails_tracks
  WHERE id = track_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF track_is_shared THEN
    RETURN QUERY
    SELECT 
      tpi.master_project_id as project_id,
      tpi.is_primary,
      tpi.include_in_roadmap,
      tpi.visibility_state::text
    FROM track_project_instances tpi
    WHERE tpi.track_id = track_id
    ORDER BY tpi.is_primary DESC, tpi.created_at ASC;
  ELSE
    IF track_master_project IS NOT NULL THEN
      RETURN QUERY
      SELECT 
        track_master_project as project_id,
        true as is_primary,
        true as include_in_roadmap,
        'visible'::text as visibility_state;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_project_tracks(input_project_id uuid)
RETURNS TABLE (
  track_id uuid,
  is_primary_instance boolean,
  include_in_roadmap boolean,
  visibility_state text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tpi.track_id,
    tpi.is_primary as is_primary_instance,
    tpi.include_in_roadmap,
    tpi.visibility_state::text
  FROM track_project_instances tpi
  INNER JOIN guardrails_tracks t ON t.id = tpi.track_id
  WHERE tpi.master_project_id = input_project_id
    AND t.is_shared = true
  
  UNION ALL
  
  SELECT 
    t.id as track_id,
    true as is_primary_instance,
    true as include_in_roadmap,
    'visible'::text as visibility_state
  FROM guardrails_tracks t
  WHERE t.master_project_id = input_project_id
    AND t.is_shared = false
  
  ORDER BY track_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 5: Add comments
COMMENT ON COLUMN guardrails_tracks.is_shared IS 
  'If true, track can be linked to multiple projects via track_project_instances. If false, track uses master_project_id (single-project).';

COMMENT ON COLUMN guardrails_tracks.primary_owner_project_id IS 
  'For shared tracks: the project with primary authority. NULL for truly global tracks or single-project tracks.';

COMMENT ON COLUMN guardrails_tracks.authority_mode IS 
  'Edit authority mode: shared_editing (all linked projects can edit) or primary_project_only (only primary owner can edit).';
