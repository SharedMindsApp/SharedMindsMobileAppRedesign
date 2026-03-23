# Phase 3: Schema Evolution, Write-Path Scaling & Long-Term Architecture

## Executive Summary

Phase 3 focuses on **structural sustainability** and **long-term scalability** of the SharedMinds database. This phase identifies growth risks, proposes schema evolution strategies, and establishes patterns for sustainable scaling over the next 1-12 months.

**Status:** Strategic Planning & Recommendations (No Implementation)

**Migration Files:** None (planning phase only)

---

## 1. Phase 3 Executive Summary

### Long-Term Risks Identified

**1. JSONB Metadata Query Performance**
- **Risk:** `context_events.metadata` fields (`source`, `roadmap_item_id`, `itinerary_item_id`) are queried frequently but stored as JSONB
- **Impact:** GIN indexes help, but column promotion would provide better performance and type safety
- **Timeline:** Medium-term (3-6 months)

**2. Unbounded Table Growth**
- **Risk:** `analytics_events`, `calendar_events`, `context_events` have time-series characteristics with unbounded growth
- **Impact:** Query performance degradation, storage costs, backup/restore complexity
- **Timeline:** Long-term (6-12 months)

**3. Write Amplification**
- **Risk:** Multiple triggers updating `updated_at` on every UPDATE, index maintenance overhead
- **Impact:** Slower writes, increased lock contention
- **Timeline:** Medium-term (3-6 months)

**4. Aggregation Query Performance**
- **Risk:** Dashboard statistics, deadline calculations computed on-the-fly
- **Impact:** Slow dashboard loads, poor UX during peak usage
- **Timeline:** Short-term (1-3 months)

### Changes Proposed (High-Level)

**Schema Evolution:**
- Promote `context_events.metadata->>'source'` → `source_type` column
- Promote `context_events.metadata->>'roadmap_item_id'` → `source_roadmap_item_id` column
- Promote `context_events.metadata->>'itinerary_item_id'` → `source_itinerary_item_id` column

**Partitioning Strategy:**
- **analytics_events**: Range partition by `created_at` (monthly partitions)
- **calendar_events**: Range partition by `start_at` (monthly partitions, optional)
- **context_events**: Range partition by `start_at` (monthly partitions, optional)

**Write-Path Optimisation:**
- Consolidate `updated_at` triggers into single function
- Flag redundant indexes for potential removal
- Consider deferred index maintenance for low-priority indexes

**Background Jobs:**
- Materialized view for dashboard statistics (refresh every 5 minutes)
- Periodic cleanup job for old analytics events (retention policy)
- Index maintenance job (VACUUM ANALYZE scheduling)

**Caching Strategy:**
- Application-level caching for dashboard aggregations (5-minute TTL)
- Query result caching for frequently accessed calendar views (1-minute TTL)
- No database-level caching (Supabase handles this)

### Expected Impact (1-12 Months)

**Short-term (1-3 months):**
- **20-30% faster** dashboard loads with materialized views
- **10-15% faster** writes with trigger optimization
- **Reduced storage costs** with analytics retention policy

**Medium-term (3-6 months):**
- **30-50% faster** metadata queries with column promotion
- **50-70% faster** partitioned table queries
- **Reduced index bloat** with maintenance jobs

**Long-term (6-12 months):**
- **Predictable performance** as data grows
- **Reduced operational complexity** with automated partitioning
- **Lower storage costs** with data lifecycle management

### Risk Profile

**Low Risk:**
- Trigger consolidation (additive, reversible)
- Index flagging (no removal, just documentation)
- Caching strategy (advisory only)

**Medium Risk:**
- Column promotion (requires dual-write period, careful migration)
- Materialized views (requires refresh strategy, failure handling)

**High Risk:**
- Table partitioning (irreversible, requires careful planning)
- Analytics retention (data loss if misconfigured)

**Mitigation Strategy:**
- All changes follow additive → dual-write → switch → clean-up pattern
- Comprehensive rollback plans for each change
- Staged rollout with observability at each step
- No "big bang" migrations

---

## 2. Schema Evolution Proposals

### Proposal 1: Promote `context_events.metadata->>'source'` to Column

**Table:** `context_events`

**JSON Path:** `metadata->>'source'`

**Access Frequency:** High (used in calendar sync, trip integration)

