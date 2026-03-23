/*
  # Phase 1: Database Performance Quick Wins
  
  This migration implements low-risk, high-ROI performance improvements:
  1. Missing indexes on common WHERE/JOIN columns
  2. RLS policy optimizations (remove subqueries where possible)
  3. Query safety notes (for application code review)
  
  Reference: Supabase Performance & Security Lints
  
  ⚠️ SAFETY RULES:
  - All changes are additive (indexes) or safe optimizations
  - No data loss
  - No permission broadening
  - All changes are reversible
*/

-- ============================================================================
-- 1. MISSING INDEXES ON COMMON WHERE/JOIN COLUMNS
-- ============================================================================

-- Calendar Events: Frequently filtered by created_by, household_id, source_project_id
-- Note: calendar_events uses created_by (references profiles), not user_id
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by 
  ON calendar_events(created_by);

CREATE INDEX IF NOT EXISTS idx_calendar_events_household_id 
  ON calendar_events(household_id);

-- Note: source_project_id and source_track_id indexes already exist from earlier migration
-- (20251217204816_add_calendar_source_attribution.sql)
-- Keeping these for completeness, but they may already exist
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_project 
  ON calendar_events(source_project_id) 
  WHERE source_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_source_track 
  ON calendar_events(source_track_id) 
  WHERE source_track_id IS NOT NULL;

-- Calendar Projections: Frequently filtered by target_user_id, target_space_id, status
CREATE INDEX IF NOT EXISTS idx_calendar_projections_target_user_status 
  ON calendar_projections(target_user_id, status) 
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_projections_target_space_status 
  ON calendar_projections(target_space_id, status) 
  WHERE target_space_id IS NOT NULL;

-- Context Events: Frequently filtered by context_id, created_by
CREATE INDEX IF NOT EXISTS idx_context_events_context_id 
  ON context_events(context_id);

CREATE INDEX IF NOT EXISTS idx_context_events_created_by 
  ON context_events(created_by);

-- Roadmap Items: Frequently filtered by master_project_id, track_id, subtrack_id
-- Note: master_project_id index already exists from earlier migration
CREATE INDEX IF NOT EXISTS idx_roadmap_items_track_id 
  ON roadmap_items(track_id) 
  WHERE track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_subtrack_id 
  ON roadmap_items(subtrack_id) 
  WHERE subtrack_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_status 
  ON roadmap_items(status) 
  WHERE status IS NOT NULL;

-- Composite index for common query pattern: project + status + dates
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project_status_dates 
  ON roadmap_items(master_project_id, status, start_date, end_date) 
  WHERE start_date IS NOT NULL AND end_date IS NOT NULL;

-- Guardrails Tracks: Frequently filtered by master_project_id
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_project 
  ON guardrails_tracks(master_project_id);

-- Guardrails Subtracks: Frequently filtered by track_id
CREATE INDEX IF NOT EXISTS idx_guardrails_subtracks_track_id 
  ON guardrails_subtracks(track_id);

-- Project Users: Frequently filtered by master_project_id, user_id
CREATE INDEX IF NOT EXISTS idx_project_users_project_user 
  ON project_users(master_project_id, user_id) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_users_user_id 
  ON project_users(user_id) 
  WHERE archived_at IS NULL;

-- Spaces: Frequently filtered by owner_id
-- Note: spaces table does not have household_id column
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id 
  ON spaces(owner_id);

-- Space Members: Frequently filtered by space_id, user_id
CREATE INDEX IF NOT EXISTS idx_space_members_space_user 
  ON space_members(space_id, user_id) 
  WHERE status = 'active';

-- Fridge Widgets: Frequently filtered by space_id, deleted_at
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_space_active 
  ON fridge_widgets(space_id) 
  WHERE deleted_at IS NULL;

-- Mind Mesh Containers: Frequently filtered by workspace_id
-- Note: mindmesh_containers table does not have entity_type column
CREATE INDEX IF NOT EXISTS idx_mindmesh_containers_workspace 
  ON mindmesh_containers(workspace_id);

-- Mind Mesh Nodes: Frequently filtered by workspace_id
-- Note: mindmesh_nodes table does not have container_id column
-- It has source_port_id and target_port_id (indexes already exist from original migration)
CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_workspace 
  ON mindmesh_nodes(workspace_id);

-- Files: Frequently filtered by space_id, space_type
CREATE INDEX IF NOT EXISTS idx_files_space_type 
  ON files(space_id, space_type) 
  WHERE space_id IS NOT NULL;

-- Personal Todos: Frequently filtered by user_id, household_id, completed
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_household 
  ON personal_todos(user_id, household_id);

CREATE INDEX IF NOT EXISTS idx_personal_todos_completed_due 
  ON personal_todos(completed, due_date) 
  WHERE due_date IS NOT NULL;

-- Todo Space Shares: Frequently filtered by todo_id, space_id
CREATE INDEX IF NOT EXISTS idx_todo_space_shares_todo_space 
  ON todo_space_shares(todo_id, space_id);

-- Context Members: Frequently filtered by context_id, user_id
CREATE INDEX IF NOT EXISTS idx_context_members_context_user 
  ON context_members(context_id, user_id);

