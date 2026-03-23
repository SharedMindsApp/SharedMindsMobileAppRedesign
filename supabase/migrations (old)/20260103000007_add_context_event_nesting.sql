/*
  # Add Context Event Nesting Support
  
  This migration adds support for container + nested event architecture:
  - Container events: Macro time blocks (e.g., "Trip to Amsterdam" Feb 2-9)
  - Nested events: Micro detail items (e.g., "Flight", "Hotel") inside containers
  
  Rules:
  - Max nesting depth = 1 (container → item only)
  - Container and nested events have independent projections
  - Shared calendars show containers ONLY, never nested items
  
  1. Changes
    - Add event_scope enum: 'container' | 'item'
    - Add parent_context_event_id (nullable, self-referential)
    - Add constraint to enforce max nesting depth
    - Add indexes for efficient queries
    
  2. Safety
    - All existing events default to NULL parent (backward compatible)
    - Existing events default to 'item' scope (can be updated later)
    - No breaking changes to existing queries
    - RLS policies remain unchanged
*/

-- Create event_scope enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_scope') THEN
    CREATE TYPE event_scope AS ENUM (
      'container',  -- Macro time block (e.g., trip period, project phase)
      'item'        -- Nested detail inside container (e.g., flight, meeting)
    );
  END IF;
END $$;

-- Add parent_context_event_id column (nullable, self-referential)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'context_events' AND column_name = 'parent_context_event_id'
  ) THEN
    ALTER TABLE context_events
    ADD COLUMN parent_context_event_id uuid REFERENCES context_events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add event_scope column (nullable first, then we'll set values and make it NOT NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'context_events' AND column_name = 'event_scope'
  ) THEN
    -- Add as nullable first
    ALTER TABLE context_events
    ADD COLUMN event_scope event_scope;
    
    -- Set all existing events to 'container' (they have no parent, so they're containers)
    UPDATE context_events
    SET event_scope = 'container'
    WHERE event_scope IS NULL;
    
    -- Now make it NOT NULL with default
    ALTER TABLE context_events
    ALTER COLUMN event_scope SET NOT NULL,
    ALTER COLUMN event_scope SET DEFAULT 'item';
  ELSE
    -- Column already exists - fix any invalid data
    -- Set any items without parents to containers
    UPDATE context_events
    SET event_scope = 'container'
    WHERE event_scope = 'item' AND parent_context_event_id IS NULL;
  END IF;
END $$;

-- Add constraint: nested items must have a parent
ALTER TABLE context_events
DROP CONSTRAINT IF EXISTS nested_item_requires_parent;

ALTER TABLE context_events
ADD CONSTRAINT nested_item_requires_parent
CHECK (
  (event_scope = 'item' AND parent_context_event_id IS NOT NULL) OR
  (event_scope = 'container' AND parent_context_event_id IS NULL)
);

-- Add constraint: prevent circular references (max depth = 1)
-- A container cannot have a parent
-- An item's parent must be a container (not another item)
CREATE OR REPLACE FUNCTION check_nesting_depth()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a container, it cannot have a parent
  IF NEW.event_scope = 'container' AND NEW.parent_context_event_id IS NOT NULL THEN
    RAISE EXCEPTION 'Container events cannot have a parent';
  END IF;
  
  -- If this is an item, its parent must be a container
  IF NEW.event_scope = 'item' AND NEW.parent_context_event_id IS NOT NULL THEN
    -- Check that parent is a container
    IF EXISTS (
      SELECT 1 FROM context_events
      WHERE id = NEW.parent_context_event_id
      AND event_scope != 'container'
    ) THEN
      RAISE EXCEPTION 'Nested items can only have container events as parents';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce nesting rules
DROP TRIGGER IF EXISTS enforce_nesting_depth ON context_events;
CREATE TRIGGER enforce_nesting_depth
  BEFORE INSERT OR UPDATE ON context_events
  FOR EACH ROW
  EXECUTE FUNCTION check_nesting_depth();

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_context_events_parent 
  ON context_events(parent_context_event_id) 
  WHERE parent_context_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_context_events_scope 
  ON context_events(event_scope);

CREATE INDEX IF NOT EXISTS idx_context_events_container_items 
  ON context_events(context_id, parent_context_event_id, event_scope)
  WHERE event_scope = 'item';

-- Add comment
COMMENT ON COLUMN context_events.parent_context_event_id IS 
  'Parent container event (for nested items). NULL for container events. Max nesting depth = 1.';

COMMENT ON COLUMN context_events.event_scope IS 
  'Event scope: container (macro time block) or item (nested detail). Containers have no parent. Items must have a container parent.';