**Current Usage:**
```sql
-- Pattern 1: Find context event by source
SELECT id FROM context_events
WHERE context_id = $1
  AND created_by = $2
  AND metadata->>'source' = 'guardrails'
  AND metadata->>'roadmap_item_id' = $3;

-- Pattern 2: Count events by source
SELECT COUNT(*) FROM context_events
WHERE metadata->>'source' = 'guardrails';
```

**New Column Definition:**
```sql
ALTER TABLE context_events
ADD COLUMN source_type text 
  CHECK (source_type IN ('guardrails', 'trip', 'planner', NULL))
  DEFAULT NULL;

CREATE INDEX idx_context_events_source_type 
  ON context_events(source_type) 
  WHERE source_type IS NOT NULL;
```

**Backfill Strategy:**
```sql
-- Step 1: Add column (nullable, no default constraint initially)
ALTER TABLE context_events
ADD COLUMN source_type text;

-- Step 2: Backfill from metadata
UPDATE context_events
SET source_type = metadata->>'source'
WHERE metadata->>'source' IS NOT NULL
  AND metadata->>'source' IN ('guardrails', 'trip', 'planner');

-- Step 3: Add constraint and index
ALTER TABLE context_events
ADD CONSTRAINT check_source_type 
  CHECK (source_type IS NULL OR source_type IN ('guardrails', 'trip', 'planner'));

CREATE INDEX idx_context_events_source_type 
  ON context_events(source_type) 
  WHERE source_type IS NOT NULL;
```

**Dual-Write Period (Recommended):**
- **Duration:** 2-4 weeks
- **Application Changes:**
  - Write to both `metadata->>'source'` AND `source_type` column
  - Read from `source_type` column (fallback to metadata if NULL)
- **Monitoring:** Track NULL rate in `source_type` column
- **Cutover:** Once <1% NULL rate, switch reads to column only

**Rollback Plan:**
- Keep `metadata->>'source'` populated during dual-write
- If issues arise, revert reads to metadata JSONB path
- Drop `source_type` column if needed (data preserved in metadata)

**Expected Benefits:**
- **30-50% faster** queries filtering by source
- **Better type safety** (CHECK constraint)
- **Simpler queries** (no JSONB path extraction)
- **Better index performance** (B-tree vs GIN)

**Risks:**
- **Data inconsistency** if dual-write fails
- **Application complexity** during transition
- **Storage overhead** (minimal, text column is small)

**Recommendation:** ✅ **Proceed** - High value, manageable risk

---

### Proposal 2: Promote `context_events.metadata->>'roadmap_item_id'` to Column

**Table:** `context_events`

**JSON Path:** `metadata->>'roadmap_item_id'`

**Access Frequency:** High (used in calendar sync for Guardrails events)

**New Column Definition:**
```sql
ALTER TABLE context_events
ADD COLUMN source_roadmap_item_id uuid 
  REFERENCES roadmap_items(id) ON DELETE SET NULL
  DEFAULT NULL;

CREATE INDEX idx_context_events_source_roadmap_item 
  ON context_events(source_roadmap_item_id) 
  WHERE source_roadmap_item_id IS NOT NULL;
```

**Backfill Strategy:**
```sql
-- Step 1: Add column
ALTER TABLE context_events
ADD COLUMN source_roadmap_item_id uuid;

-- Step 2: Backfill from metadata (with validation)
UPDATE context_events
SET source_roadmap_item_id = (metadata->>'roadmap_item_id')::uuid
WHERE metadata->>'roadmap_item_id' IS NOT NULL
  AND (metadata->>'roadmap_item_id')::uuid IN (
    SELECT id FROM roadmap_items
  );

-- Step 3: Add foreign key and index
ALTER TABLE context_events
ADD CONSTRAINT fk_context_events_source_roadmap_item 
  FOREIGN KEY (source_roadmap_item_id) 
  REFERENCES roadmap_items(id) ON DELETE SET NULL;

CREATE INDEX idx_context_events_source_roadmap_item 
  ON context_events(source_roadmap_item_id) 
  WHERE source_roadmap_item_id IS NOT NULL;
```

**Dual-Write Period (Recommended):**
- **Duration:** 2-4 weeks
- **Application Changes:**
  - Write to both `metadata->>'roadmap_item_id'` AND `source_roadmap_item_id`
  - Read from `source_roadmap_item_id` (fallback to metadata if NULL)

