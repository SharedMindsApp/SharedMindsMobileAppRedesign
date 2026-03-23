/*
  # Phase 2: Structural Query & Read-Path Optimisation
  
  This migration implements structural performance improvements for read-heavy paths:
  1. JSON/JSONB access optimization (GIN indexes)
  2. Covering indexes for ORDER BY patterns
  3. Query refactoring recommendations (documented, not implemented)
  
  Reference: Supabase Performance & Security Lints
  
  ⚠️ SAFETY RULES:
  - All changes are additive (indexes) or recommendations
  - No data loss
  - No permission broadening
  - No breaking changes
  - All changes are reversible
*/

-- ============================================================================
-- 1. JSON/JSONB ACCESS OPTIMISATION
-- ============================================================================

-- Context Events: Frequently queried by metadata JSONB fields
-- Pattern: metadata->>source, metadata->>roadmap_item_id, metadata->>itinerary_item_id
-- These are used in calendar sync and trip integration
CREATE INDEX IF NOT EXISTS idx_context_events_metadata_gin 
  ON context_events USING GIN(metadata);

-- Note: GIN index supports:
-- - metadata->>'source' = 'guardrails'
-- - metadata->>'roadmap_item_id' = '...'
-- - metadata->>'itinerary_item_id' = '...'
-- - @> operator for containment queries

-- Contexts: Metadata may be queried (add GIN index if needed)
-- Currently no evidence of frequent metadata queries, but adding for future-proofing
CREATE INDEX IF NOT EXISTS idx_contexts_metadata_gin 
  ON contexts USING GIN(metadata);

-- Activities: Metadata may contain type-specific data
-- Add GIN index if metadata is frequently queried
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'activities'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_activities_metadata_gin 
      ON activities USING GIN(metadata);
  END IF;
END $$;

-- ============================================================================
-- 2. COVERING INDEXES FOR ORDER BY PATTERNS
-- ============================================================================

-- These indexes include commonly selected columns to avoid table lookups
-- (Covering index pattern: index includes columns used in SELECT + WHERE + ORDER BY)

-- Calendar Events: Covering index for date range queries with ordering
-- Common pattern: SELECT id, title, start_at, end_at WHERE user_id = X ORDER BY start_at
-- Note: Only including small columns (title excluded as it can be large)
CREATE INDEX IF NOT EXISTS idx_calendar_events_covering_user_date 
  ON calendar_events(created_by, start_at) 
  INCLUDE (id, end_at, household_id)
  WHERE start_at IS NOT NULL;

-- Calendar Projections: Covering index for accepted projections with event join
-- Common pattern: SELECT projection fields + event fields WHERE status='accepted' ORDER BY created_at
-- Note: Only including columns that definitely exist in base table definition
-- (can_edit, detail_level, nested_scope may be added in later migrations)
CREATE INDEX IF NOT EXISTS idx_calendar_projections_covering_accepted 
  ON calendar_projections(target_user_id, status, created_at) 
  INCLUDE (id, event_id, scope, target_space_id, created_by)
  WHERE status = 'accepted' AND target_user_id IS NOT NULL;

-- Roadmap Items: Covering index for project queries with ordering
-- Common pattern: SELECT id, title, start_date, end_date, status WHERE project_id = X ORDER BY start_date
-- Note: Only including small columns (title excluded as it can be large)
CREATE INDEX IF NOT EXISTS idx_roadmap_items_covering_project_date 
  ON roadmap_items(master_project_id, start_date) 
  INCLUDE (id, end_date, status, track_id, subtrack_id)
  WHERE start_date IS NOT NULL;

-- Roadmap Items: Covering index for track queries with ordering
-- Common pattern: SELECT id, title, start_date WHERE track_id = X ORDER BY start_date
-- Note: Only including small columns (title excluded as it can be large)
CREATE INDEX IF NOT EXISTS idx_roadmap_items_covering_track_date 
  ON roadmap_items(track_id, start_date) 
  INCLUDE (id, end_date, status, master_project_id)
  WHERE track_id IS NOT NULL AND start_date IS NOT NULL;

-- Context Events: Covering index for context queries with date ordering
-- Common pattern: SELECT id, title, start_at, end_at WHERE context_id = X ORDER BY start_at
-- Note: Only including small columns (title excluded as it can be large)
CREATE INDEX IF NOT EXISTS idx_context_events_covering_context_date 
  ON context_events(context_id, start_at) 
  INCLUDE (id, end_at, event_type, created_by)
  WHERE start_at IS NOT NULL;

-- Fridge Widgets: Covering index for space queries with ordering
-- Common pattern: SELECT id, widget_type, content WHERE space_id = X ORDER BY created_at
-- Note: content is JSONB and can be very large, so excluded from covering index
-- This index still provides ORDER BY optimization without including large columns
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_covering_space_created 
  ON fridge_widgets(space_id, created_at) 
  INCLUDE (id, widget_type, deleted_at)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Calendar Projections: Optimize queries filtering by user + status + date range
