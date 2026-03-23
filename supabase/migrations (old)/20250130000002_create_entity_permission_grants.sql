/*
  # Create Entity Permission Grants Schema (Phase 1)
  
  This migration creates the schema for entity-level permission grants.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  1. Table Created
    - entity_permission_grants: Entity-level permission grants for tracks and subtracks
  
  2. Constraints
    - Supports tracks and subtracks (MVP)
    - Supports users and groups as subjects
    - Supports all canonical permission roles (owner, editor, commenter, viewer)
    - One active grant per subject per entity
    - Soft delete via revoked_at
  
  3. Security
    - RLS enabled
    - Default-deny access (minimal policies in Phase 1)
    - Service layer will implement permission checks (Phase 2)
  
  4. Notes
    - Uses text columns with CHECK constraints (not enums) for flexibility
    - Foreign key validation for entity_id and subject_id happens in service layer (Phase 2)
    - All changes are additive (no existing tables modified)
*/

-- Create entity_permission_grants table
CREATE TABLE IF NOT EXISTS entity_permission_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  permission_role text NOT NULL,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  
  -- Constraints
  CONSTRAINT check_entity_type CHECK (entity_type IN ('track', 'subtrack')),
  CONSTRAINT check_subject_type CHECK (subject_type IN ('user', 'group')),
  CONSTRAINT check_permission_role CHECK (permission_role IN ('owner', 'editor', 'commenter', 'viewer'))
);

-- Create partial unique index for active grants only
CREATE UNIQUE INDEX IF NOT EXISTS unique_entity_grant_active 
  ON entity_permission_grants(entity_type, entity_id, subject_type, subject_id) 
  WHERE revoked_at IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entity_grants_entity 
  ON entity_permission_grants(entity_type, entity_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_grants_subject 
  ON entity_permission_grants(subject_type, subject_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_grants_revoked 
  ON entity_permission_grants(revoked_at) 
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_grants_granted_by 
  ON entity_permission_grants(granted_by) 
  WHERE granted_by IS NOT NULL;

-- Enable RLS
ALTER TABLE entity_permission_grants ENABLE ROW LEVEL SECURITY;

-- Minimal RLS policies (default-deny, service layer will handle access in Phase 2)
-- No SELECT policies in Phase 1 - service layer uses SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE entity_permission_grants IS 'Entity-level permission grants for tracks and subtracks. Grants are additive to project permissions.';
COMMENT ON COLUMN entity_permission_grants.entity_type IS 'Type of entity: track or subtrack (MVP)';
COMMENT ON COLUMN entity_permission_grants.entity_id IS 'ID of the entity (validated in service layer)';
COMMENT ON COLUMN entity_permission_grants.subject_type IS 'Type of subject: user or group';
COMMENT ON COLUMN entity_permission_grants.subject_id IS 'ID of the subject (references profiles.id for users, team_groups.id for groups, validated in service layer)';
COMMENT ON COLUMN entity_permission_grants.permission_role IS 'Permission role: owner, editor, commenter, or viewer';
COMMENT ON COLUMN entity_permission_grants.revoked_at IS 'Soft delete timestamp. Grants with revoked_at IS NOT NULL are considered revoked.';
