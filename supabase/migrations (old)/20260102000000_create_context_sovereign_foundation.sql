/*
  # Context-Sovereign Calendar & Travel Foundation (Phase 1-3)
  
  ## Purpose
  This migration introduces a parallel context-ownership model for calendar events
  and travel planning WITHOUT touching any existing tables or behavior.
  
  ## Architecture Principles Implemented
  1. Contexts own events (not calendars)
  2. Calendars are read models (aggregation layers)
  3. Visibility is explicit and revocable (projection-based)
  4. Nothing auto-appears (opt-in only)
  5. Linking contexts ≠ sharing data
  
  ## What This Does NOT Do
  - Does NOT modify calendar_events table
  - Does NOT change household calendar behavior
  - Does NOT alter any existing RLS policies
  - Does NOT create any auto-sync mechanisms
  - Does NOT replace existing membership systems
  
  ## What This DOES Do
  - Creates parallel context system
  - Adds context-owned event storage
  - Implements explicit projection layer
  - Provides foundation for incremental adoption
  
  ## Migration Safety
  - All tables are new (no ALTER statements on existing tables)
  - All RLS policies are on new tables only
  - Existing code continues to work unchanged
  - Can be rolled back by dropping new tables
  
  ## Future Work (NOT in this migration)
  - UI for context management
  - UI for projection acceptance
  - Migration of existing trips to contexts
  - Integration with existing calendar views
*/

-- ============================================================================
-- PHASE 1: Context Layer (Parallel Abstraction)
-- ============================================================================

-- Context types enum
CREATE TYPE context_type AS ENUM (
  'personal',      -- User's personal context (1:1 with user)
  'project',       -- Guardrails project context
  'trip',          -- Travel trip context
  'shared_space'   -- Shared space context
);

-- Context member roles
CREATE TYPE context_role AS ENUM (
  'owner',   -- Full control (delete context, manage members)
  'admin',   -- Management access (add/remove members, edit all)
  'editor',  -- Can create and edit content
  'viewer'   -- Read-only access
);

-- Context member status
CREATE TYPE context_member_status AS ENUM (
  'pending',   -- Invitation sent, not accepted
  'accepted',  -- Active member
  'declined',  -- Invitation declined
  'removed'    -- Removed from context
);

-- Contexts table
-- This is a NEW abstraction that sits parallel to existing systems
-- It does NOT replace: households, master_projects, trips, spaces
CREATE TABLE contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context type and ownership
  type context_type NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  name text NOT NULL,
  description text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Linking to existing systems (nullable for now)
  -- These are populated later when wrapping existing entities
  linked_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  linked_trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  linked_space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  -- Ensure only one link type per context
  CONSTRAINT contexts_single_link CHECK (
    (
      (linked_project_id IS NOT NULL)::int +
      (linked_trip_id IS NOT NULL)::int +
      (linked_space_id IS NOT NULL)::int
    ) <= 1
  ),
  
  -- Personal contexts must have no links
  CONSTRAINT contexts_personal_no_links CHECK (
    type != 'personal' OR (
      linked_project_id IS NULL AND
      linked_trip_id IS NULL AND
      linked_space_id IS NULL
    )
  )
);

-- Context members table
-- Parallel to: household_members, project_users, trip_collaborators, space_members
-- Does NOT replace them (they continue to work)
CREATE TABLE context_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role and status
  role context_role NOT NULL DEFAULT 'viewer',
  status context_member_status NOT NULL DEFAULT 'pending',
  
  -- Invitation metadata
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(context_id, user_id)
);

-- Indexes for contexts
CREATE INDEX idx_contexts_owner ON contexts(owner_user_id);
CREATE INDEX idx_contexts_type ON contexts(type);
CREATE INDEX idx_contexts_linked_project ON contexts(linked_project_id) WHERE linked_project_id IS NOT NULL;
CREATE INDEX idx_contexts_linked_trip ON contexts(linked_trip_id) WHERE linked_trip_id IS NOT NULL;
CREATE INDEX idx_contexts_linked_space ON contexts(linked_space_id) WHERE linked_space_id IS NOT NULL;

-- Indexes for context_members
CREATE INDEX idx_context_members_context ON context_members(context_id);
CREATE INDEX idx_context_members_user ON context_members(user_id);
CREATE INDEX idx_context_members_status ON context_members(status);

-- ============================================================================
-- PHASE 2: Context-Owned Events (Parallel Event System)
-- ============================================================================

-- Event types
CREATE TYPE context_event_type AS ENUM (
  'meeting',     -- Scheduled meeting/call
  'travel',      -- Travel segment (flight, train, drive)
  'milestone',   -- Project milestone or trip waypoint
  'deadline',    -- Hard deadline
  'reminder',    -- Reminder or notification
  'block',       -- Time block (work session, etc)
  'social',      -- Social event
  'personal'     -- Personal event
);

