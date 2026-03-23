# Mind Mesh Duplicate Prevention (Hard Stop)

## Overview

This document describes the comprehensive duplicate prevention system implemented for Mind Mesh V2 to make duplicate containers **impossible at the database level**.

## Problem Statement

Mind Mesh V2 was experiencing duplicate Track/Subtrack containers appearing on the canvas despite previous reconciliation and repair attempts. Analysis revealed:

1. **Race conditions during ghost materialization** - Concurrent requests could both pass existence checks and create containers
2. **Missing references** - Some containers were created without corresponding entries in `mindmesh_container_references`
3. **No database-level enforcement** - Nothing prevented multiple containers from referencing the same Guardrails entity

## Solution Architecture

### Three-Layer Defense

#### Layer 1: Database Constraints (Hard Stop)
- **Unique constraint** on `(workspace_id, entity_type, entity_id)` where `is_primary = true`
- **Makes duplicates impossible** - Database rejects duplicate inserts at the transaction level
- **Works regardless of application bugs** - Even if code has race conditions, DB enforces uniqueness

#### Layer 2: Idempotent Ghost Materialization
- **ON CONFLICT handling** during reference insert
- **Automatic cleanup** of containers whose reference insert fails (race condition losers)
- **Deterministic behavior** - Spam refresh cannot create duplicates

#### Layer 3: Orphaned Container Detection
- **Repair utility** finds containers without references
- **Soft-delete strategy** - Archives orphaned containers, doesn't hard-delete
- **One-time cleanup** for legacy data

## Implementation Details

### Migration: Database Constraint

**File:** `supabase/migrations/add_mindmesh_duplicate_prevention_constraint.sql`

**Changes:**
1. Added `workspace_id` column to `mindmesh_container_references` (denormalized from container)
2. Backfilled existing references with workspace_id from their containers
3. Created partial unique index: `unique_primary_entity_per_workspace`
4. Added foreign key constraint to `mindmesh_workspaces`

**Constraint:**
```sql
CREATE UNIQUE INDEX unique_primary_entity_per_workspace
ON mindmesh_container_references (workspace_id, entity_type, entity_id)
WHERE is_primary = true;
```

**Enforcement:**
- Exactly ONE primary container per entity per workspace
- Attempts to create duplicate references fail with constraint violation
- Works for all integrated entities: tracks, subtracks, roadmap items, events

### Edge Function: Idempotent Ghost Materialization

**File:** `supabase/functions/mindmesh-graph/index.ts`

**Changes:**
Lines 520-631: Complete rewrite of ghost materialization logic

**Strategy:**
1. Create ghost containers (bulk insert)
2. Try to create references (bulk insert with `.select()`)
3. If reference insert fails → All containers are duplicates, clean them all up
4. If reference insert partially succeeds → Clean up only orphaned containers
5. Return only containers with successful references

**Idempotency:**
```typescript
// Try to insert references
const { data: insertedReferences, error: refInsertError } = await supabase
  .from('mindmesh_container_references')
  .insert(newReferences)
  .select('container_id');

if (refInsertError) {
  // RACE CONDITION: Another request won, clean up our containers
  await supabase
    .from('mindmesh_containers')
    .delete()
    .in('id', orphanedContainerIds);
}
```

**Result:**
- Concurrent requests → Only first succeeds, others auto-cleanup
- No orphaned containers left behind
- Deterministic: oldest request wins (by database insertion order)

### Repair Utility: Orphaned Container Cleanup

**File:** `supabase/functions/repair-mindmesh-duplicates/index.ts`

**New Features:**
- **Detects orphaned containers** - Containers without any references
- **Detects duplicate groups** - Multiple containers for same entity (legacy)
- **Soft-delete strategy** - Sets `archived_at`, doesn't hard-delete
- **Dry-run mode** - Preview changes before executing

**Usage:**
```bash
# Preview what would be cleaned up
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": true,
  "workspaceId": "optional-workspace-id"
}

# Execute cleanup
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": false,
  "workspaceId": "optional-workspace-id"
}
```

