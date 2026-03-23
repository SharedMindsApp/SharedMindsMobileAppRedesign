/*
  # Extend Entity Permission Grants for Trackers
  
  1. Changes
    - Add 'tracker' to entity_type constraint
    - Trackers use owner-based permissions (not project-based)
    - Reuses existing entity_permission_grants table
  
  2. Notes
    - Trackers are independent entities (not tied to projects)
    - Owner always has full access
    - Grants can be 'viewer' (read-only) or 'editor' (read+write)
    - Cannot grant 'owner' role via grants (ownership is tracker.owner_id)
*/

-- Extend entity_type constraint to include 'tracker'
ALTER TABLE entity_permission_grants 
DROP CONSTRAINT IF EXISTS check_entity_type;

ALTER TABLE entity_permission_grants
ADD CONSTRAINT check_entity_type 
CHECK (entity_type IN ('track', 'subtrack', 'tracker'));

-- Update comment
COMMENT ON COLUMN entity_permission_grants.entity_type IS 'Type of entity: track, subtrack, or tracker';