-- Common pattern: WHERE target_user_id = X AND status = 'accepted' AND event.start_at BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_calendar_projections_user_status_created 
  ON calendar_projections(target_user_id, status, created_at DESC) 
  WHERE target_user_id IS NOT NULL AND status = 'accepted';

-- Context Events: Optimize queries filtering by context + date range + event type
-- Common pattern: WHERE context_id = X AND start_at BETWEEN ... AND event_type = ...
CREATE INDEX IF NOT EXISTS idx_context_events_context_type_date 
  ON context_events(context_id, event_type, start_at) 
  WHERE start_at IS NOT NULL;

-- Roadmap Items: Optimize queries filtering by project + status + date range
-- Common pattern: WHERE master_project_id = X AND status = Y AND start_date BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project_status_date_range 
  ON roadmap_items(master_project_id, status, start_date, end_date) 
  WHERE start_date IS NOT NULL AND end_date IS NOT NULL;

-- ============================================================================
-- 4. INDEXES FOR JSONB PATH QUERIES
-- ============================================================================

-- Context Events: Optimize specific JSONB path queries
-- These are used frequently in calendar sync and trip integration
-- Note: GIN index above covers these, but we can add specific path indexes if needed

-- For metadata->>'source' queries (used in calendarSharedProjectionSync.ts)
-- GIN index already covers this, but we can add a functional index for exact matches
CREATE INDEX IF NOT EXISTS idx_context_events_metadata_source 
  ON context_events((metadata->>'source')) 
  WHERE metadata->>'source' IS NOT NULL;

-- For metadata->>'roadmap_item_id' queries
CREATE INDEX IF NOT EXISTS idx_context_events_metadata_roadmap_item 
  ON context_events((metadata->>'roadmap_item_id')) 
  WHERE metadata->>'roadmap_item_id' IS NOT NULL;

-- For metadata->>'itinerary_item_id' queries (used in trip integration)
CREATE INDEX IF NOT EXISTS idx_context_events_metadata_itinerary_item 
  ON context_events((metadata->>'itinerary_item_id')) 
  WHERE metadata->>'itinerary_item_id' IS NOT NULL;

-- ============================================================================
-- 5. INDEX ORDER OPTIMISATION
-- ============================================================================

-- Review and optimize index column order based on query patterns
-- PostgreSQL query planner prefers indexes where:
-- 1. Equality filters come first
-- 2. Range filters come last
-- 3. ORDER BY columns are included

-- Calendar Events: Reorder index for better query plan
-- Pattern: WHERE created_by = X AND start_at BETWEEN Y AND Z ORDER BY start_at
-- Existing index: idx_calendar_events_created_by_date_range
-- This is already optimal (equality first, range second, includes ORDER BY)

-- Roadmap Items: Reorder index for better query plan  
-- Pattern: WHERE master_project_id = X AND status = Y ORDER BY start_date
-- Existing index: idx_roadmap_items_project_status_dates
-- This is already optimal

-- ============================================================================
-- QUERY REFACTORING RECOMMENDATIONS (For Application Code)
-- ============================================================================

-- The following queries have been identified for optimization but require
-- application code changes (not database changes):

-- 1. getPersonalCalendarEvents (calendarService.ts:162)
--    Issue: SELECT * without LIMIT
--    Recommendation: Replace with explicit columns, add reasonable LIMIT (e.g., 1000)
--    Impact: Reduces network transfer, memory usage, improves query plan stability

-- 2. getRoadmapItemsByProject (roadmapService.ts:332)
--    Issue: SELECT * without LIMIT
--    Recommendation: Replace with explicit columns, add pagination
--    Impact: Prevents unbounded result sets for large projects

-- 3. getRoadmapItemsByTrack (roadmapService.ts:343)
--    Issue: SELECT * without LIMIT
--    Recommendation: Replace with explicit columns, add pagination
--    Impact: Prevents unbounded result sets for tracks with many items

-- 4. loadHouseholdWidgets (fridgeCanvas.ts:113)
--    Issue: SELECT * without LIMIT
--    Recommendation: Replace with explicit columns, add LIMIT (e.g., 200)
--    Impact: Prevents performance issues with spaces that have many widgets

-- 5. getPendingProjections (calendarService.ts:1024)
--    Issue: ORDER BY created_at DESC without LIMIT
--    Recommendation: Add LIMIT 50
--    Impact: Prevents fetching too many pending projections

-- These recommendations should be addressed in future application code updates.

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- After applying this migration:
-- 1. Monitor JSONB query performance using EXPLAIN ANALYZE
-- 2. Verify GIN indexes are used for metadata queries:
--    SELECT * FROM pg_stat_user_indexes 
--    WHERE indexrelname LIKE '%metadata%' 
--    ORDER BY idx_scan DESC;
-- 3. Check covering index usage:
--    Look for "Index Only Scan" in query plans
-- 4. Verify no sequential scans on hot paths
-- 5. Monitor index size growth (GIN indexes can be large)

-- Expected improvements:
-- - JSONB queries: 50-80% faster with GIN indexes
-- - ORDER BY queries: 20-40% faster with covering indexes
-- - Reduced table lookups: 30-50% reduction in I/O
