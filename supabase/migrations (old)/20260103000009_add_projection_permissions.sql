/*
  # Add Projection Permission Fields
  
  This migration adds explicit permission metadata to calendar_projections.
  
  Key changes:
  - Permissions come ONLY from projection metadata
  - Calendar views do NOT define permissions
  - Shared calendars are NOT inherently read-only
  - Personal calendars can be read-only for others
  
  1. Changes
    - Add can_edit boolean (default: false)
    - Add detail_level enum (default: derived from scope)
    - Add nested_scope enum (default: 'container')
    - All fields nullable for backward compatibility
    
  2. Safety
    - All fields nullable (existing projections unaffected)
    - Defaults applied at service layer
    - No breaking changes
*/

-- Add permission fields to calendar_projections
DO $$
BEGIN
  -- Add can_edit field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_projections' AND column_name = 'can_edit'
  ) THEN
    ALTER TABLE calendar_projections
    ADD COLUMN can_edit boolean DEFAULT false;
  END IF;
  
  -- Add detail_level field (stored as text, validated at service layer)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_projections' AND column_name = 'detail_level'
  ) THEN
    ALTER TABLE calendar_projections
    ADD COLUMN detail_level text CHECK (detail_level IN ('overview', 'detailed'));
  END IF;
  
  -- Add nested_scope field (for container events, determines if nested items are visible)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_projections' AND column_name = 'nested_scope'
  ) THEN
    ALTER TABLE calendar_projections
    ADD COLUMN nested_scope text CHECK (nested_scope IN ('container', 'container+items'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN calendar_projections.can_edit IS 
  'Whether the target user can edit this event. Default: false. Permissions come from projection metadata, not calendar type.';

COMMENT ON COLUMN calendar_projections.detail_level IS 
  'Level of detail visible: overview (title/time only) or detailed (full event details). Default: derived from scope.';

COMMENT ON COLUMN calendar_projections.nested_scope IS 
  'For container events: whether nested items are visible. container (container only) or container+items (container and nested). Default: container.';

