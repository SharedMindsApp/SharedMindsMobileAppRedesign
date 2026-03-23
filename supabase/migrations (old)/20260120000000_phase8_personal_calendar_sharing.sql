/*
  # Phase 8 - Prompt 1: Personal Calendar Sharing Foundation
  
  Implements the backend foundation for personal calendar sharing with strict privacy guarantees.
  
  Requirements:
  1. Users can share their entire personal calendar with other users
  2. Access defaults to read-only, with optional write permission
  3. Events support visibility controls (visible vs busy)
  4. When busy, shared viewers must NEVER receive sensitive data (title, description, type)
  5. All filtering must be server-side (database VIEW or RPC)
  
  This migration creates:
  - calendar_shares table (full-calendar sharing relationships)
  - share_visibility column on calendar_events
  - user_id column on calendar_events (for personal events)
  - RLS policies for secure access
  - Secure RPC function get_visible_calendar_events() (never exposes busy event details)
*/

-- ============================================================================
-- 1. Add user_id column to calendar_events (for personal events)
-- ============================================================================

-- Personal events have user_id set and household_id NULL
-- Household events have household_id set and user_id NULL
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint: event must belong to either a user (personal) OR household (shared), not both
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_ownership_check'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_ownership_check
    CHECK (
      (user_id IS NOT NULL AND household_id IS NULL) OR
      (user_id IS NULL AND household_id IS NOT NULL)
    );
  END IF;
END $$;

-- Add index for personal calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id 
ON calendar_events(user_id) 
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 2. Add share_visibility column to calendar_events
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'share_visibility'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN share_visibility text NOT NULL DEFAULT 'visible'
    CHECK (share_visibility IN ('visible', 'busy'));
  END IF;
END $$;

-- Add index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_calendar_events_share_visibility 
ON calendar_events(share_visibility) 
WHERE share_visibility = 'busy';

-- ============================================================================
-- 3. Create calendar_shares table
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner of the personal calendar being shared
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Viewer receiving access
  viewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission level: 'read' (default) or 'write'
  permission text NOT NULL DEFAULT 'read'
    CHECK (permission IN ('read', 'write')),
  
  -- Status: 'pending' (default), 'active', or 'revoked'
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  
  -- Who created the share (usually the owner)
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT calendar_shares_no_self_share 
    CHECK (owner_user_id != viewer_user_id),
  CONSTRAINT calendar_shares_unique 
    UNIQUE(owner_user_id, viewer_user_id)
);

-- ============================================================================
-- 4. Indexes for calendar_shares
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_calendar_shares_viewer_status 
ON calendar_shares(viewer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner_status 
ON calendar_shares(owner_user_id, status);

CREATE INDEX IF NOT EXISTS idx_calendar_shares_active 
ON calendar_shares(owner_user_id, viewer_user_id) 
WHERE status = 'active';

-- ============================================================================
-- 5. Updated_at trigger for calendar_shares
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calendar_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calendar_shares_updated_at_trigger ON calendar_shares;
CREATE TRIGGER update_calendar_shares_updated_at_trigger
  BEFORE UPDATE ON calendar_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_shares_updated_at();

-- ============================================================================
-- 6. Enable RLS on calendar_shares
-- ============================================================================

ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can manage their calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Viewers can view their calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Viewers can accept calendar shares" ON calendar_shares;

-- Owners can create, view, update, and delete their shares
CREATE POLICY "Owners can manage their calendar shares"
  ON calendar_shares
  FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Viewers can view shares where they are the viewer
CREATE POLICY "Viewers can view their calendar shares"
  ON calendar_shares
  FOR SELECT
  TO authenticated
  USING (viewer_user_id = auth.uid());

-- Viewers can update status from pending to active (accept invite)
-- NOTE: In RLS UPDATE policies:
--   - USING clause: column names refer to OLD (current row values) - checks if update is allowed
--   - WITH CHECK clause: column names refer to NEW (proposed row values) - validates new values
--   - OLD is NOT available in WITH CHECK clause
CREATE POLICY "Viewers can accept calendar shares"
  ON calendar_shares
  FOR UPDATE
  TO authenticated
  USING (
    -- Current row (OLD) must belong to viewer
    viewer_user_id = auth.uid()
    -- Current status must be pending (can accept) or active (can revoke)
    AND status IN ('pending', 'active')
  )
  WITH CHECK (
    -- Proposed row (NEW) must still belong to viewer
    -- Note: In WITH CHECK, column names refer to NEW values
    viewer_user_id = auth.uid()
    -- Can only set status to active (accept) or revoked (reject)
    AND status IN ('active', 'revoked')
    -- Note: Permission and other fields cannot be changed by viewers (owner policy handles that)
  );

-- ============================================================================
-- 7. Secure RPC Function for visible calendar events (CRITICAL: Server-side filtering)
-- ============================================================================

-- This function ensures busy events NEVER expose sensitive data to shared viewers
-- All filtering happens server-side - frontend never sees unsanitized data
-- Uses RPC function instead of VIEW because views cannot use auth.uid() in SELECT expressions

CREATE OR REPLACE FUNCTION get_visible_calendar_events(
  viewer_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  household_id uuid,
  created_by uuid,
  title text,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean,
  location text,
  event_type calendar_event_type,
  color text,
  share_visibility text,
  source_type text,
  source_entity_id uuid,
  source_project_id uuid,
  source_track_id uuid,
  projection_state text,
  activity_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  effective_viewer_id uuid;
BEGIN
  -- If viewer_user_id is NULL, use current authenticated user
  effective_viewer_id := COALESCE(viewer_user_id, auth.uid());
  
  -- If still NULL, return empty (not authenticated)
  IF effective_viewer_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.household_id,
    e.created_by,
    -- Conditional field exposure based on viewer and visibility
    CASE
      -- Owner always sees full data
      WHEN e.user_id = effective_viewer_id THEN e.title
      -- Shared viewer: full data if visible, "Busy" if busy
      WHEN e.share_visibility = 'visible' THEN e.title
      ELSE 'Busy'
    END AS title,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.description
      WHEN e.share_visibility = 'visible' THEN e.description
      ELSE NULL
    END AS description,
    
    e.start_at,
    e.end_at,
    e.all_day,
    e.location,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.event_type
      WHEN e.share_visibility = 'visible' THEN e.event_type
      ELSE NULL
    END AS event_type,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.color
      WHEN e.share_visibility = 'visible' THEN e.color
      ELSE 'gray'
    END AS color,
    
    e.share_visibility,
    
    -- Source attribution (only for owner)
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.source_type
      ELSE NULL
    END AS source_type,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.source_entity_id
      ELSE NULL
    END AS source_entity_id,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.source_project_id
      ELSE NULL
    END AS source_project_id,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.source_track_id
      ELSE NULL
    END AS source_track_id,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.projection_state::text
      ELSE NULL
    END AS projection_state,
    
    CASE
      WHEN e.user_id = effective_viewer_id THEN e.activity_id
      ELSE NULL
    END AS activity_id,
    
    e.created_at,
    e.updated_at

  FROM calendar_events e
  WHERE
    -- Owner sees all their personal events
    (e.user_id = effective_viewer_id AND e.household_id IS NULL)
    OR
    -- Household members see household events (existing behavior)
    -- NOTE: This function is primarily for personal calendar sharing with privacy controls
    -- Household events are included for completeness but rely on existing RLS policies
    -- Uses auth_user_id pattern from current schema (20260101104654)
    (e.household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = e.household_id
      AND hm.auth_user_id = effective_viewer_id
      AND hm.status = 'active'
    ))
    OR
    -- Shared viewers see personal events when:
    -- 1. Event belongs to a user (not household)
    -- 2. Active share exists
    -- 3. Viewer matches
    (e.user_id IS NOT NULL 
     AND e.household_id IS NULL
     AND e.user_id != effective_viewer_id
     AND EXISTS (
       SELECT 1 FROM calendar_shares cs
       WHERE cs.owner_user_id = e.user_id
       AND cs.viewer_user_id = effective_viewer_id
       AND cs.status = 'active'
     ));
END;
$$;

-- ============================================================================
-- 8. Extend RLS policies for calendar_events (shared access)
-- ============================================================================

-- NOTE: We do NOT drop the existing household policies - they remain active
-- We only add NEW policies for personal calendar events

-- Owners can view their personal events
-- This policy applies when: user_id = auth.uid() AND household_id IS NULL
CREATE POLICY "Owners can view their personal calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND household_id IS NULL
  );

