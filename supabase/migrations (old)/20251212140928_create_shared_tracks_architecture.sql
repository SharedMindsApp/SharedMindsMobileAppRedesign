/*
  # Create Shared Tracks Architecture

  ## Summary
  Enables tracks to exist as single authoritative definitions that can be linked
  into multiple projects, with each project maintaining its own contextual configuration
  (visibility, roadmap inclusion, ordering) while sharing the core content.

  ## Core Concept
  - Track Definition: The authoritative content (name, description, items, subtracks)
  - Project Track Instance: Project-specific configuration and placement
  - No duplication, no copy-on-write—single source of truth

  ## Key Principles
  1. Track Definition owns: name, description, subtrack structure, roadmap items
  2. Project Instance owns: include_in_roadmap, visibility, ordering, local config
  3. Backward compatible: existing tracks default to single-project ownership
  4. Authority modes: shared_editing, primary_project_only

  ## Changes
  1. Extend `guardrails_tracks` table
     - Add `is_shared` flag (default false for backward compat)
     - Add `primary_owner_project_id` (nullable, for shared tracks)
     - Add `authority_mode` enum
     - Keep `master_project_id` for legacy single-project tracks

  2. Create `track_project_instances` junction table
     - Links tracks to projects with per-project configuration
     - Each instance has: include_in_roadmap, visibility, ordering

  3. Query logic
     - If track.is_shared = false: uses master_project_id (legacy)
     - If track.is_shared = true: uses track_project_instances

  ## Migration Safety
  - Additive only—no data loss
  - Existing tracks remain unchanged (is_shared = false)
  - No breaking changes to existing queries
*/

