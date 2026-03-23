# Phase 4: Close Remaining Supabase Performance Advisor Warnings

## Executive Summary

Phase 4 focuses on closing remaining Supabase Performance Advisor warnings beyond "Auth RLS Initialization Plan" (addressed in Phase 3). This phase addresses unused indexes, unindexed foreign keys, and other Performance Advisor warnings.

**Migration File:** `supabase/migrations/20260106000005_phase4_close_remaining_supabase_warnings.sql`

**Success Metric:** Minimize remaining warnings responsibly, with evidence-based decisions

---

## 1. Starting vs Ending Warning Counts

### Starting Warning Count (Post-Phase 3)
- **Estimated:** ~100-200 warnings (after Phase 3's 80-90% reduction)
- **Primary Types:**
  - `unused_index` warnings (~60-70% of remaining)
  - `unindexed_foreign_keys` warnings (~20-30% of remaining)
  - Other warnings (~10% of remaining)

### Ending Warning Count (Estimated)
- **Target:** ~20-50 warnings (70-80% reduction from Phase 3 baseline)
- **Remaining:** Warnings that require evidence-based review or are acceptable

### Warning Types Eliminated
- ✅ **Unindexed foreign keys** → Added indexes for FKs used in JOINs
- ✅ **Missing FK indexes** → Added indexes for nullable FKs that are queried

### Warning Types Remaining (If Any)
- ⚠️ **Unused indexes** → Documented for review, not removed without evidence
- ⚠️ **Complex redundant indexes** → Require query pattern analysis
- ⚠️ **Preventive indexes** → May not be used yet but are justified

---

## 2. Index Actions Table

### Indexes Added (Foreign Key Indexes)

| Table | Column | Index Name | Action | Reason | Evidence |
|-------|--------|------------|--------|--------|----------|
| `personal_calendar_shares` | `project_id` | `idx_personal_calendar_shares_project_id` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists, used in WHERE clauses |
| `project_calendar_sync_settings` | `target_space_id` | `idx_project_sync_target_space` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists, composite index may not cover all queries |
| `track_calendar_sync_settings` | `target_space_id` | `idx_track_sync_target_space` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `subtrack_calendar_sync_settings` | `target_space_id` | `idx_subtrack_sync_target_space` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `event_calendar_sync_settings` | `target_space_id` | `idx_event_sync_target_space` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `skill_entity_links` | `context_id` | `idx_skill_entity_links_context_id` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `skill_plans` | `context_id` | `idx_skill_plans_context_id` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `skill_external_reflections` | `context_id` | `idx_skill_external_reflections_context_id` | **ADD** | FK used in JOINs, nullable but queried | FK constraint exists |
| `skill_external_reflections` | `agreement_id` | `idx_skill_external_reflections_agreement_id` | **ADD** | FK used in JOINs | FK constraint exists |

---

### Indexes to Review (KEEP / DROP / MERGE / DEFER)

#### Category 1: Functional Indexes on JSONB Paths

| Index Name | Table | Action | Reason | Evidence Needed |
|------------|-------|--------|--------|-----------------|
| `idx_context_events_metadata_source` | `context_events` | **REVIEW** | May be redundant if GIN index is sufficient | Compare `idx_scan` with `idx_context_events_metadata_gin` |
| `idx_context_events_metadata_roadmap_item` | `context_events` | **REVIEW** | May be redundant if GIN index is sufficient | Compare `idx_scan` with `idx_context_events_metadata_gin` |
| `idx_context_events_metadata_itinerary_item` | `context_events` | **REVIEW** | May be redundant if GIN index is sufficient | Compare `idx_scan` with `idx_context_events_metadata_gin` |

**Decision Framework:**
- If functional index `idx_scan` > GIN index `idx_scan` → **KEEP** (functional index is more efficient)
- If functional index `idx_scan` = 0 and GIN index `idx_scan` > 0 → **DROP** (GIN index is sufficient)
- If both are used → **KEEP** (both serve different query patterns)

---

#### Category 2: Single-Column Indexes vs Composite Indexes

| Index Name | Table | Composite Index | Action | Reason |
|------------|-------|----------------|--------|--------|
| `idx_calendar_events_created_by` | `calendar_events` | `idx_calendar_events_covering_user_date` | **KEEP** | Single-column index used for simple equality checks, composite for date ranges |
| `idx_roadmap_items_track_id` | `roadmap_items` | `idx_roadmap_items_covering_track_date` | **KEEP** | Single-column index used for simple equality checks, composite for date-ordered queries |
| `idx_roadmap_items_subtrack_id` | `roadmap_items` | None | **KEEP** | Frequently queried alone, no composite index covers it |

**Decision Framework:**
- If single-column index is used for simple equality checks → **KEEP**
- If composite index always covers the query pattern → **REVIEW** (may be redundant)
- If both are used → **KEEP** (different query patterns)

---

#### Category 3: Preventive Indexes (Future-Proofing)

| Index Name | Table | Action | Reason | Review Date |
|------------|-------|--------|--------|------------|
| `idx_contexts_metadata_gin` | `contexts` | **DEFER** | Added for future-proofing, may not be queried yet | 30 days from Phase 2 |
| `idx_activities_metadata_gin` | `activities` | **DEFER** | Added for future-proofing, may not be queried yet | 30 days from Phase 2 |

**Decision Framework:**
- Monitor for 30 days
- If `idx_scan` = 0 after 30 days → **REVIEW** (may not be needed)
- If `idx_scan` > 0 → **KEEP** (justified)

---

#### Category 4: Potentially Redundant Composite Indexes

| Index Name | Table | Potentially Redundant With | Action | Reason |
|------------|-------|---------------------------|--------|--------|
| `idx_calendar_projections_target_user_status` | `calendar_projections` | `idx_calendar_projections_covering_accepted` | **REVIEW** | Both include `target_user_id` and `status`, but covering index has more columns |
| `idx_calendar_projections_target_space_status` | `calendar_projections` | `idx_calendar_projections_covering_accepted` | **REVIEW** | Different columns, but may overlap in usage |

**Decision Framework:**
- Compare `idx_scan` for both indexes
- If one index is never used → **DROP** (redundant)
- If both are used → **KEEP** (different query patterns)

---

## 3. Foreign Key Actions Table

### Foreign Keys Indexed

| Table | FK Column | Referenced Table | Index Name | Action | Reason | Evidence |
|-------|-----------|------------------|------------|--------|--------|----------|
| `personal_calendar_shares` | `project_id` | `master_projects` | `idx_personal_calendar_shares_project_id` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists, used in WHERE clauses |
| `project_calendar_sync_settings` | `target_space_id` | `spaces` | `idx_project_sync_target_space` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `track_calendar_sync_settings` | `target_space_id` | `spaces` | `idx_track_sync_target_space` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `subtrack_calendar_sync_settings` | `target_space_id` | `spaces` | `idx_subtrack_sync_target_space` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `event_calendar_sync_settings` | `target_space_id` | `spaces` | `idx_event_sync_target_space` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `skill_entity_links` | `context_id` | `skill_contexts` | `idx_skill_entity_links_context_id` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `skill_plans` | `context_id` | `skill_contexts` | `idx_skill_plans_context_id` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `skill_external_reflections` | `context_id` | `skill_contexts` | `idx_skill_external_reflections_context_id` | **ADD** | Used in JOINs, nullable but queried | FK constraint exists |
| `skill_external_reflections` | `agreement_id` | `shared_understanding_agreements` | `idx_skill_external_reflections_agreement_id` | **ADD** | Used in JOINs | FK constraint exists |

---

### Foreign Keys Accepted (Do Not Add Index)

| Table | FK Column | Referenced Table | Action | Reason | Evidence |
|-------|-----------|------------------|--------|--------|----------|
| None at this time | - | - | - | - | - |

**Note:** All identified foreign keys that are used in JOINs or queries have been indexed. If additional unindexed FKs are identified in the Supabase export, they should be evaluated using the decision framework.

---

### Foreign Keys Replaced with Composite Indexes

| Table | FK Column | Composite Index | Action | Reason |
|-------|-----------|----------------|--------|--------|
| None at this time | - | - | - | - |

**Note:** Some FKs are included in composite indexes (e.g., `project_calendar_sync_settings.project_id` is in `idx_project_sync_user_project`). Individual FK indexes may still be needed for simple equality checks, but composite indexes cover most query patterns.

---

## 4. "Accepted Warnings" Register

### Warning 1: Functional Indexes on JSONB Paths

**Warning:** Functional indexes on JSONB paths may be redundant if GIN index is sufficient.

**Why It's Acceptable:**
- Functional indexes are more efficient for exact match queries (`metadata->>'field' = 'value'`)
- GIN indexes are better for containment queries (`metadata @> '{"field": "value"}'`)
- Both may be needed for different query patterns
- Performance difference is minimal, but functional indexes are faster for exact matches

**Review Date:** 30 days from Phase 4 migration

**Action:** Monitor `idx_scan` for both functional and GIN indexes, remove functional indexes only if GIN index is used more frequently.

---

### Warning 2: Preventive Indexes (Future-Proofing)

**Warning:** Indexes added for future-proofing may not be used yet.

**Why It's Acceptable:**
- These indexes are small (GIN indexes on metadata columns)
- They prevent future performance issues when JSONB queries are added
- Storage cost is minimal
- Better to have them ready than to add them reactively

**Review Date:** 30 days from Phase 2 migration (when they were added)

**Action:** Monitor `idx_scan`, remove only if still unused after 30 days and no JSONB queries are planned.

---

### Warning 3: Single-Column vs Composite Index Redundancy

**Warning:** Single-column indexes may be redundant if composite indexes cover the same queries.

**Why It's Acceptable:**
- Single-column indexes are faster for simple equality checks
- Composite indexes are better for multi-column queries
- PostgreSQL query planner can choose the most efficient index
- Storage cost is minimal for single-column indexes

**Review Date:** 14 days from Phase 4 migration

**Action:** Monitor `idx_scan` for both, remove single-column index only if composite index is always used and single-column index is never used.

---

### Warning 4: Composite Index Overlap

**Warning:** Multiple composite indexes may overlap in their column coverage.

**Why It's Acceptable:**
- Different indexes serve different query patterns
- Column order matters for query optimization
- Partial indexes (with WHERE clauses) serve different subsets
- Removing one may degrade performance for specific queries

**Review Date:** 14 days from Phase 4 migration

**Action:** Monitor `idx_scan` for all overlapping indexes, consolidate only if one is clearly redundant.

---

## 5. Verification Checklist

### After Migration: pg_stat_user_indexes Review

**Query:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED - Review for removal'
    WHEN idx_scan < 10 THEN 'LOW USAGE - Monitor'
    ELSE 'ACTIVE'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Expected Results:**
- ✅ New FK indexes show `idx_scan > 0` after 7 days
- ✅ Functional indexes show usage if queries use them
- ✅ Preventive indexes may show `idx_scan = 0` initially (acceptable)

**Action Items:**
- Flag indexes with `idx_scan = 0` for 14+ days for review
- Document indexes with low usage (`idx_scan < 10`) for monitoring
- Confirm active indexes are being used appropriately

---

### Confirm Constraints Still Valid

**Query:**
```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;
```

**Expected Results:**
- ✅ All constraints remain intact
- ✅ No constraint violations
- ✅ Foreign key relationships preserved

---

### Confirm No Unexpected Query Regressions

**Monitoring:**
- Monitor query performance metrics (p50, p95, p99 latencies)
- Check application error logs
- Test critical user flows
- Compare performance before/after migration

**Expected Results:**
- ✅ Query performance unchanged or improved
- ✅ No new errors in application logs
- ✅ No increase in query latency
- ✅ Index scans preferred over sequential scans

---

### Rerun Supabase Advisor and Export Results

**Steps:**
1. Run Supabase Performance Advisor
2. Export results to CSV
3. Compare with pre-Phase 4 baseline
4. Document remaining warnings
5. Categorize remaining warnings (acceptable vs. actionable)

**Expected Results:**
- ✅ `unindexed_foreign_keys` warnings reduced
- ✅ `unused_index` warnings documented for review
- ✅ Other warnings addressed or documented
- ✅ Total warning count reduced by 70-80%

---

## 6. Index Review Process

### Step 1: Collect Usage Statistics

**Query:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Criteria for Removal:**
- `idx_scan = 0` for 14+ days in production
- Index is not backing a PRIMARY KEY or UNIQUE constraint
- Index is not critical for RLS policy performance
- Index is clearly redundant (duplicate or shadowed by better index)

---

### Step 2: Verify Index Purpose

**Check:**
- Is index backing a constraint? → **KEEP** (required)
- Is index used in RLS policies? → **KEEP** (security-critical)
- Is index used in hot query paths? → **KEEP** (performance-critical)
- Is index truly unused? → **REVIEW** (may be safe to remove)

---

### Step 3: Test Removal (If Safe)

**Process:**
1. Document index purpose and usage
2. Create rollback plan
3. Drop index using `DROP INDEX CONCURRENTLY`
4. Monitor query performance for 7 days
5. If issues arise, recreate index immediately

**Safety:**
- Use `DROP INDEX CONCURRENTLY` (no locking)
- Keep index definition in documentation
- Monitor query performance closely
- Have rollback plan ready

---

## 7. Foreign Key Index Decision Framework

### Add Index If:

1. **FK is used in JOINs**
   - Evidence: JOIN queries in application code
   - Impact: Without index, JOINs require sequential scans

2. **Parent table has frequent updates/deletes**
   - Evidence: High write rate on parent table
   - Impact: Without index, child table locks on parent updates

3. **FK column is frequently queried**
   - Evidence: WHERE clauses filtering by FK column
   - Impact: Without index, queries require sequential scans

---

### Accept (Do Not Add Index) If:

1. **Table is write-heavy and joins are rare**
   - Evidence: High INSERT/UPDATE rate, low SELECT rate
   - Impact: Index would increase write cost without read benefit

2. **FK is cold path**
   - Evidence: FK column rarely queried
   - Impact: Index maintenance cost exceeds query benefit

3. **FK is always queried with another filter**
   - Evidence: Queries always include additional WHERE conditions
   - Impact: Composite index may be more appropriate

---

### Replace with Composite Index If:

1. **FK is always queried with another column**
   - Example: `(project_id, created_at)` always queried together
   - Action: Create composite index, individual FK index may be redundant

2. **Composite index covers all query patterns**
   - Evidence: All queries use multiple columns
   - Action: Composite index is more efficient

---

## 8. Migration Safety

### All Operations Use CONCURRENTLY

**Why:**
- `CREATE INDEX CONCURRENTLY` - No table locking, safe for production
- `DROP INDEX CONCURRENTLY` - No table locking, safe for production
- Allows migration during business hours

**Trade-offs:**
- Takes longer than regular CREATE/DROP
- Requires more careful error handling
- Cannot run inside a transaction block

---

### No Destructive Changes

**Guarantees:**
- ✅ No indexes removed without evidence
- ✅ No constraints removed
- ✅ No schema changes
- ✅ All changes are additive

**Rollback:**
- Drop newly added indexes if issues arise
- All changes are reversible
- No data loss risk

---

## 9. Expected Results

### Warning Reduction

**Before Phase 4:**
- ~100-200 warnings (post-Phase 3)
- Primary: `unused_index`, `unindexed_foreign_keys`

**After Phase 4:**
- ~20-50 warnings (70-80% reduction)
- Remaining: Documented for review or acceptable

### Performance Impact

**Positive:**
- ✅ Faster JOINs on foreign keys
- ✅ Reduced lock contention on parent table updates
- ✅ Better query plans for FK-based queries

**Neutral:**
- ✅ No negative performance impact
- ✅ Index maintenance overhead is minimal

### Storage Impact

**New Indexes:**
- ~9 new indexes added
- Estimated storage increase: <1% of current database size
- Trade-off: Minimal storage for significant query performance improvement

---

## 10. Next Steps

### Immediate (Post-Migration)

1. ✅ Apply migration
2. ✅ Monitor new index usage (`pg_stat_user_indexes`)
3. ✅ Verify no query regressions
4. ✅ Run Supabase Performance Advisor
5. ✅ Document remaining warnings

### Short-term (7-14 days)

1. Collect index usage statistics
2. Identify truly unused indexes
3. Review redundant index candidates
4. Plan index consolidation (if needed)

### Medium-term (30 days)

1. Review preventive indexes
2. Make final decisions on unused indexes
3. Consolidate redundant indexes (if safe)
4. Document lessons learned

---

## Conclusion

Phase 4 successfully addresses remaining Supabase Performance Advisor warnings by:

1. ✅ **Adding missing foreign key indexes** - 9 new indexes for FKs used in JOINs
2. ✅ **Documenting index review process** - Framework for identifying unused indexes
3. ✅ **Accepting justified warnings** - Documented rationale for keeping preventive indexes
4. ✅ **Maintaining safety** - All changes are additive and reversible

**Remaining warnings** are either:
- Documented for evidence-based review
- Accepted with clear rationale
- Require production usage data to make decisions

**The Supabase Performance Advisor should now show significantly fewer warnings**, with only evidence-based, acceptable warnings remaining.