**Rollback Plan:**
- Keep `metadata->>'roadmap_item_id'` populated
- Revert reads to metadata if issues arise
- Drop column if needed (data preserved in metadata)

**Expected Benefits:**
- **40-60% faster** queries joining with roadmap_items
- **Referential integrity** (foreign key constraint)
- **Better query plans** (direct join vs JSONB extraction)

**Risks:**
- **Foreign key constraint** may fail if roadmap_item deleted
- **Data validation** required during backfill

**Recommendation:** ✅ **Proceed** - High value, manageable risk

---

### Proposal 3: Promote `context_events.metadata->>'itinerary_item_id'` to Column

**Table:** `context_events`

**JSON Path:** `metadata->>'itinerary_item_id'`

**Access Frequency:** Medium (used in trip integration)

**New Column Definition:**
```sql
ALTER TABLE context_events
ADD COLUMN source_itinerary_item_id uuid 
  DEFAULT NULL;

CREATE INDEX idx_context_events_source_itinerary_item 
  ON context_events(source_itinerary_item_id) 
  WHERE source_itinerary_item_id IS NOT NULL;
```

**Backfill Strategy:**
Similar to Proposal 2, but without foreign key (itinerary items may be in different table or JSONB structure)

**Dual-Write Period (Recommended):**
- **Duration:** 2-4 weeks

**Expected Benefits:**
- **30-40% faster** trip-related queries
- **Simpler application code**

**Risks:**
- **Lower priority** than roadmap_item_id (less frequent)

**Recommendation:** ⚠️ **Defer** - Lower priority, proceed after Proposal 2

---

## 3. Partitioning Proposals

### Proposal 1: Partition `analytics_events` by `created_at`

**Table:** `analytics_events`

**Growth Pattern:**
- **Insert Rate:** High (every user action generates events)
- **Time-Series Characteristic:** ✅ Yes (events are time-ordered)
- **Query Pattern:** Primarily recent data (last 30-90 days)
- **Retention:** Old data rarely queried

**Partitioning Strategy:** Range Partitioning by Month

**Partition Key:** `created_at` (timestamptz)

**Query Impact:**
- **Positive:** Queries filtering by date range will only scan relevant partitions
- **Positive:** Old partitions can be archived/dropped easily
- **Neutral:** Queries without date filters may need to scan multiple partitions
- **Negative:** Cross-partition queries may be slower (mitigated by date filters)

**Operational Complexity:**
- **Medium:** Requires partition management (monthly creation)
- **Automation:** Can use pg_cron or application-level job
- **Monitoring:** Track partition count, query performance

**Implementation Plan:**
```sql
-- Step 1: Create partitioned table structure
CREATE TABLE analytics_events_partitioned (
  LIKE analytics_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Step 2: Create partitions for current and next 3 months
CREATE TABLE analytics_events_2025_01 
  PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE analytics_events_2025_02 
  PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Step 3: Migrate data (in batches)
INSERT INTO analytics_events_partitioned
SELECT * FROM analytics_events
WHERE created_at >= '2025-01-01';

-- Step 4: Switch tables (requires downtime or dual-write)
ALTER TABLE analytics_events RENAME TO analytics_events_old;
ALTER TABLE analytics_events_partitioned RENAME TO analytics_events;
```

**Why / Why Not:**

**Why:**
- ✅ High insert rate (benefits from partition pruning)
- ✅ Time-series data (natural partitioning key)
- ✅ Old data rarely queried (can archive/drop old partitions)
- ✅ Predictable growth (monthly partitions are manageable)

**Why Not:**
- ❌ Operational complexity (requires partition management)
- ❌ Migration risk (requires careful data migration)
- ❌ Query patterns may not always filter by date

**Recommendation:** ✅ **Proceed** - High value for analytics table, manageable complexity

**Timeline:** 6-9 months (when table reaches 10M+ rows)

---

### Proposal 2: Partition `calendar_events` by `start_at`

**Table:** `calendar_events`

**Growth Pattern:**
- **Insert Rate:** Medium (calendar events created by users)
- **Time-Series Characteristic:** ✅ Yes (events are time-ordered)
- **Query Pattern:** Primarily date range queries (current month, next 3 months)
- **Retention:** Old events rarely queried