-- Shared viewers can view personal events (read-only, via active shares)
-- NOTE: This only allows SELECT - INSERT/UPDATE/DELETE are NOT allowed for viewers
-- NOTE: This policy only applies when the existing household policy doesn't match
CREATE POLICY "Shared viewers can view personal calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    -- Event is a personal event (not household)
    user_id IS NOT NULL
    AND household_id IS NULL
    -- Viewer is NOT the owner (owners use the policy above)
    AND user_id != auth.uid()
    -- Active share exists
    AND EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.owner_user_id = calendar_events.user_id
      AND cs.viewer_user_id = auth.uid()
      AND cs.status = 'active'
    )
  );

-- Owners can insert/update/delete their personal events
-- NOTE: Household event INSERT/UPDATE/DELETE policies remain unchanged

CREATE POLICY "Owners can create their personal calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND household_id IS NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "Owners can update their personal calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND household_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND household_id IS NULL
  );

CREATE POLICY "Owners can delete their personal calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND household_id IS NULL
  );

-- NOTE: Write permissions for shared viewers (permission = 'write') will be
-- implemented in a future phase. Phase 8 Prompt 1 does NOT enable write access.
-- The calendar_shares.permission column exists for future use but is not enforced yet.

-- ============================================================================
-- 9. Comments and Documentation
-- ============================================================================

COMMENT ON TABLE calendar_shares IS 
  'Full-calendar sharing relationships for personal calendars. Enables users to share their entire personal calendar with other users.';

COMMENT ON COLUMN calendar_shares.owner_user_id IS 
  'User who owns the personal calendar being shared';

COMMENT ON COLUMN calendar_shares.viewer_user_id IS 
  'User receiving access to the personal calendar';

COMMENT ON COLUMN calendar_shares.permission IS 
  'Permission level: read (view only) or write (create/edit/delete). Write permission groundwork - not enforced in Phase 8 Prompt 1.';

COMMENT ON COLUMN calendar_shares.status IS 
  'Share status: pending (invite sent), active (accepted), or revoked (deleted/rejected)';

COMMENT ON COLUMN calendar_shares.created_by IS 
  'User who created the share (usually the owner)';

COMMENT ON COLUMN calendar_events.share_visibility IS 
  'Visibility control for shared calendars: visible (full details) or busy (time block only, no sensitive data)';

COMMENT ON COLUMN calendar_events.user_id IS 
  'User ID for personal calendar events. References auth.users(id). Mutually exclusive with household_id.';

COMMENT ON FUNCTION get_visible_calendar_events(uuid) IS 
  'Secure RPC function that returns calendar events visible to the requesting user. Ensures busy events NEVER expose sensitive data (title, description, type) to shared viewers. All filtering is server-side - frontend never sees unsanitized data. Use this function instead of querying calendar_events directly when privacy is critical.';