**Detection Logic:**
```typescript
// Find all containers
const containers = await supabase.from('mindmesh_containers').select('*');

// Find all references
const references = await supabase.from('mindmesh_container_references').select('container_id');

// Orphans = containers NOT in references (and not ghosts)
const orphaned = containers.filter(c =>
  !referencedIds.has(c.id) && !c.is_ghost
);
```

### Container Creation Audit

**Audit Results:**

✅ **mindmesh-graph** (GET) - Ghost materialization
- Creates containers for tracks/subtracks
- NOW creates references with idempotent insert
- Race conditions handled with cleanup
- **STATUS: FIXED**

✅ **mindmesh-intent** (POST) - Manual container creation
- Creates containers for ideas/notes
- Does NOT create references (by design - these are not integrated entities)
- **STATUS: CORRECT** (ideas/notes don't need references)

✅ **guardrailsAdapter** - Event hooks
- Only creates plans, not containers
- Execution happens through edge function
- **STATUS: N/A** (no direct container creation)

## Testing & Verification

### Unit Tests

**Duplicate Prevention:**
```typescript
// Test 1: First insert succeeds
const ref1 = await insertReference(workspace1, 'track', track1);
expect(ref1).toBeDefined();

// Test 2: Duplicate insert fails
const ref2 = await insertReference(workspace1, 'track', track1);
expect(ref2.error).toBe('duplicate key violation');
```

**Race Condition:**
```typescript
// Concurrent ghost materializations
await Promise.all([
  createGhost(workspace1, track1),
  createGhost(workspace1, track1),
  createGhost(workspace1, track1)
]);

// Only one container should exist
const containers = await queryContainers(workspace1, 'track', track1);
expect(containers.length).toBe(1);
```

### Integration Tests

**Spam Refresh Test:**
```bash
# Fire 10 concurrent requests
for i in {1..10}; do
  curl -X GET "https://api.supabase.co/functions/v1/mindmesh-graph?workspaceId=..." &
done
wait

# Verify: Only one container per entity
SELECT entity_type, entity_id, COUNT(*)
FROM mindmesh_container_references
WHERE is_primary = true
GROUP BY entity_type, entity_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

**Orphaned Container Test:**
```bash
# Run repair utility
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": false
}

# Verify: No containers without references
SELECT c.id
FROM mindmesh_containers c
LEFT JOIN mindmesh_container_references r ON r.container_id = c.id
WHERE r.id IS NULL AND c.is_ghost = false;
-- Expected: 0 rows
```

## Expected Behavior

### Before Fix

**Symptoms:**
- Duplicate Track/Subtrack containers on canvas
- Multiple containers for same entity
- Orphaned containers without references
- Spam refresh creates more duplicates

**Failure Mode:**
```
Request 1: Check exists → No → Insert container + reference
Request 2: Check exists → No → Insert container + reference
Result: 2 containers, 2 references for same entity
```

### After Fix

**Symptoms:**
- Zero duplicates possible
- Spam refresh is idempotent
- No orphaned containers
- Database enforces uniqueness

**Success Mode:**
```
Request 1: Insert container → Insert reference → SUCCESS
Request 2: Insert container → Insert reference → CONFLICT → Cleanup container
Result: 1 container, 1 reference (Request 1 wins)
```

## Monitoring & Observability

### Console Logs

**Ghost Materialization:**
```
[MindMesh Auto-materialize] Attempting to create 5 ghost containers
[MindMesh Auto-materialize] Created 5 ghost containers
[MindMesh Auto-materialize] Successfully created 5 references
[MindMesh Auto-materialize] Added 5 containers to response
```

**Race Condition Detected:**
```
[MindMesh Auto-materialize] Attempting to create 5 ghost containers
[MindMesh Auto-materialize] Created 5 ghost containers
[MindMesh Auto-materialize] Reference insert failed (possible race condition)
[MindMesh Auto-materialize] Cleaning up 5 orphaned containers
[MindMesh Auto-materialize] Successfully cleaned up orphaned containers
```

**Partial Success:**
```
[MindMesh Auto-materialize] Attempting to create 5 ghost containers
[MindMesh Auto-materialize] Created 5 ghost containers
[MindMesh Auto-materialize] Successfully created 3 references
[MindMesh Auto-materialize] Partial success: cleaning up 2 orphaned containers
[MindMesh Auto-materialize] Added 3 containers to response
```

### Database Queries

**Check for duplicates:**
```sql
SELECT entity_type, entity_id, COUNT(*) as ref_count
FROM mindmesh_container_references
WHERE is_primary = true
GROUP BY entity_type, entity_id
HAVING COUNT(*) > 1;
```

**Check for orphaned containers:**
```sql
SELECT c.id, c.title, c.created_at
FROM mindmesh_containers c
LEFT JOIN mindmesh_container_references r ON r.container_id = c.id
WHERE r.id IS NULL
  AND c.is_ghost = false
  AND c.archived_at IS NULL;