-- Step 1: Create authority mode enum
DO $$ BEGIN
  CREATE TYPE track_authority_mode AS ENUM (
    'shared_editing',       -- All linked projects can edit
    'primary_project_only'  -- Only primary owner can edit
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create visibility state enum for instances
DO $$ BEGIN
  CREATE TYPE track_instance_visibility AS ENUM (
    'visible',    -- Normal visibility
    'hidden',     -- Hidden from views but data accessible
    'collapsed',  -- Collapsed in UI
    'archived'    -- Archived in this project context
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add new columns to guardrails_tracks
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

-- Step 4: Create track_project_instances junction table
CREATE TABLE IF NOT EXISTS track_project_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  include_in_roadmap boolean NOT NULL DEFAULT true,
  visibility_state track_instance_visibility NOT NULL DEFAULT 'visible',
  order_index integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  instance_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_track_project UNIQUE (track_id, master_project_id)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_is_shared 
  ON guardrails_tracks(is_shared) 
  WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_tracks_primary_owner 
  ON guardrails_tracks(primary_owner_project_id) 
  WHERE primary_owner_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_track_instances_track 
  ON track_project_instances(track_id);

CREATE INDEX IF NOT EXISTS idx_track_instances_project 
  ON track_project_instances(master_project_id);

CREATE INDEX IF NOT EXISTS idx_track_instances_primary 
  ON track_project_instances(track_id, is_primary) 
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_track_instances_roadmap 
  ON track_project_instances(master_project_id, include_in_roadmap) 
  WHERE include_in_roadmap = true;

-- Step 6: Add helpful comments
COMMENT ON COLUMN guardrails_tracks.is_shared IS 
  'If true, track can be linked to multiple projects via track_project_instances. If false, track uses master_project_id (legacy single-project).';

COMMENT ON COLUMN guardrails_tracks.primary_owner_project_id IS 
  'For shared tracks: the project with primary authority. NULL for truly global tracks or legacy tracks.';

COMMENT ON COLUMN guardrails_tracks.authority_mode IS 
  'Edit authority mode: shared_editing (all linked projects can edit) or primary_project_only (only primary owner can edit).';

COMMENT ON TABLE track_project_instances IS 
  'Junction table linking shared tracks to projects. Each row represents a track instance in a specific project with per-project configuration.';

COMMENT ON COLUMN track_project_instances.include_in_roadmap IS 
  'Whether this track appears in the project roadmap/timeline. Per-project configuration.';

COMMENT ON COLUMN track_project_instances.visibility_state IS 
  'Visibility state for this track in this project: visible, hidden, collapsed, or archived.';

COMMENT ON COLUMN track_project_instances.is_primary IS 
  'True for the primary instance (typically matches primary_owner_project_id). Only one primary per track.';

-- Step 7: Create helper function to get all projects for a track
CREATE OR REPLACE FUNCTION get_track_projects(input_track_id uuid)
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
  -- Check if track is shared
  SELECT is_shared, master_project_id 
  INTO track_is_shared, track_master_project
  FROM guardrails_tracks
  WHERE id = input_track_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF track_is_shared THEN
    -- Return instances from junction table
    RETURN QUERY
    SELECT 
      tpi.master_project_id as project_id,
      tpi.is_primary,
      tpi.include_in_roadmap,
      tpi.visibility_state::text
    FROM track_project_instances tpi
    WHERE tpi.track_id = input_track_id
    ORDER BY tpi.is_primary DESC, tpi.created_at ASC;
  ELSE
    -- Return single legacy project
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

-- Step 8: Create helper function to get tracks for a project
CREATE OR REPLACE FUNCTION get_project_tracks(input_project_id uuid)
RETURNS TABLE (
  track_id uuid,
  is_primary_instance boolean,
  include_in_roadmap boolean,
  visibility_state text
) AS $$
BEGIN
  RETURN QUERY
  -- Get shared tracks via instances
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
  
  -- Get legacy single-project tracks
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

-- Step 9: Create helper function to check edit permission
CREATE OR REPLACE FUNCTION can_edit_track(
  input_track_id uuid,
  input_project_id uuid
)
RETURNS boolean AS $$
DECLARE
  track_is_shared boolean;
  track_authority track_authority_mode;
  track_primary_owner uuid;
  track_master_project uuid;
  is_linked boolean;
BEGIN
  -- Get track metadata
  SELECT 
    is_shared, 
    authority_mode, 
    primary_owner_project_id,
    master_project_id
  INTO 
    track_is_shared, 
    track_authority, 
    track_primary_owner,
    track_master_project
  FROM guardrails_tracks
  WHERE id = input_track_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Legacy single-project track
  IF NOT track_is_shared THEN
    RETURN track_master_project = input_project_id;
  END IF;

  -- Check if project is linked to this track
  SELECT EXISTS(
    SELECT 1 FROM track_project_instances
    WHERE track_id = input_track_id
    AND master_project_id = input_project_id
  ) INTO is_linked;

  IF NOT is_linked THEN
    RETURN false;
  END IF;

  -- Shared track with shared_editing mode
  IF track_authority = 'shared_editing' THEN
    RETURN true;
  END IF;

  -- Shared track with primary_project_only mode
  IF track_authority = 'primary_project_only' THEN
    RETURN track_primary_owner = input_project_id;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 10: Create trigger for updated_at on instances
CREATE OR REPLACE FUNCTION update_track_instance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_instances_updated_at_trigger ON track_project_instances;
CREATE TRIGGER track_instances_updated_at_trigger
  BEFORE UPDATE ON track_project_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_track_instance_updated_at();

-- Step 11: Create constraint to ensure only one primary instance per track
CREATE OR REPLACE FUNCTION check_single_primary_instance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary THEN
    -- Unset other primaries for this track
    UPDATE track_project_instances
    SET is_primary = false
    WHERE track_id = NEW.track_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_trigger ON track_project_instances;
CREATE TRIGGER ensure_single_primary_trigger
  BEFORE INSERT OR UPDATE ON track_project_instances
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION check_single_primary_instance();

-- Step 12: Add RLS policies for track_project_instances
ALTER TABLE track_project_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view track instances for their projects"
  ON track_project_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = track_project_instances.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create track instances for their projects"
  ON track_project_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = track_project_instances.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update track instances for their projects"
  ON track_project_instances
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = track_project_instances.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete track instances for their projects"
  ON track_project_instances
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = track_project_instances.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Step 13: Add comments for helper functions
COMMENT ON FUNCTION get_track_projects(uuid) IS 
  'Get all projects that have this track linked. For shared tracks, returns instances; for legacy tracks, returns single project.';

COMMENT ON FUNCTION get_project_tracks(uuid) IS 
  'Get all tracks accessible in this project. Includes both shared track instances and legacy single-project tracks.';

COMMENT ON FUNCTION can_edit_track(uuid, uuid) IS 
  'Check if a project has permission to edit a track based on authority mode and linkage.';
