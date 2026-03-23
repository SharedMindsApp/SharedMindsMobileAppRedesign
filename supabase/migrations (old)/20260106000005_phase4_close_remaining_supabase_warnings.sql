/*
  # Phase 4: Close Remaining Supabase Performance Advisor Warnings
  
  This migration addresses remaining Performance Advisor warnings:
  1. Unindexed foreign keys (add indexes for FKs used in JOINs)
  2. Index review documentation (identify indexes for potential removal)
  3. Other Performance Advisor warnings (sequential scans, redundant indexes)
  
  ⚠️ SAFETY RULES:
  - All changes are additive (indexes only)
  - No index removal without evidence (documented for review)
  - Use CONCURRENTLY for all index operations (production safe)
  - No schema changes
  - All changes are reversible
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================
-- Foreign keys without indexes can cause:
-- - Slow JOINs
-- - Lock contention on parent table updates/deletes
-- - Sequential scans on child table

-- Personal Calendar Shares: project_id FK (nullable, but used in queries)
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) for migration compatibility
-- These indexes are small and migrations typically run during low-traffic periods
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'personal_calendar_shares'
  ) THEN
    -- Check if index already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'personal_calendar_shares' 
      AND indexname = 'idx_personal_calendar_shares_project_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_personal_calendar_shares_project_id
        ON personal_calendar_shares(project_id)
        WHERE project_id IS NOT NULL;
      
      COMMENT ON INDEX idx_personal_calendar_shares_project_id IS
        'Index on project_id FK for JOIN performance. Added in Phase 4 to address unindexed_foreign_keys warning.';
    END IF;
  END IF;
END $$;

-- Calendar Sync Settings: target_space_id FK (nullable, but used in queries)
-- Note: Some tables have composite indexes that include target_space_id, but individual index may be needed
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) for migration compatibility

-- project_calendar_sync_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_calendar_sync_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'project_calendar_sync_settings' 
      AND indexname = 'idx_project_sync_target_space'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_project_sync_target_space
        ON project_calendar_sync_settings(target_space_id)
        WHERE target_space_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- track_calendar_sync_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'track_calendar_sync_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'track_calendar_sync_settings' 
      AND indexname = 'idx_track_sync_target_space'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_track_sync_target_space
        ON track_calendar_sync_settings(target_space_id)
        WHERE target_space_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- subtrack_calendar_sync_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subtrack_calendar_sync_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'subtrack_calendar_sync_settings' 
      AND indexname = 'idx_subtrack_sync_target_space'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_subtrack_sync_target_space
        ON subtrack_calendar_sync_settings(target_space_id)
        WHERE target_space_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- event_calendar_sync_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_calendar_sync_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'event_calendar_sync_settings' 
      AND indexname = 'idx_event_sync_target_space'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_event_sync_target_space
        ON event_calendar_sync_settings(target_space_id)
        WHERE target_space_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Skill Entity Links: context_id FK (nullable, but used in queries)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_entity_links'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'skill_entity_links' 
      AND indexname = 'idx_skill_entity_links_context_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_skill_entity_links_context_id
        ON skill_entity_links(context_id)
        WHERE context_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Skill Plans: context_id FK (nullable, but used in queries)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_plans'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'skill_plans' 
      AND indexname = 'idx_skill_plans_context_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_skill_plans_context_id
        ON skill_plans(context_id)
        WHERE context_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Skill External Reflections: context_id FK (nullable, but used in queries)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_external_reflections'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'skill_external_reflections' 
      AND indexname = 'idx_skill_external_reflections_context_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_skill_external_reflections_context_id
        ON skill_external_reflections(context_id)
        WHERE context_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Shared Understanding Agreements: agreement_id FK (used in skill_external_reflections)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_external_reflections'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'skill_external_reflections' 
      AND indexname = 'idx_skill_external_reflections_agreement_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_skill_external_reflections_agreement_id
        ON skill_external_reflections(agreement_id);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 2. INDEX REVIEW DOCUMENTATION
-- ============================================================================
-- The following indexes should be reviewed using pg_stat_user_indexes
-- to identify truly unused indexes before removal.
-- 
-- Review Query:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;
--
-- Indexes with idx_scan = 0 for 14+ days in production may be candidates for removal.
-- However, some indexes may be used infrequently but are still important (e.g., for rare queries).

-- Indexes to Review (DO NOT REMOVE WITHOUT EVIDENCE):
-- 
-- 1. Functional indexes on JSONB paths:
--    - idx_context_events_metadata_source
--    - idx_context_events_metadata_roadmap_item
--    - idx_context_events_metadata_itinerary_item
--    These may be redundant if GIN index (idx_context_events_metadata_gin) is sufficient.
--    Review: Check if functional indexes are used more than GIN index.
--
-- 2. Single-column indexes that may be covered by composite indexes:
--    - idx_calendar_events_created_by (may be covered by idx_calendar_events_covering_user_date)
--    - idx_roadmap_items_track_id (may be covered by idx_roadmap_items_covering_track_date)
--    - idx_roadmap_items_subtrack_id (check if frequently queried alone)
--    Review: Check if single-column index is used when composite index exists.
--
-- 3. Preventive indexes (added for future-proofing):
--    - idx_contexts_metadata_gin (may not be queried yet)
--    - idx_activities_metadata_gin (may not be queried yet)
--    Review: Monitor for 30 days, then decide.

-- ============================================================================
-- 3. POTENTIAL REDUNDANT INDEX IDENTIFICATION
-- ============================================================================
-- The following index pairs should be reviewed for redundancy:
--
-- Calendar Events:
--   - idx_calendar_events_created_by (single column)
--   - idx_calendar_events_covering_user_date (composite, includes created_by)
--   Decision: Keep both if single-column index is used for simple equality checks
--            and composite is used for date range queries.
--
-- Roadmap Items:
--   - idx_roadmap_items_track_id (single column)
--   - idx_roadmap_items_covering_track_date (composite, includes track_id)
--   Decision: Keep both if single-column index is used for simple equality checks
--            and composite is used for date-ordered queries.
--
-- Calendar Projections:
--   - idx_calendar_projections_target_user_status (composite)
--   - idx_calendar_projections_covering_accepted (composite, includes target_user_id + status)
--   Decision: Review if both are used or if one makes the other redundant.

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================
-- After applying this migration, run these queries to verify:

-- Check index usage:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch,
--   CASE 
--     WHEN idx_scan = 0 THEN 'UNUSED - Review for removal'
--     WHEN idx_scan < 10 THEN 'LOW USAGE - Monitor'
--     ELSE 'ACTIVE'
--   END AS usage_status
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;

-- Check for unindexed foreign keys:
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   CASE 
--     WHEN idx.indexname IS NULL THEN 'MISSING INDEX'
--     ELSE 'INDEXED'
--   END AS index_status
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- LEFT JOIN pg_indexes idx
--   ON idx.tablename = tc.table_name
--   AND idx.indexdef LIKE '%' || kcu.column_name || '%'
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration is conservative and additive only.
-- No indexes are removed without evidence from pg_stat_user_indexes.
-- 
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) because:
-- 1. Migrations typically run during low-traffic periods
-- 2. These indexes are small (single column, partial indexes)
-- 3. Regular CREATE INDEX works in transaction blocks (DO blocks)
-- 4. IF NOT EXISTS prevents errors if index already exists
-- 
-- For production deployments with high traffic, consider:
-- - Running migration during maintenance window
-- - Or manually creating indexes with CONCURRENTLY outside of migration
-- 
-- Review indexes after 14+ days of production usage before considering removal.
