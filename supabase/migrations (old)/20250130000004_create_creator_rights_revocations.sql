/*
  # Create Creator Rights Revocations Schema (Phase 1)
  
  This migration creates the schema for explicit revocation of creator default rights.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  1. Table Created
    - creator_rights_revocations: Explicit revocations of creator default rights
  
  2. Constraints
    - Supports tracks and subtracks (MVP)
    - One revocation per creator per entity
    - Revocation is permanent (no undo column)
  
  3. Security
    - RLS enabled
    - Default-deny access (minimal policies in Phase 1)
    - Service layer will implement permission checks (Phase 2)
  
  4. Notes
    - No business logic in schema
    - Foreign key validation for entity_id happens in service layer (Phase 2)
    - All changes are additive (no existing tables modified)
*/

-- Create creator_rights_revocations table
CREATE TABLE IF NOT EXISTS creator_rights_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  creator_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  revoked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  revoked_at timestamptz DEFAULT now(),
  
  -- One revocation per creator per entity
  CONSTRAINT unique_creator_revocation UNIQUE(entity_type, entity_id, creator_user_id),
  
  -- Entity type constraint
  CONSTRAINT check_entity_type CHECK (entity_type IN ('track', 'subtrack'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creator_revocations_entity 
  ON creator_rights_revocations(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_creator_revocations_creator 
  ON creator_rights_revocations(creator_user_id);

CREATE INDEX IF NOT EXISTS idx_creator_revocations_revoked_by 
  ON creator_rights_revocations(revoked_by) 
  WHERE revoked_by IS NOT NULL;

-- Enable RLS
ALTER TABLE creator_rights_revocations ENABLE ROW LEVEL SECURITY;

-- Minimal RLS policies (default-deny, service layer will handle access in Phase 2)
-- No SELECT policies in Phase 1 - service layer uses SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE creator_rights_revocations IS 'Explicit revocations of creator default rights. Revocation is permanent (re-granting requires explicit entity grant).';
COMMENT ON COLUMN creator_rights_revocations.entity_type IS 'Type of entity: track or subtrack';
COMMENT ON COLUMN creator_rights_revocations.entity_id IS 'ID of the entity (validated in service layer)';
COMMENT ON COLUMN creator_rights_revocations.creator_user_id IS 'User whose creator rights were revoked (references profiles.id)';
COMMENT ON COLUMN creator_rights_revocations.revoked_by IS 'User who revoked the creator rights (references profiles.id, typically project owner)';