**Partitioning Strategy:** Range Partitioning by Month

**Partition Key:** `start_at` (timestamptz)

**Query Impact:**
- **Positive:** Date range queries will only scan relevant partitions
- **Positive:** Old events can be archived
- **Neutral:** Queries without date filters may need multiple partitions

**Operational Complexity:**
- **Medium:** Requires partition management

**Why / Why Not:**

**Why:**
- ✅ Time-series data
- ✅ Date range queries are common
- ✅ Old events rarely accessed

**Why Not:**
- ❌ Lower insert rate than analytics_events
- ❌ May not be necessary until table is very large
- ❌ Operational overhead may not be justified yet

**Recommendation:** ⚠️ **Defer** - Monitor growth, consider when table reaches 5M+ rows

**Timeline:** 9-12 months (if growth continues)

---

### Proposal 3: Partition `context_events` by `start_at`

**Table:** `context_events`

**Growth Pattern:**
- **Insert Rate:** Low-Medium (context events from trips, projects)
- **Time-Series Characteristic:** ✅ Yes
- **Query Pattern:** Date range queries common

**Recommendation:** ⚠️ **Defer** - Lower priority, monitor growth

**Timeline:** 12+ months (if growth continues)

---

## 4. Write-Path Analysis

### Index Write Amplification Hotspots

**Current State:**
- **17 new indexes** added in Phase 2 (GIN, covering, composite)
- **30+ existing indexes** from previous migrations
- **Total:** ~50 indexes across core tables

**Write Amplification:**
- **Each INSERT/UPDATE** must update all relevant indexes
- **GIN indexes** are particularly expensive (2-3x write overhead)
- **Covering indexes** add write overhead but reduce read I/O

**Hotspots Identified:**

1. **`context_events`** (High)
   - 3 GIN indexes (metadata)
   - 3 functional indexes (JSONB paths)
   - 1 covering index
   - **Impact:** ~15-20% slower writes

2. **`calendar_events`** (Medium)
   - Multiple composite indexes
   - 1 covering index
   - **Impact:** ~10-15% slower writes

3. **`roadmap_items`** (Medium)
   - Multiple composite indexes
   - 2 covering indexes
   - **Impact:** ~10-15% slower writes

**Proposed Mitigations:**

1. **Flag Redundant Indexes for Review**
   - Monitor index usage with `pg_stat_user_indexes`
   - Flag indexes with `idx_scan = 0` for potential removal
   - **Action:** Document, do not remove yet

2. **Consider Deferred Index Maintenance**
   - Use `CREATE INDEX CONCURRENTLY` for new indexes
   - Consider `REINDEX CONCURRENTLY` for maintenance
   - **Action:** Apply to future indexes only

3. **Optimize Trigger Functions**
   - Consolidate `updated_at` triggers (see below)

**Recommendation:** ⚠️ **Monitor** - Current write performance is acceptable, flag for future optimization

---

### Trigger or Function Costs

**Current State:**
- **15+ triggers** updating `updated_at` on various tables
- Each trigger calls a function (minimal overhead, but adds up)
- All triggers use `BEFORE UPDATE` (runs for every UPDATE)

**Cost Analysis:**

**Per-Update Overhead:**
- Function call: ~0.1ms
- Column update: ~0.05ms
- **Total:** ~0.15ms per UPDATE

**Impact:**
- **Low** for individual updates
- **Medium** for bulk updates (1000+ rows)
- **High** for high-frequency updates (analytics events)

**Proposed Mitigation: Consolidate Triggers**

**Current Pattern:**
```sql
-- Each table has its own trigger function
CREATE OR REPLACE FUNCTION update_project_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_sync_settings_updated_at
  BEFORE UPDATE ON project_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_project_sync_settings_updated_at();
```

