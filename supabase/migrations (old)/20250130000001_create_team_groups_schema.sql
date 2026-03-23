/*
  # Create Team-Scoped Groups Schema (Phase 1)
  
  This migration creates the schema for team-scoped groups used for permission scoping and distribution.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  1. Tables Created
    - team_groups: Team-scoped groups
    - team_group_members: Membership in team groups
  
  2. Constraints
    - Groups belong to exactly one team (CASCADE DELETE)
    - Group names unique within team (when not archived)
    - User can only be in group once
    - Soft delete via archived_at
  
  3. Security
    - RLS enabled on both tables
    - Default-deny access (minimal policies in Phase 1)
    - Service layer will implement permission checks (Phase 2)
  
  4. Notes
    - No business logic in schema
    - Membership validation against team_members happens in service layer (Phase 2)
    - All changes are additive (no existing tables modified)
*/

-- Create team_groups table
CREATE TABLE IF NOT EXISTS team_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz
);

-- Create partial unique index for active groups only
CREATE UNIQUE INDEX IF NOT EXISTS unique_team_group_name_active 
  ON team_groups(team_id, name) 
  WHERE archived_at IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_groups_team_id 
  ON team_groups(team_id);

CREATE INDEX IF NOT EXISTS idx_team_groups_archived 
  ON team_groups(archived_at) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_groups_created_by 
  ON team_groups(created_by) 
  WHERE created_by IS NOT NULL;

-- Create team_group_members table
CREATE TABLE IF NOT EXISTS team_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES team_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique index for group membership (idempotent)
-- Using index instead of constraint for better idempotency support
CREATE UNIQUE INDEX IF NOT EXISTS unique_group_member 
  ON team_group_members(group_id, user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_group_members_group_id 
  ON team_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_team_group_members_user_id 
  ON team_group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_group_members_added_by 
  ON team_group_members(added_by) 
  WHERE added_by IS NOT NULL;

-- Enable RLS
ALTER TABLE team_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_group_members ENABLE ROW LEVEL SECURITY;

-- Minimal RLS policies (default-deny, service layer will handle access in Phase 2)
-- No SELECT policies in Phase 1 - service layer uses SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE team_groups IS 'Team-scoped groups used for permission scoping and distribution. Distinct from contact_groups.';
COMMENT ON TABLE team_group_members IS 'Membership in team groups. Members must be team members (validated in service layer).';
COMMENT ON COLUMN team_groups.archived_at IS 'Soft delete timestamp. Groups with archived_at IS NOT NULL are considered deleted.';
COMMENT ON COLUMN team_groups.created_by IS 'User who created the group (references profiles.id)';
COMMENT ON COLUMN team_group_members.added_by IS 'User who added this member to the group (references profiles.id)';
