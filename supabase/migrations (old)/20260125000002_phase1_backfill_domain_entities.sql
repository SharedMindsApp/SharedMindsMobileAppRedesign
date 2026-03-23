/*
  # Phase 1: Backfill Domain Entities from roadmap_items
  
  This migration moves existing domain data from roadmap_items into
  guardrails_tasks and guardrails_events, then updates roadmap_items
  to reference the new domain entities.
  
  Phase 0 Rule: Domain entities own semantics. Roadmap references them.
  
  1. Backfill tasks from roadmap_items (type='task')
  2. Backfill events from roadmap_items (type='event')
  3. Update roadmap_items with domain references
  4. Log migration in guardrails_domain_migration_map
*/

-- ============================================================================
-- 1. Backfill Tasks Migration
-- ============================================================================

DO $$
DECLARE
  v_roadmap_item RECORD;
  v_new_task_id uuid;
  v_status text;
  v_completed_at timestamptz;
  v_due_at timestamptz;
  v_progress int;
BEGIN
  FOR v_roadmap_item IN 
    SELECT 
      id, 
      master_project_id, 
      title, 
      description, 
      status, 
      end_date, 
      metadata, 
      created_at, 
      updated_at
    FROM roadmap_items
    WHERE type = 'task'
      AND domain_entity_type IS NULL  -- Only migrate unmigrated items
      AND archived_at IS NULL
  LOOP
    -- Map roadmap status to domain status
    v_status := COALESCE(v_roadmap_item.status, 'pending');
    
    -- Determine completed_at from status
    IF v_status = 'completed' THEN
      v_completed_at := COALESCE(v_roadmap_item.updated_at, now());
    ELSE
      v_completed_at := NULL;
    END IF;
    
    -- Convert end_date to due_at (if present)
    IF v_roadmap_item.end_date IS NOT NULL THEN
      v_due_at := v_roadmap_item.end_date::timestamptz;
    ELSE
      v_due_at := NULL;
    END IF;
    
    -- Extract progress from metadata if present, otherwise infer from status
    IF v_roadmap_item.metadata IS NOT NULL AND jsonb_typeof(v_roadmap_item.metadata) = 'object' THEN
      v_progress := COALESCE((v_roadmap_item.metadata->>'progress')::int, 
        CASE 
          WHEN v_status = 'completed' THEN 100
          WHEN v_status = 'in_progress' THEN 50
          WHEN v_status = 'blocked' THEN 0
          ELSE 0
        END);
    ELSE
      v_progress := CASE 
        WHEN v_status = 'completed' THEN 100
        WHEN v_status = 'in_progress' THEN 50
        WHEN v_status = 'blocked' THEN 0
        ELSE 0
      END;
    END IF;
    
    -- Generate new task ID (keep separate from roadmap_item.id for clean separation)
    v_new_task_id := gen_random_uuid();
    
    -- Insert into domain table
    INSERT INTO guardrails_tasks (
      id, 
      master_project_id, 
      title, 
      description, 
      status, 
      progress,
      completed_at, 
      due_at, 
      metadata, 
      created_by,
      created_at, 
      updated_at
    ) VALUES (
      v_new_task_id,
      v_roadmap_item.master_project_id,
      v_roadmap_item.title,
      v_roadmap_item.description,
      v_status,
      v_progress,
      v_completed_at,
      v_due_at,
      COALESCE(v_roadmap_item.metadata, '{}'::jsonb),
      NULL,  -- roadmap_items doesn't have created_by, set to NULL
      v_roadmap_item.created_at,
      v_roadmap_item.updated_at
    );
    
    -- Update roadmap item with domain entity reference
    UPDATE roadmap_items
    SET domain_entity_type = 'task',
        domain_entity_id = v_new_task_id
    WHERE id = v_roadmap_item.id;
    
    -- Record migration
    INSERT INTO guardrails_domain_migration_map (
      roadmap_item_id, 
      domain_entity_type, 
      domain_entity_id, 
      migration_notes
    ) VALUES (
      v_roadmap_item.id, 
      'task', 
      v_new_task_id, 
      'Phase 1 backfill migration'
    );
  END LOOP;
END $$;

-- ============================================================================
-- 2. Backfill Events Migration
-- ============================================================================

DO $$
DECLARE
  v_roadmap_item RECORD;
  v_new_event_id uuid;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_location text;
  v_timezone text;