-- Personal Calendar Shares: Composite index for common lookup pattern
-- Note: Only create if table exists (created in 20260105000000_add_personal_calendar_shares.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'personal_calendar_shares'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_lookup 
      ON personal_calendar_shares(shared_with_user_id, scope_type, project_id);
  END IF;
END $$;

-- ============================================================================
-- 2. RLS POLICY OPTIMIZATIONS
-- ============================================================================

-- Optimize members table INSERT policy to use helper function instead of subquery
-- This avoids potential recursion and improves performance
DO $$
BEGIN
  -- Check if helper function exists (from earlier migration)
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_household_ids' 
    AND pronargs = 1
  ) THEN
    -- Drop existing policy
    DROP POLICY IF EXISTS "Authenticated users can insert members" ON members;
    
    -- Create optimized policy using helper function
    CREATE POLICY "Authenticated users can insert members"
      ON members FOR INSERT
      TO authenticated
      WITH CHECK (
        -- User must be a member of the household they're adding to (using helper function)
        household_id IN (
          SELECT household_id FROM get_user_household_ids(auth.uid())
        )
        OR
        -- Or user must be creating themselves (for initial household setup)
        user_id = auth.uid()
      );
  END IF;
END $$;

-- ============================================================================
-- 3. INDEXES FOR ORDER BY PATTERNS
-- ============================================================================

-- Common pattern: ORDER BY created_at DESC (for recent items)
-- These indexes support both filtering and ordering

-- Calendar Events: Order by created_at for recent events
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_desc 
  ON calendar_events(created_at DESC) 
  WHERE created_at IS NOT NULL;

-- Calendar Projections: Order by created_at for pending projections
CREATE INDEX IF NOT EXISTS idx_calendar_projections_created_desc 
  ON calendar_projections(created_at DESC) 
  WHERE status = 'pending';

-- Roadmap Items: Order by start_date for timeline views
CREATE INDEX IF NOT EXISTS idx_roadmap_items_start_date_asc 
  ON roadmap_items(start_date ASC) 
  WHERE start_date IS NOT NULL;

-- Context Events: Order by start_at for calendar views
CREATE INDEX IF NOT EXISTS idx_context_events_start_at 
  ON context_events(start_at) 
  WHERE start_at IS NOT NULL;

-- Fridge Widgets: Order by created_at for widget lists
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_created_asc 
  ON fridge_widgets(created_at ASC) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Calendar Events: Created By + Date Range queries (very common)
-- Note: calendar_events uses start_at/end_at (timestamptz), not start_date/end_date
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by_date_range 
  ON calendar_events(created_by, start_at, end_at) 
  WHERE created_by IS NOT NULL AND start_at IS NOT NULL;

-- Calendar Events: Household + Date Range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_household_date_range 
  ON calendar_events(household_id, start_at, end_at) 
  WHERE household_id IS NOT NULL AND start_at IS NOT NULL;

-- Roadmap Items: Project + Track + Date Range
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project_track_dates 
  ON roadmap_items(master_project_id, track_id, start_date, end_date) 
  WHERE track_id IS NOT NULL AND start_date IS NOT NULL;

-- Project Users: Active members lookup (project + not archived)
CREATE INDEX IF NOT EXISTS idx_project_users_active 
  ON project_users(master_project_id, user_id) 
  WHERE archived_at IS NULL;

-- Space Members: Active members lookup (space + active status)
CREATE INDEX IF NOT EXISTS idx_space_members_active 
  ON space_members(space_id, user_id) 
  WHERE status = 'active';

-- ============================================================================
-- 5. PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- These indexes only include rows matching common WHERE conditions
-- Smaller index size = faster queries

-- Calendar Events: Only non-deleted events
-- Note: calendar_events doesn't have deleted_at column, so this index uses created_by and start_at
CREATE INDEX IF NOT EXISTS idx_calendar_events_active 
  ON calendar_events(created_by, start_at) 
  WHERE start_at IS NOT NULL;

-- Roadmap Items: Project + Date queries (active items)
-- Note: roadmap_items table does not have archived_at column
CREATE INDEX IF NOT EXISTS idx_roadmap_items_active 
  ON roadmap_items(master_project_id, start_date) 
  WHERE start_date IS NOT NULL;

-- Fridge Widgets: Only active widgets
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_active 
  ON fridge_widgets(space_id, created_at) 
  WHERE deleted_at IS NULL;

-- Personal Todos: Only incomplete todos
CREATE INDEX IF NOT EXISTS idx_personal_todos_incomplete 
  ON personal_todos(user_id, due_date) 
  WHERE completed = false;

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- After applying this migration:
-- 1. Monitor query performance using EXPLAIN ANALYZE
-- 2. Check index usage with: 
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
-- 3. Verify RLS policies still work correctly
-- 4. No breaking changes should occur (all changes are additive)

-- ============================================================================
-- QUERY SAFETY RECOMMENDATIONS (For Application Code Review)
-- ============================================================================

-- The following patterns were identified but require application code changes:
-- 
-- 1. SELECT * Usage (469 instances found)
--    - Replace with explicit column lists where possible
--    - Reduces network transfer and memory usage
--    - Improves query plan stability
--
-- 2. Queries without LIMIT (15+ instances found)
--    - Add reasonable LIMIT clauses to queries ordering by created_at/updated_at
--    - Prevents unbounded result sets
--    - Examples:
--      - getPendingProjections: Add LIMIT 50
--      - getRoadmapItemsByProject: Consider pagination
--      - loadHouseholdWidgets: Add LIMIT if space has many widgets
--
-- 3. Date Range Queries
--    - Ensure date range queries always have both start and end bounds
--    - Use indexes created above for optimal performance
--
-- These recommendations should be addressed in future application code updates.