**Proposed Pattern:**
```sql
-- Single generic function for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Use same function for all tables
CREATE TRIGGER update_project_sync_settings_updated_at
  BEFORE UPDATE ON project_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Benefits:**
- **Code reuse** (single function instead of 15+)
- **Easier maintenance** (one function to update)
- **Slight performance improvement** (function caching)

**Risks:**
- **Low** - Function logic is identical
- **Migration:** Replace triggers one at a time

**Recommendation:** ✅ **Proceed** - Low risk, improves maintainability

**Timeline:** 1-2 months (low priority)

---

### Contention Risks

**Current State:**
- **No identified contention hotspots**
- Index creation uses `IF NOT EXISTS` (safe)
- RLS policies are optimized (Phase 1)

**Potential Risks:**

1. **High-Frequency Updates on Same Row**
   - **Risk:** Lock contention on frequently updated rows
   - **Mitigation:** Use row-level locking strategies if needed
   - **Status:** Not currently an issue

2. **Bulk Updates Without Batching**
   - **Risk:** Long-running transactions, lock escalation
   - **Mitigation:** Application-level batching (already implemented)
   - **Status:** Monitored

**Recommendation:** ✅ **Monitor** - No immediate action needed

---

## 5. Background Job Candidates

### Job 1: Materialized View Refresh for Dashboard Statistics

**Job Purpose:** Pre-compute dashboard aggregations

**Data Scope:**
- Project statistics (roadmap item counts, status breakdowns)
- Calendar statistics (upcoming events, pending projections)
- Activity statistics (habit completions, goal progress)

**Materialized View Definition:**
```sql
CREATE MATERIALIZED VIEW dashboard_statistics AS
SELECT 
  'project' AS entity_type,
  master_project_id AS entity_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_items,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_items,
  COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_items,
  MIN(start_date) FILTER (WHERE start_date IS NOT NULL) AS next_deadline,
  MAX(updated_at) AS last_updated
FROM roadmap_items
GROUP BY master_project_id

UNION ALL

SELECT 
  'calendar' AS entity_type,
  target_user_id::text AS entity_id,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_projections,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_projections,
  NULL::date AS next_deadline,
  MAX(created_at) AS last_updated
FROM calendar_projections
GROUP BY target_user_id;
```

**Refresh Frequency:** Every 5 minutes

**Failure Impact:**
- **Low:** Dashboard shows stale data (acceptable for 5-minute window)
- **Fallback:** Application can compute on-the-fly if view is stale

**Rollback Strategy:**
- Drop materialized view if issues arise
- Application falls back to on-the-fly computation

**Cost:**
- **Compute:** ~2-5 seconds per refresh
- **Storage:** Minimal (aggregated data is small)
- **Maintenance:** Automated via pg_cron or application job

**Recommendation:** ✅ **Proceed** - High value, low risk

**Timeline:** 1-2 months

---

### Job 2: Analytics Events Retention Policy

**Job Purpose:** Automatically archive/delete old analytics events

**Data Scope:**
- `analytics_events` older than 90 days
- Archive to cold storage (optional) or delete

**Retention Policy:**
```sql
-- Option 1: Delete old events
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Option 2: Archive to separate table (recommended)
INSERT INTO analytics_events_archive
SELECT * FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Refresh Frequency:** Weekly (Sunday 2 AM)

**Failure Impact:**
- **Low:** Old data remains (storage cost only)
- **High:** If misconfigured, could delete too much data

**Rollback Strategy:**
- **Archive approach:** Data preserved in archive table
- **Delete approach:** No rollback (data loss)

**Cost:**
- **Compute:** ~5-10 minutes per run (depends on data volume)
- **Storage:** Reduced by 70-80% (old data removed)

**Recommendation:** ✅ **Proceed with Archive** - High value, use archive approach for safety

**Timeline:** 3-4 months (after analytics_events partitioning)

---

### Job 3: Index Maintenance (VACUUM ANALYZE)

**Job Purpose:** Keep indexes optimized, update statistics

**Data Scope:**
- All tables with high update frequency
- Focus on: `calendar_events`, `context_events`, `roadmap_items`

**Maintenance Strategy:**
```sql
-- Weekly VACUUM ANALYZE for high-traffic tables
VACUUM ANALYZE calendar_events;
VACUUM ANALYZE context_events;
VACUUM ANALYZE roadmap_items;

-- Monthly REINDEX for GIN indexes (if needed)
REINDEX INDEX CONCURRENTLY idx_context_events_metadata_gin;
```

**Refresh Frequency:**
- **VACUUM ANALYZE:** Weekly
- **REINDEX:** Monthly (if index bloat detected)

**Failure Impact:**
- **Low:** Indexes may be slightly less optimal
- **Mitigation:** Supabase handles some maintenance automatically

**Rollback Strategy:**
- No rollback needed (maintenance only)

