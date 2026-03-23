/*
  # Phase 1: Repurpose roadmap_items into Projection Layer
  
  This migration converts roadmap_items from a domain table into a projection layer
  that references domain entities by (domain_entity_type, domain_entity_id).
  
  Phase 0 Rule: Roadmap references domain entities by ID only.
  
  1. Add domain_entity_type and domain_entity_id columns
  2. Add constraints (unique projection, entity type check)
  3. Add integrity trigger (project matching, entity existence)
  4. Add indexes for performance
  5. Keep existing semantic columns for compatibility (temporary)
*/

-- ============================================================================
-- 1. Add Domain Reference Columns and archived_at
-- ============================================================================

-- Add archived_at column for soft deletion (consistent with domain tables)
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

-- Add domain entity reference columns
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS domain_entity_type text,
  ADD COLUMN IF NOT EXISTS domain_entity_id uuid;

-- Add index for entity lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_items_domain_entity 
  ON roadmap_items(domain_entity_type, domain_entity_id) 
  WHERE archived_at IS NULL;

-- Add index for roadmap structure queries
-- Note: roadmap_items uses 'order_index' not 'ordering_index'
-- Create basic index on guaranteed columns first
CREATE INDEX IF NOT EXISTS idx_roadmap_items_structure_project_order 
  ON roadmap_items(master_project_id, order_index) 
  WHERE archived_at IS NULL;

-- Add index with track_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' AND column_name = 'track_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_structure_track 
      ON roadmap_items(master_project_id, track_id, order_index) 
      WHERE archived_at IS NULL;
  END IF;
END $$;

-- Add index with subtrack_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' AND column_name = 'subtrack_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_structure_subtrack 
      ON roadmap_items(master_project_id, track_id, subtrack_id, order_index) 
      WHERE archived_at IS NULL AND subtrack_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. Add Constraints
-- ============================================================================

-- Prevent duplicate active projections of same entity in same project
CREATE UNIQUE INDEX IF NOT EXISTS idx_roadmap_items_unique_projection 
  ON roadmap_items(master_project_id, domain_entity_type, domain_entity_id) 
  WHERE archived_at IS NULL AND domain_entity_type IS NOT NULL AND domain_entity_id IS NOT NULL;

-- Entity type check constraint (initially support task and event)
-- Allow NULL during migration period
ALTER TABLE roadmap_items
  DROP CONSTRAINT IF EXISTS roadmap_items_domain_entity_type_check;

ALTER TABLE roadmap_items
  ADD CONSTRAINT roadmap_items_domain_entity_type_check 
  CHECK (domain_entity_type IN ('task', 'event') OR domain_entity_type IS NULL);

-- ============================================================================
-- 3. Integrity Trigger (Critical)
-- ============================================================================

-- Purpose: Enforce referential integrity and project consistency between
-- roadmap projection and domain entity.
CREATE OR REPLACE FUNCTION validate_roadmap_item_domain_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_project_id uuid;
BEGIN
  -- Skip validation if entity reference is not set (during migration)
  IF NEW.domain_entity_type IS NULL OR NEW.domain_entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate entity exists and get its project_id
  IF NEW.domain_entity_type = 'task' THEN
    SELECT master_project_id INTO v_entity_project_id
    FROM guardrails_tasks
    WHERE id = NEW.domain_entity_id AND archived_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Roadmap item references non-existent task: %', NEW.domain_entity_id;
    END IF;
  ELSIF NEW.domain_entity_type = 'event' THEN
    SELECT master_project_id INTO v_entity_project_id
    FROM guardrails_events
    WHERE id = NEW.domain_entity_id AND archived_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Roadmap item references non-existent event: %', NEW.domain_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported domain_entity_type: %', NEW.domain_entity_type;
  END IF;

  -- Ensure roadmap item's project matches entity's project
  IF NEW.master_project_id != v_entity_project_id THEN
    RAISE EXCEPTION 'Roadmap item project_id (%) does not match entity project_id (%)', 
      NEW.master_project_id, v_entity_project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_roadmap_item_domain_entity ON roadmap_items;
CREATE TRIGGER trigger_validate_roadmap_item_domain_entity
  BEFORE INSERT OR UPDATE ON roadmap_items
  FOR EACH ROW
  WHEN (NEW.domain_entity_type IS NOT NULL AND NEW.domain_entity_id IS NOT NULL)
  EXECUTE FUNCTION validate_roadmap_item_domain_entity();

-- ============================================================================
-- 4. Migration Map Table (For Debugging and Rollback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardrails_domain_migration_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  domain_entity_type text NOT NULL,
  domain_entity_id uuid NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  migration_notes text NULL,
  
  UNIQUE(roadmap_item_id, domain_entity_type, domain_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_migration_map_roadmap_item 
  ON guardrails_domain_migration_map(roadmap_item_id);

CREATE INDEX IF NOT EXISTS idx_migration_map_domain_entity 
  ON guardrails_domain_migration_map(domain_entity_type, domain_entity_id);
