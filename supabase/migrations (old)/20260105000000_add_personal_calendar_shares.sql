/*
  # Phase 8: Personal Calendar Sharing (Read / Write Permissions)
  
  This migration introduces explicit sharing of Personal Calendars with read/write permissions.
  
  Architecture:
  - Personal Calendar Sharing is a permission overlay, not a calendar type
  - The calendar remains Personal
  - Other users receive delegated access
  - Sync logic remains unchanged
  - Shared projections are NOT used here
  
  Two scopes:
  1. Global Personal Calendar Access - applies to all personal calendar events
  2. Project-Scoped Personal Calendar Access - applies only to events from a specific Guardrails project
  
  Permission levels:
  - 'read' - view events only
  - 'write' - create/edit/delete events
  
  Principles:
  - Explicit invitations only
  - No auto-sharing
  - Preserve source-of-truth = owner
  - All changes auditable & reversible
*/

-- ============================================================================
-- Personal Calendar Shares Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS personal_calendar_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner of the personal calendar being shared
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User receiving access
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission level
  access_level text NOT NULL CHECK (access_level IN ('read', 'write')),
  
  -- Scope type
  scope_type text NOT NULL CHECK (scope_type IN ('global', 'project')),
  
  -- Project ID (required if scope_type = 'project', null if global)
  project_id uuid NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT personal_calendar_shares_global_no_project CHECK (
    (scope_type = 'global' AND project_id IS NULL) OR
    (scope_type = 'project' AND project_id IS NOT NULL)
  ),
  
  -- Uniqueness: one share per owner/recipient/scope/project combination
  UNIQUE(owner_user_id, shared_with_user_id, scope_type, project_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_owner 
  ON personal_calendar_shares(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_recipient 
  ON personal_calendar_shares(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_project 
  ON personal_calendar_shares(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_scope 
  ON personal_calendar_shares(scope_type, owner_user_id, shared_with_user_id);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_personal_calendar_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_personal_calendar_shares_updated_at
  BEFORE UPDATE ON personal_calendar_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_calendar_shares_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE personal_calendar_shares ENABLE ROW LEVEL SECURITY;

-- Owners can manage their shares
CREATE POLICY "Owners can manage their personal calendar shares"
  ON personal_calendar_shares
  FOR ALL
  USING (auth.uid() = owner_user_id);

-- Recipients can read their access row
CREATE POLICY "Recipients can read their personal calendar access"
  ON personal_calendar_shares
  FOR SELECT
  USING (auth.uid() = shared_with_user_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE personal_calendar_shares IS 
  'Explicit sharing of Personal Calendars with read/write permissions. This is a permission overlay, not a calendar type.';

COMMENT ON COLUMN personal_calendar_shares.owner_user_id IS 
  'User who owns the personal calendar being shared';

COMMENT ON COLUMN personal_calendar_shares.shared_with_user_id IS 
  'User receiving access to the personal calendar';

COMMENT ON COLUMN personal_calendar_shares.access_level IS 
  'Permission level: read (view only) or write (create/edit/delete)';

COMMENT ON COLUMN personal_calendar_shares.scope_type IS 
  'Scope: global (all events) or project (events from specific Guardrails project)';

COMMENT ON COLUMN personal_calendar_shares.project_id IS 
  'Project ID if scope_type = project, null if global';
