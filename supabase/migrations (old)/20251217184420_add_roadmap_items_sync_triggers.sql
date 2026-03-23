/*
  # Mind Mesh V2 Roadmap Items Sync Triggers

  This migration extends two-way sync to cover roadmap_items (tasks and events).

  ## Inbound Sync (Guardrails → Mind Mesh)

  Triggers handle:
  - Roadmap item title updates (title → title)
  - Roadmap item description updates (description → body)
  - Roadmap item status updates (status → metadata.status)
  - Roadmap item date updates (dueAt, startsAt, endsAt → metadata)
  - Roadmap item deletion

  ## Sync Enforcement Rules

  1. Only integrated containers (with entity references) are synced
  2. Local-only containers are never affected by Guardrails changes
  3. Sync is deterministic and explicit
  4. No ghost creation from triggers (ghosts spawn separately)

  ## Trigger Functions

  - `sync_roadmap_item_update_to_mindmesh()` - Updates container on task/event update
  - `sync_roadmap_item_delete_to_mindmesh()` - Deletes container on task/event deletion
*/

-- ============================================================================
-- INBOUND SYNC: Roadmap Item Updates → Mind Mesh
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_roadmap_item_update_to_mindmesh()
RETURNS TRIGGER AS $$
DECLARE
  v_container_id uuid;
  v_current_metadata jsonb;
  v_new_metadata jsonb;
BEGIN
  -- Find the Mind Mesh container for this roadmap item
  SELECT id, metadata INTO v_container_id, v_current_metadata
  FROM mindmesh_containers
  WHERE entity_type = 'roadmap_item'
    AND entity_id = NEW.id;

  -- Only sync if container exists (integrated container)
  -- Ghosts and non-existent containers are not synced
  IF v_container_id IS NOT NULL THEN

    -- Preserve existing metadata and update relevant fields
    v_new_metadata := COALESCE(v_current_metadata, '{}'::jsonb);

    -- Update status if changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_new_metadata := jsonb_set(v_new_metadata, '{status}', to_jsonb(NEW.status::text));
    END IF;

    -- Update type-specific date fields
    IF NEW.type = 'task' THEN
      -- Extract dueAt from metadata
      IF NEW.metadata ? 'dueAt' THEN
        v_new_metadata := jsonb_set(v_new_metadata, '{dueAt}', NEW.metadata->'dueAt');
      ELSIF v_new_metadata ? 'dueAt' THEN
        v_new_metadata := v_new_metadata - 'dueAt';
      END IF;
    ELSIF NEW.type = 'event' THEN
      -- Extract startsAt and endsAt from metadata
      IF NEW.metadata ? 'startsAt' THEN
        v_new_metadata := jsonb_set(v_new_metadata, '{startsAt}', NEW.metadata->'startsAt');
      ELSIF v_new_metadata ? 'startsAt' THEN
        v_new_metadata := v_new_metadata - 'startsAt';
      END IF;

      IF NEW.metadata ? 'endsAt' THEN
        v_new_metadata := jsonb_set(v_new_metadata, '{endsAt}', NEW.metadata->'endsAt');
      ELSIF v_new_metadata ? 'endsAt' THEN
        v_new_metadata := v_new_metadata - 'endsAt';
      END IF;
    END IF;

    -- Update the Mind Mesh container
    -- Roadmap Item.title → Container.title
    -- Roadmap Item.description → Container.body
    -- Roadmap Item.status → Container.metadata.status
    -- Roadmap Item.metadata dates → Container.metadata dates
    UPDATE mindmesh_containers
    SET
      title = NEW.title,
      body = COALESCE(NEW.description, ''),
      metadata = v_new_metadata,
      updated_at = now()
    WHERE id = v_container_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INBOUND SYNC: Roadmap Item Deletion → Mind Mesh
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_roadmap_item_delete_to_mindmesh()
RETURNS TRIGGER AS $$
DECLARE
  v_container_id uuid;
BEGIN
  -- Find the Mind Mesh container for this roadmap item
  SELECT id INTO v_container_id
  FROM mindmesh_containers
  WHERE entity_type = 'roadmap_item'
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
-- ATTACH TRIGGERS TO ROADMAP ITEMS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_roadmap_item_update_to_mindmesh ON roadmap_items;
DROP TRIGGER IF EXISTS trigger_sync_roadmap_item_delete_to_mindmesh ON roadmap_items;

-- Create update trigger
-- Only fire when relevant fields change (title, description, status, or metadata)
CREATE TRIGGER trigger_sync_roadmap_item_update_to_mindmesh
  AFTER UPDATE ON roadmap_items
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.metadata IS DISTINCT FROM NEW.metadata
  )
  EXECUTE FUNCTION sync_roadmap_item_update_to_mindmesh();

-- Create deletion trigger
CREATE TRIGGER trigger_sync_roadmap_item_delete_to_mindmesh
  BEFORE DELETE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_roadmap_item_delete_to_mindmesh();

-- ============================================================================
-- SYNC GUARD VERIFICATION
-- ============================================================================

/*
  These triggers enforce the sync contract:

  1. INTEGRATED CONTAINERS ONLY
     - Only containers with entity_type='roadmap_item' and entity_id=item.id are synced
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
     - Roadmap Item.title → Container.title
     - Roadmap Item.description → Container.body
     - Roadmap Item.status → Container.metadata.status
     - Roadmap Item.metadata.dueAt → Container.metadata.dueAt (tasks)
     - Roadmap Item.metadata.startsAt → Container.metadata.startsAt (events)
     - Roadmap Item.metadata.endsAt → Container.metadata.endsAt (events)

  7. TYPE-SPECIFIC HANDLING
     - Task sync preserves dueAt in metadata
     - Event sync preserves startsAt/endsAt in metadata
     - Status updates apply to both tasks and events
*/