-- Time scope (how event relates to time)
CREATE TYPE event_time_scope AS ENUM (
  'timed',      -- Specific start/end times
  'all_day',    -- All-day event
  'abstract'    -- Has date but no specific time (e.g., "Q1 2026")
);

-- Context events table
-- This is SEPARATE from calendar_events (household calendar)
-- These events are OWNED by contexts, not households
CREATE TABLE context_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type context_event_type NOT NULL,
  time_scope event_time_scope NOT NULL DEFAULT 'timed',
  
  -- Event data
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  
  -- Time fields
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text DEFAULT 'UTC',
  
  -- Metadata (event-specific data)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_event_times CHECK (end_at >= start_at)
);

-- Indexes for context_events
CREATE INDEX idx_context_events_context ON context_events(context_id);
CREATE INDEX idx_context_events_created_by ON context_events(created_by);
CREATE INDEX idx_context_events_start_at ON context_events(start_at);
CREATE INDEX idx_context_events_type ON context_events(event_type);
CREATE INDEX idx_context_events_time_range ON context_events(start_at, end_at);

-- ============================================================================
-- PHASE 3: Projection System (Explicit Visibility)
-- ============================================================================

-- Projection scope (what data is shared)
CREATE TYPE projection_scope AS ENUM (
  'date_only',   -- Only show date/time (title hidden)
  'title',       -- Show date/time and title (description hidden)
  'full'         -- Show all event details
);

-- Projection status
CREATE TYPE projection_status AS ENUM (
  'suggested',   -- System suggested this projection (user hasn't seen yet)
  'pending',     -- Explicitly offered to user (awaiting acceptance)
  'accepted',    -- User accepted (visible in their calendar)
  'declined',    -- User declined (hidden)
  'revoked'      -- Projection revoked by event owner (immediately hidden)
);

-- Calendar projections table
-- This is the CORE INNOVATION: explicit, revocable visibility
-- Events DO NOT appear in calendars without accepted projections
CREATE TABLE calendar_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event being projected
  event_id uuid NOT NULL REFERENCES context_events(id) ON DELETE CASCADE,
  
  -- Target user (whose calendar this projects to)
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional: Target space (for space-specific calendars)
  target_space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Projection settings
  scope projection_scope NOT NULL DEFAULT 'full',
  status projection_status NOT NULL DEFAULT 'pending',
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  
  -- Constraints
  UNIQUE(event_id, target_user_id, target_space_id)
);

-- Indexes for calendar_projections
CREATE INDEX idx_projections_event ON calendar_projections(event_id);
CREATE INDEX idx_projections_target_user ON calendar_projections(target_user_id);
CREATE INDEX idx_projections_target_space ON calendar_projections(target_space_id) WHERE target_space_id IS NOT NULL;
CREATE INDEX idx_projections_status ON calendar_projections(status);
CREATE INDEX idx_projections_accepted ON calendar_projections(target_user_id, status) WHERE status = 'accepted';

-- ============================================================================
-- RLS POLICIES (NEW TABLES ONLY)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_projections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Contexts RLS
-- ============================================================================

-- Users can view contexts they own or are members of
CREATE POLICY "Users can view contexts they have access to"
  ON contexts FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR
    id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- Users can create contexts (will auto-add as owner in context_members)
CREATE POLICY "Users can create contexts"
  ON contexts FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Only owners can update contexts
CREATE POLICY "Context owners can update contexts"
  ON contexts FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Only owners can delete contexts
CREATE POLICY "Context owners can delete contexts"
  ON contexts FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- Context Members RLS
-- ============================================================================

-- Users can view members of contexts they have access to
CREATE POLICY "Users can view context members"
  ON context_members FOR SELECT
  USING (
    context_id IN (
      SELECT id FROM contexts
      WHERE owner_user_id = auth.uid()
      OR id IN (
        SELECT context_id FROM context_members
        WHERE user_id = auth.uid()
        AND status = 'accepted'
      )
    )
  );

-- Owners and admins can add members
CREATE POLICY "Context owners and admins can add members"
  ON context_members FOR INSERT
  WITH CHECK (
    context_id IN (
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
    )
  );