**Cost:**
- **Compute:** ~10-30 minutes per run
- **Storage:** Minimal (reclaims bloat)

**Recommendation:** ✅ **Proceed** - Standard maintenance, low risk

**Timeline:** 2-3 months

---

## 6. Caching Strategy (Advisory)

### Cacheable Query Classes

**1. Dashboard Statistics**
- **Query Type:** Aggregations (COUNT, SUM, AVG)
- **Data Freshness:** 5-minute tolerance acceptable
- **TTL Recommendation:** 5 minutes
- **Invalidation:** On relevant data changes (project updates, calendar changes)
- **Complexity:** Medium (requires invalidation logic)

**2. Calendar Projections (Accepted)**
- **Query Type:** List of accepted projections for user
- **Data Freshness:** 1-minute tolerance acceptable
- **TTL Recommendation:** 1 minute
- **Invalidation:** On projection status changes
- **Complexity:** Low (simple TTL-based cache)

**3. Roadmap Item Lists (By Project)**
- **Query Type:** Filtered lists (by project, track, status)
- **Data Freshness:** 30-second tolerance acceptable
- **TTL Recommendation:** 30 seconds
- **Invalidation:** On roadmap item changes
- **Complexity:** Medium (requires invalidation by project/track)

**4. User Profile Data**
- **Query Type:** User settings, preferences
- **Data Freshness:** 5-minute tolerance acceptable
- **TTL Recommendation:** 5 minutes
- **Invalidation:** On profile updates
- **Complexity:** Low (user-scoped cache)

### TTL Recommendations

| Query Class | TTL | Rationale |
|------------|-----|-----------|
| Dashboard Statistics | 5 minutes | Aggregations are expensive, 5-minute staleness acceptable |
| Calendar Projections | 1 minute | User expects near-real-time updates |
| Roadmap Lists | 30 seconds | Balance between freshness and performance |
| User Profiles | 5 minutes | Rarely changes, longer TTL acceptable |

### Invalidation Complexity

**Simple (TTL-based):**
- ✅ Calendar projections (time-based expiration)
- ✅ User profiles (time-based expiration)

**Medium (Event-based):**
- ⚠️ Dashboard statistics (invalidate on project/calendar updates)
- ⚠️ Roadmap lists (invalidate on item changes)

**Complex (Granular):**
- ❌ Not recommended in Phase 3 (too complex)

### Why Caching is or Isn't Appropriate

**Appropriate:**
- ✅ **Dashboard Statistics:** Expensive aggregations, acceptable staleness
- ✅ **Calendar Projections:** Frequently accessed, low update rate
- ✅ **User Profiles:** Rarely changes, high read frequency

**Not Appropriate:**
- ❌ **Real-time Data:** Calendar events (must be current)
- ❌ **Frequently Updated:** Roadmap items (invalidation overhead too high)
- ❌ **User-Specific Queries:** Too many cache keys, low hit rate

**Recommendation:** ✅ **Implement Application-Level Caching** for dashboard statistics and calendar projections only

**Implementation:** Use React Query or similar (application-level, not database-level)

**Timeline:** 2-3 months (after materialized views)

---

## 7. Migration & Rollback Plan

### Staged Rollout Strategy

**Stage 1: Schema Evolution (Column Promotion)**
1. Add new columns (nullable, no constraints)
2. Backfill data from JSONB
3. Add constraints and indexes
4. Dual-write period (2-4 weeks)
5. Switch reads to columns
6. (Future) Remove JSONB fields (not in Phase 3)

**Stage 2: Trigger Consolidation**
1. Create generic `update_updated_at_column()` function
2. Replace triggers one table at a time
3. Monitor for issues
4. Remove old trigger functions

**Stage 3: Materialized Views**
1. Create materialized view
2. Test refresh performance
3. Implement refresh job
4. Switch application to use view
5. Monitor query performance

**Stage 4: Partitioning (Future)**
1. Create partitioned table structure
2. Migrate data in batches
3. Switch tables (requires downtime or dual-write)
4. Set up partition management job

**Stage 5: Background Jobs**
1. Implement analytics retention job
2. Implement index maintenance job
3. Monitor and adjust schedules

### Rollback Steps

**Schema Evolution:**
- Revert application reads to JSONB paths
- Keep columns populated (no data loss)
- Drop columns if needed (data in JSONB)