BEGIN
  FOR v_roadmap_item IN 
    SELECT 
      id, 
      master_project_id, 
      title, 
      description, 
      start_date, 
      end_date, 
      metadata, 
      created_at, 
      updated_at
    FROM roadmap_items
    WHERE type = 'event'
      AND domain_entity_type IS NULL  -- Only migrate unmigrated items
      AND archived_at IS NULL
  LOOP
    -- Convert dates to timestamps
    IF v_roadmap_item.start_date IS NOT NULL THEN
      v_start_at := v_roadmap_item.start_date::timestamptz;
    ELSE
      v_start_at := NULL;
    END IF;
    
    IF v_roadmap_item.end_date IS NOT NULL THEN
      v_end_at := v_roadmap_item.end_date::timestamptz;
    ELSE
      v_end_at := NULL;
    END IF;
    
    -- Extract location and timezone from metadata if present
    v_location := NULL;
    v_timezone := 'UTC';
    IF v_roadmap_item.metadata IS NOT NULL AND jsonb_typeof(v_roadmap_item.metadata) = 'object' THEN
      v_location := v_roadmap_item.metadata->>'location';
      IF v_roadmap_item.metadata->>'timezone' IS NOT NULL THEN
        v_timezone := v_roadmap_item.metadata->>'timezone';
      END IF;
    END IF;
    
    -- Generate new event ID
    v_new_event_id := gen_random_uuid();
    
    -- Insert into domain table
    INSERT INTO guardrails_events (
      id, 
      master_project_id, 
      title, 
      description, 
      start_at, 
      end_at, 
      timezone,
      location, 
      metadata, 
      created_by,
      created_at, 
      updated_at
    ) VALUES (
      v_new_event_id,
      v_roadmap_item.master_project_id,
      v_roadmap_item.title,
      v_roadmap_item.description,
      v_start_at,
      v_end_at,
      v_timezone,
      v_location,
      COALESCE(v_roadmap_item.metadata, '{}'::jsonb),
      NULL,  -- roadmap_items doesn't have created_by, set to NULL
      v_roadmap_item.created_at,
      v_roadmap_item.updated_at
    );
    
    -- Update roadmap item with domain entity reference
    UPDATE roadmap_items
    SET domain_entity_type = 'event',
        domain_entity_id = v_new_event_id
    WHERE id = v_roadmap_item.id;
    
    -- Record migration
    INSERT INTO guardrails_domain_migration_map (
      roadmap_item_id, 
      domain_entity_type, 
      domain_entity_id, 
      migration_notes
    ) VALUES (
      v_roadmap_item.id, 
      'event', 
      v_new_event_id, 
      'Phase 1 backfill migration'
    );
  END LOOP;
END $$;

-- ============================================================================
-- 3. Migration Validation Queries (for verification)
-- ============================================================================

-- These queries can be run manually to verify migration success:
-- 
-- Verify all tasks migrated:
-- SELECT COUNT(*) as unmigrated_tasks
-- FROM roadmap_items
-- WHERE type = 'task' AND domain_entity_type IS NULL;
--
-- Verify all events migrated:
-- SELECT COUNT(*) as unmigrated_events
-- FROM roadmap_items
-- WHERE type = 'event' AND domain_entity_type IS NULL;
--
-- Verify referential integrity:
-- SELECT COUNT(*) as invalid_task_references
-- FROM roadmap_items ri
-- WHERE ri.domain_entity_type = 'task'
--   AND NOT EXISTS (
--     SELECT 1 FROM guardrails_tasks gt 
--     WHERE gt.id = ri.domain_entity_id AND gt.archived_at IS NULL
--   );
--
-- SELECT COUNT(*) as invalid_event_references
-- FROM roadmap_items ri
-- WHERE ri.domain_entity_type = 'event'
--   AND NOT EXISTS (
--     SELECT 1 FROM guardrails_events ge 
--     WHERE ge.id = ri.domain_entity_id AND ge.archived_at IS NULL
--   );
--
-- Verify project consistency:
-- SELECT COUNT(*) as project_mismatches
-- FROM roadmap_items ri
-- LEFT JOIN guardrails_tasks gt ON ri.domain_entity_type = 'task' AND gt.id = ri.domain_entity_id
-- LEFT JOIN guardrails_events ge ON ri.domain_entity_type = 'event' AND ge.id = ri.domain_entity_id
-- WHERE (gt.id IS NOT NULL AND ri.master_project_id != gt.master_project_id)
--    OR (ge.id IS NOT NULL AND ri.master_project_id != ge.master_project_id);
