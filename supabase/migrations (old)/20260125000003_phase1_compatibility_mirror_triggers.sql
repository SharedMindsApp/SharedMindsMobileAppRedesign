/*
  # Phase 1: Compatibility Mirror Triggers
  
  This migration creates triggers that keep legacy fields in roadmap_items
  synchronized with domain entities. This allows Taskflow and Calendar to
  continue reading from roadmap_items during Phase 1.
  
  Phase 0 Rule: Compatibility bridge is temporary (Phase 1 only).
  
  These triggers mirror:
  - Task domain changes → roadmap_items (title, status, dates, metadata)
  - Event domain changes → roadmap_items (title, dates, metadata)
  - Archive operations → roadmap_items archived_at
  
  IMPORTANT: These are temporary. Phase 2/3 will refactor execution layers
  to read directly from domain tables, and these triggers will be removed.
*/

-- ============================================================================
-- 1. Mirror Task to Roadmap (on Update)
-- ============================================================================

CREATE OR REPLACE FUNCTION mirror_task_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all roadmap items referencing this task
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    status = NEW.status::text,
    end_date = CASE 
      WHEN NEW.due_at IS NOT NULL THEN NEW.due_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE domain_entity_type = 'task'
    AND domain_entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_task_to_roadmap ON guardrails_tasks;
CREATE TRIGGER trigger_mirror_task_to_roadmap
  AFTER UPDATE ON guardrails_tasks
  FOR EACH ROW
  WHEN (OLD.archived_at IS NULL)
  EXECUTE FUNCTION mirror_task_to_roadmap();

-- ============================================================================
-- 2. Mirror Event to Roadmap (on Update)
-- ============================================================================

CREATE OR REPLACE FUNCTION mirror_event_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all roadmap items referencing this event
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    start_date = CASE 
      WHEN NEW.start_at IS NOT NULL THEN NEW.start_at::date 
      ELSE NULL 
    END,
    end_date = CASE 
      WHEN NEW.end_at IS NOT NULL THEN NEW.end_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE domain_entity_type = 'event'
    AND domain_entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_event_to_roadmap ON guardrails_events;
CREATE TRIGGER trigger_mirror_event_to_roadmap
  AFTER UPDATE ON guardrails_events
  FOR EACH ROW
  WHEN (OLD.archived_at IS NULL)
  EXECUTE FUNCTION mirror_event_to_roadmap();

-- ============================================================================
-- 3. Mirror Task Archive to Roadmap
-- ============================================================================

CREATE OR REPLACE FUNCTION mirror_task_archive_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- When domain task is archived, archive roadmap projection
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    UPDATE roadmap_items
    SET archived_at = NEW.archived_at
    WHERE domain_entity_type = 'task'
      AND domain_entity_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_task_archive_to_roadmap ON guardrails_tasks;
CREATE TRIGGER trigger_mirror_task_archive_to_roadmap
  AFTER UPDATE ON guardrails_tasks
  FOR EACH ROW
  WHEN (NEW.archived_at IS DISTINCT FROM OLD.archived_at)
  EXECUTE FUNCTION mirror_task_archive_to_roadmap();

-- ============================================================================
-- 4. Mirror Event Archive to Roadmap
-- ============================================================================

CREATE OR REPLACE FUNCTION mirror_event_archive_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- When domain event is archived, archive roadmap projection
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    UPDATE roadmap_items
    SET archived_at = NEW.archived_at
    WHERE domain_entity_type = 'event'
      AND domain_entity_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_event_archive_to_roadmap ON guardrails_events;
CREATE TRIGGER trigger_mirror_event_archive_to_roadmap
  AFTER UPDATE ON guardrails_events
  FOR EACH ROW
  WHEN (NEW.archived_at IS DISTINCT FROM OLD.archived_at)
  EXECUTE FUNCTION mirror_event_archive_to_roadmap();

-- ============================================================================
-- 5. Mirror Task Insert to Roadmap (on Domain Creation)
-- ============================================================================

-- Note: This trigger handles the case where a domain task is created
-- and a roadmap item is created separately. The roadmap item creation
-- should happen in the service layer, but this ensures mirror fields
-- are populated if they're missing.

CREATE OR REPLACE FUNCTION mirror_task_insert_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update roadmap items that reference this task (if they exist)
  -- This handles the case where roadmap item was created first, then domain task
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    status = NEW.status::text,
    end_date = CASE 
      WHEN NEW.due_at IS NOT NULL THEN NEW.due_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE domain_entity_type = 'task'
    AND domain_entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_task_insert_to_roadmap ON guardrails_tasks;
CREATE TRIGGER trigger_mirror_task_insert_to_roadmap
  AFTER INSERT ON guardrails_tasks
  FOR EACH ROW
  EXECUTE FUNCTION mirror_task_insert_to_roadmap();

-- ============================================================================
-- 6. Mirror Event Insert to Roadmap (on Domain Creation)
-- ============================================================================

CREATE OR REPLACE FUNCTION mirror_event_insert_to_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update roadmap items that reference this event (if they exist)
  UPDATE roadmap_items
  SET 
    title = NEW.title,
    start_date = CASE 
      WHEN NEW.start_at IS NOT NULL THEN NEW.start_at::date 
      ELSE NULL 
    END,
    end_date = CASE 
      WHEN NEW.end_at IS NOT NULL THEN NEW.end_at::date 
      ELSE NULL 
    END,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE domain_entity_type = 'event'
    AND domain_entity_id = NEW.id
    AND archived_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mirror_event_insert_to_roadmap ON guardrails_events;
CREATE TRIGGER trigger_mirror_event_insert_to_roadmap
  AFTER INSERT ON guardrails_events
  FOR EACH ROW
  EXECUTE FUNCTION mirror_event_insert_to_roadmap();