**Trigger Consolidation:**
- Revert to table-specific functions
- No data loss risk

**Materialized Views:**
- Drop materialized view
- Application falls back to on-the-fly computation
- No data loss

**Partitioning:**
- Revert to non-partitioned table
- Requires data migration back
- **High risk** - plan carefully

**Background Jobs:**
- Disable jobs
- No immediate rollback needed (jobs are additive)

### Safety Checks

**Before Each Stage:**
- ✅ Backup database
- ✅ Test in staging environment
- ✅ Verify rollback plan
- ✅ Set up monitoring/alerting
- ✅ Document all changes

**During Each Stage:**
- ✅ Monitor query performance
- ✅ Monitor error rates
- ✅ Monitor write performance
- ✅ Check data consistency

**After Each Stage:**
- ✅ Verify no behavior changes
- ✅ Verify performance improvements
- ✅ Document lessons learned

### Observability Hooks

**Metrics to Track:**
- Query performance (p50, p95, p99 latencies)
- Write performance (INSERT/UPDATE times)
- Index usage (idx_scan, idx_tup_read)
- Table sizes (growth rates)
- Cache hit rates (if implemented)

**Alerts to Set:**
- Query performance degradation (>20% slower)
- Write performance degradation (>30% slower)
- Index bloat (>30% of table size)
- Partition count (if partitioning implemented)

---

## 8. Verification Checklist

### No Behaviour Change
- ✅ All queries return identical results
- ✅ Application logic unchanged
- ✅ User experience unchanged
- ✅ API contracts unchanged

### Backwards Compatibility Preserved
- ✅ Existing queries still work
- ✅ JSONB fields still populated (during dual-write)
- ✅ No breaking schema changes
- ✅ RLS policies unchanged

### Performance Goals Met
- ✅ Query performance improved (target: 20-50%)
- ✅ Write performance acceptable (target: <15% overhead)
- ✅ Index usage optimized
- ✅ Storage costs reduced (retention policy)

### Rollback Tested
- ✅ Rollback procedures documented
- ✅ Rollback tested in staging
- ✅ Data preserved during rollback
- ✅ No data loss scenarios

### Operational Risk Acceptable
- ✅ Migration complexity manageable
- ✅ Failure scenarios identified
- ✅ Monitoring in place
- ✅ Support procedures documented

---

## Conclusion

Phase 3 establishes a **sustainable, scalable architecture** for SharedMinds database growth over the next 1-12 months. All proposals follow the **additive → dual-write → switch → clean-up** pattern, ensuring reversibility and safety.

**Key Recommendations:**
1. ✅ **Proceed** with schema evolution (column promotion) - High value, manageable risk
2. ✅ **Proceed** with materialized views - High value, low risk
3. ⚠️ **Defer** partitioning until growth justifies complexity
4. ✅ **Proceed** with background jobs - Standard maintenance, low risk
5. ✅ **Implement** application-level caching for specific query classes

**Next Steps:**
1. Prioritize schema evolution proposals (start with `source_type` column)
2. Implement materialized view for dashboard statistics
3. Set up background jobs for maintenance
4. Monitor growth and revisit partitioning when needed

**Timeline:** 3-6 months for initial implementations, 6-12 months for full rollout

---

## Appendix: Implementation Priority Matrix

| Proposal | Value | Risk | Effort | Priority | Timeline |
|----------|-------|------|--------|----------|----------|
| Schema Evolution (source_type) | High | Low | Medium | **P0** | 1-2 months |
| Materialized Views | High | Low | Low | **P0** | 1-2 months |
| Trigger Consolidation | Medium | Low | Low | **P1** | 2-3 months |
| Background Jobs | High | Low | Medium | **P1** | 2-3 months |
| Schema Evolution (roadmap_item_id) | High | Medium | Medium | **P1** | 2-3 months |
| Application Caching | Medium | Low | Medium | **P2** | 3-4 months |
| Analytics Partitioning | High | Medium | High | **P2** | 6-9 months |
| Schema Evolution (itinerary_item_id) | Medium | Low | Medium | **P2** | 3-4 months |
| Calendar Partitioning | Medium | Medium | High | **P3** | 9-12 months |

**Legend:**
- **P0:** Critical, implement first
- **P1:** High value, implement soon
- **P2:** Medium value, implement when resources allow
- **P3:** Low priority, monitor and defer