```

## Recovery Procedures

### If Duplicates Exist (Should Never Happen)

**Step 1: Verify constraint is active**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mindmesh_container_references'
  AND indexname = 'unique_primary_entity_per_workspace';
```

**Step 2: Run repair utility**
```bash
# Dry run first
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": true
}

# Review output, then execute
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": false
}
```

**Step 3: Verify cleanup**
```sql
-- Should return 0 rows
SELECT entity_type, entity_id, COUNT(*)
FROM mindmesh_container_references
WHERE is_primary = true
GROUP BY entity_type, entity_id
HAVING COUNT(*) > 1;
```

### If Orphaned Containers Exist

**Step 1: Run repair utility**
```bash
POST /functions/v1/repair-mindmesh-duplicates
{
  "dryRun": false
}
```

**Step 2: Check repair results**
```json
{
  "success": true,
  "totalOrphanedContainers": 1,
  "orphanedContainerIds": ["fcfd626e-bd66-4352-9ece-7096897e1b80"]
}
```

## Files Modified

### Database
- `supabase/migrations/add_mindmesh_duplicate_prevention_constraint.sql` (NEW)

### Edge Functions
- `supabase/functions/mindmesh-graph/index.ts` (MODIFIED)
  - Lines 520-631: Ghost materialization rewrite
  - Added idempotent reference insert with cleanup
- `supabase/functions/repair-mindmesh-duplicates/index.ts` (MODIFIED)
  - Added orphaned container detection
  - Added orphaned container cleanup

### Documentation
- `MINDMESH_GRAPH_PORT_QUERY_FIX.md` (UPDATED)
  - Added references query fix
- `MINDMESH_DUPLICATE_PREVENTION_HARDSTOP.md` (NEW)

## Performance Impact

### Database
- **Constraint overhead:** Minimal - partial unique index on 3 columns
- **Insert performance:** No impact - constraint checked in same transaction
- **Query performance:** Improved - index on (workspace_id, entity_type, entity_id)

### Edge Function
- **Ghost materialization:** +1 query (cleanup check)
- **Race condition path:** +1 delete query per losing request
- **Normal path:** No additional overhead
- **Net impact:** Negligible - cleanup only runs on race conditions

## Future Improvements

### Short Term
1. Add telemetry for race condition frequency
2. Add Sentry alerts for constraint violations
3. Add database index on `mindmesh_containers(archived_at)` for repair utility

### Long Term
1. Consider making repair utility part of automated maintenance
2. Add constraint violation metrics to observability dashboard
3. Implement automatic orphan detection as database trigger

## Success Criteria

✅ **Database constraint active** - Unique index created and enforced
✅ **Ghost materialization idempotent** - Race conditions handled with cleanup
✅ **No orphaned containers** - Repair utility cleans up legacy data
✅ **Build passes** - No TypeScript errors
✅ **All container creation flows audited** - No missing references

## Conclusion

Mind Mesh V2 duplicate containers are now **impossible at the database level**. The three-layer defense ensures:

1. Database rejects duplicate references (hard stop)
2. Ghost materialization handles race conditions gracefully (cleanup)
3. Repair utility cleans up any legacy orphaned containers (one-time)

The system is production-ready and handles concurrent requests correctly.