-- Users can update their own membership status (accept/decline)
-- Owners and admins can update any membership
CREATE POLICY "Users can manage context membership"
  ON context_members FOR UPDATE
  USING (
    user_id = auth.uid()  -- Own membership
    OR
    context_id IN (  -- Owner/admin
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Context owners and admins can remove members"
  ON context_members FOR DELETE
  USING (
    context_id IN (
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
    )
  );

-- ============================================================================
-- Context Events RLS
-- ============================================================================

-- Users can view events in contexts they have access to
CREATE POLICY "Users can view context events"
  ON context_events FOR SELECT
  USING (
    context_id IN (
      SELECT id FROM contexts
      WHERE owner_user_id = auth.uid()
      OR id IN (
        SELECT context_id FROM context_members
        WHERE user_id = auth.uid()
        AND status = 'accepted'
      )
    )
  );

-- Context members with editor+ role can create events
CREATE POLICY "Context editors can create events"
  ON context_events FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    context_id IN (
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
      AND status = 'accepted'
    )
  );

-- Event creators, context owners, and admins can update events
CREATE POLICY "Event creators and context admins can update events"
  ON context_events FOR UPDATE
  USING (
    created_by = auth.uid()  -- Event creator
    OR
    context_id IN (  -- Context owner
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (  -- Context admin
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
    )
  );

-- Event creators, context owners, and admins can delete events
CREATE POLICY "Event creators and context admins can delete events"
  ON context_events FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    context_id IN (
      SELECT id FROM contexts WHERE owner_user_id = auth.uid()
    )
    OR
    context_id IN (
      SELECT context_id FROM context_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'accepted'
    )
  );

-- ============================================================================
-- Calendar Projections RLS
-- ============================================================================

-- Users can view projections targeting them or events they created
CREATE POLICY "Users can view their projections"
  ON calendar_projections FOR SELECT
  USING (
    target_user_id = auth.uid()
    OR
    created_by = auth.uid()
    OR
    event_id IN (
      SELECT id FROM context_events WHERE created_by = auth.uid()
    )
  );

-- Event creators and context admins can create projections
CREATE POLICY "Event creators can create projections"
  ON calendar_projections FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    event_id IN (
      SELECT id FROM context_events
      WHERE created_by = auth.uid()
      OR context_id IN (
        SELECT id FROM contexts WHERE owner_user_id = auth.uid()
      )
      OR context_id IN (
        SELECT context_id FROM context_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'accepted'
      )
    )
  );

-- Target users can update their own projection status (accept/decline)
-- Projection creators can update or revoke
CREATE POLICY "Users can manage projections"
  ON calendar_projections FOR UPDATE
  USING (
    target_user_id = auth.uid()  -- Accept/decline own projections
    OR
    created_by = auth.uid()  -- Revoke own projections
    OR
    event_id IN (  -- Context admins can manage
      SELECT id FROM context_events
      WHERE context_id IN (
        SELECT id FROM contexts WHERE owner_user_id = auth.uid()
      )
      OR context_id IN (
        SELECT context_id FROM context_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'accepted'
      )
    )
  );

-- Projection creators can delete projections
CREATE POLICY "Projection creators can delete projections"
  ON calendar_projections FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    event_id IN (
      SELECT id FROM context_events
      WHERE context_id IN (
        SELECT id FROM contexts WHERE owner_user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Helper Functions (Permission Checks)
-- ============================================================================

-- Check if user can view a context
CREATE OR REPLACE FUNCTION user_can_view_context(
  check_context_id uuid,
  check_user_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contexts
    WHERE id = check_context_id
    AND (
      owner_user_id = check_user_id
      OR id IN (
        SELECT context_id FROM context_members
        WHERE user_id = check_user_id
        AND status = 'accepted'
      )
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user can edit a context
CREATE OR REPLACE FUNCTION user_can_edit_context(
  check_context_id uuid,
  check_user_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contexts
    WHERE id = check_context_id
    AND (
      owner_user_id = check_user_id
      OR id IN (
        SELECT context_id FROM context_members
        WHERE user_id = check_user_id
        AND role IN ('owner', 'admin', 'editor')
        AND status = 'accepted'
      )
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Triggers (Auto-update timestamps)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables
CREATE TRIGGER update_contexts_updated_at
  BEFORE UPDATE ON contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_members_updated_at
  BEFORE UPDATE ON context_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_events_updated_at
  BEFORE UPDATE ON context_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Documentation Comments
-- ============================================================================

COMMENT ON TABLE contexts IS 'Parallel context abstraction layer. Does NOT replace households, projects, trips, or spaces. Provides unified ownership model for future features.';

COMMENT ON TABLE context_members IS 'Parallel membership system. Does NOT replace household_members, project_users, trip_collaborators, or space_members. Used only for new context-owned features.';

COMMENT ON TABLE context_events IS 'Context-owned events. SEPARATE from calendar_events (household calendar). These events are invisible until explicitly projected.';

COMMENT ON TABLE calendar_projections IS 'Explicit event projection system. Core innovation: events do NOT appear in calendars without accepted projections. No auto-sync.';

COMMENT ON COLUMN contexts.linked_project_id IS 'Optional link to existing master_project. Nullable. Used when wrapping existing projects as contexts.';
COMMENT ON COLUMN contexts.linked_trip_id IS 'Optional link to existing trip. Nullable. Used when wrapping existing trips as contexts.';
COMMENT ON COLUMN contexts.linked_space_id IS 'Optional link to existing space. Nullable. Used when wrapping existing spaces as contexts.';

COMMENT ON COLUMN calendar_projections.status IS 'Projection status: suggested (system), pending (offered), accepted (visible), declined (hidden), revoked (owner removed)';
COMMENT ON COLUMN calendar_projections.scope IS 'What data is shared: date_only (time only), title (time+title), full (all details)';

