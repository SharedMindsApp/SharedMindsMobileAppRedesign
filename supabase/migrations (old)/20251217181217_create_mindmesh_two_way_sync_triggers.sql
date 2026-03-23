/*
  # Mind Mesh V2 Two-Way Sync Triggers

  This migration creates database triggers to enforce two-way sync between
  Guardrails and Mind Mesh for integrated containers.

  ## Inbound Sync (Guardrails → Mind Mesh)

  Triggers handle:
  - Track name updates (name → title)
  - Track description updates
  - Track parent changes (reparenting)
  - Track deletion

  ## Sync Enforcement Rules

  1. Only integrated containers (with entity references) are synced
  2. Local-only containers are never affected by Guardrails changes
  3. Sync is deterministic and explicit
  4. No ghost creation from triggers (ghosts spawn separately)

  ## Trigger Functions

  - `sync_track_update_to_mindmesh()` - Updates container on track update
  - `sync_track_delete_to_mindmesh()` - Deletes container on track deletion
*/

-- ============================================================================
-- INBOUND SYNC: Track Updates → Mind Mesh
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_track_update_to_mindmesh()
RETURNS TRIGGER AS $$
DECLARE
  v_container_id uuid;
  v_parent_container_id uuid;
BEGIN
  -- Find the Mind Mesh container for this track
  SELECT id INTO v_container_id
  FROM mindmesh_containers
  WHERE entity_type = 'track'
    AND entity_id = NEW.id;

  -- Only sync if container exists (integrated container)
  -- Ghosts and non-existent containers are not synced
  IF v_container_id IS NOT NULL THEN

    -- If parent track changed, find new parent container
    IF (OLD.parent_track_id IS DISTINCT FROM NEW.parent_track_id) THEN
      IF NEW.parent_track_id IS NOT NULL THEN
        SELECT id INTO v_parent_container_id
        FROM mindmesh_containers
        WHERE entity_type = 'track'
          AND entity_id = NEW.parent_track_id;
      ELSE
        v_parent_container_id := NULL;
      END IF;
    END IF;

    -- Update the Mind Mesh container
    -- Track.name → Container.title
    -- Track.description → Container.body
    UPDATE mindmesh_containers
    SET
      title = NEW.name,
      body = COALESCE(NEW.description, ''),
      parent_container_id = CASE
        WHEN OLD.parent_track_id IS DISTINCT FROM NEW.parent_track_id
        THEN v_parent_container_id
        ELSE parent_container_id
      END,
      updated_at = now()
    WHERE id = v_container_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INBOUND SYNC: Track Deletion → Mind Mesh
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_track_delete_to_mindmesh()
RETURNS TRIGGER AS $$
DECLARE
  v_container_id uuid;
BEGIN
  -- Find the Mind Mesh container for this track
  SELECT id INTO v_container_id
  FROM mindmesh_containers
  WHERE entity_type = 'track'
    AND entity_id = OLD.id;

  -- Only sync if container exists (integrated container)
  IF v_container_id IS NOT NULL THEN
    -- Delete the Mind Mesh container and its references
    -- CASCADE will handle mindmesh_container_references deletion
    DELETE FROM mindmesh_containers
    WHERE id = v_container_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ATTACH TRIGGERS TO GUARDRAILS TRACKS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_track_update_to_mindmesh ON guardrails_tracks;
DROP TRIGGER IF EXISTS trigger_sync_track_delete_to_mindmesh ON guardrails_tracks;

-- Create update trigger
CREATE TRIGGER trigger_sync_track_update_to_mindmesh
  AFTER UPDATE ON guardrails_tracks
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.parent_track_id IS DISTINCT FROM NEW.parent_track_id
  )
  EXECUTE FUNCTION sync_track_update_to_mindmesh();

-- Create deletion trigger
CREATE TRIGGER trigger_sync_track_delete_to_mindmesh
  BEFORE DELETE ON guardrails_tracks
  FOR EACH ROW
  EXECUTE FUNCTION sync_track_delete_to_mindmesh();

-- ============================================================================
-- SYNC GUARD VERIFICATION
-- ============================================================================

/*
  These triggers enforce the sync contract:

  1. INTEGRATED CONTAINERS ONLY
     - Only containers with entity_type='track' and entity_id=track.id are synced
     - Local-only containers (no entity_id) are never touched

  2. NO GHOST CREATION
     - Triggers do not create containers
     - Ghost spawning is handled separately by orchestrator

  3. DETERMINISTIC BEHAVIOR
     - Trigger fires on specific field changes only
     - No inference or fallback logic
     - Explicit conditions in WHEN clause

  4. CASCADE SAFE
     - Deletion cascade is handled by foreign key constraints
     - mindmesh_container_references CASCADE on container deletion
     - mindmesh_nodes CASCADE on container deletion

  5. PERFORMANCE
     - Single lookup per operation (SELECT id FROM...)
     - Early return if container not found
     - No cross-workspace queries

  6. FIELD MAPPING
     - Track.name → Container.title
     - Track.description → Container.body
     - Track.parent_track_id → Container.parent_container_id
*/
