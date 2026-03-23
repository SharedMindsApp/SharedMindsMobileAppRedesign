# Guardrails Phase 1 Implementation Summary

**Date:** January 2026  
**Status:** ✅ Complete  
**Phase:** Phase 1 - Domain Entity Separation

---

## Overview

Phase 1 successfully implements the architectural separation defined in Phase 0 by creating first-class domain tables for Guardrails Tasks and Events, converting `roadmap_items` into a projection layer, and maintaining compatibility bridges for existing execution layers.

---

## Deliverables

### 1. Database Migrations

#### ✅ `20260125000000_phase1_create_domain_tables.sql`
- Creates `guardrails_tasks` table with full schema, indexes, triggers, and RLS
- Creates `guardrails_events` table with full schema, indexes, triggers, and RLS
- RLS policies use existing `user_can_view_project` and `user_can_edit_project` helpers
- All constraints and validation rules in place

#### ✅ `20260125000001_phase1_repurpose_roadmap_items.sql`
- Adds `domain_entity_type` and `domain_entity_id` columns to `roadmap_items`
- Creates unique constraint to prevent duplicate projections
- Adds entity type check constraint (initially 'task' | 'event')
- Creates integrity trigger to enforce project matching and entity existence
- Creates migration map table for debugging and rollback

#### ✅ `20260125000002_phase1_backfill_domain_entities.sql`
- Backfills all existing `roadmap_items` with `type='task'` into `guardrails_tasks`
- Backfills all existing `roadmap_items` with `type='event'` into `guardrails_events`
- Updates `roadmap_items` with domain entity references
- Logs all migrations in `guardrails_domain_migration_map` table
- Includes validation queries for post-migration verification

#### ✅ `20260125000003_phase1_compatibility_mirror_triggers.sql`
- Creates triggers to mirror task domain changes → roadmap_items (title, status, dates, metadata)
- Creates triggers to mirror event domain changes → roadmap_items (title, dates, metadata)
- Creates triggers to mirror archive operations → roadmap_items archived_at
- Handles both INSERT and UPDATE operations
- **Temporary:** These will be removed in Phase 2/3 when execution layers read from domain

#### ✅ `20260125000004_phase1_roadmap_projection_rpc.sql`
- Creates `get_roadmap_projection()` RPC function
- Efficiently joins roadmap structure with domain entity data
- Returns denormalized projection with all fields needed for UI
- Avoids N+1 queries
- Handles both tasks and events

### 2. TypeScript Services

#### ✅ `src/lib/guardrails/guardrailsTaskService.ts`
- Complete CRUD operations for `guardrails_tasks`
- Query helpers: `getGuardrailsTasksByProject`, `getCompletedTasksByProject`, `getOverdueTasks`
- Full validation and error handling
- No roadmap logic (pure domain service)

#### ✅ `src/lib/guardrails/guardrailsEventService.ts`
- Complete CRUD operations for `guardrails_events`
- Query helpers: `getGuardrailsEventsByProject`, `getEventsInDateRange`
- Full validation and error handling
- No roadmap logic (pure domain service)

#### ✅ Updated `src/lib/guardrails/roadmapService.ts`
- `createRoadmapItem()` now creates domain entity first, then roadmap projection
- `updateRoadmapItem()` distinguishes semantic edits (domain) vs structural edits (roadmap)
- Semantic edits (title, description, status, dates) → update domain entity
- Structural edits (track, subtrack, ordering, hierarchy) → update roadmap only
- Maintains existing sync logic (Taskflow, Calendar)

---

## Architecture Compliance

### ✅ Phase 0 Rules Followed

1. **Domain entities own semantics** ✅
   - `guardrails_tasks` and `guardrails_events` contain all semantic fields
   - Validation and lifecycle in domain tables
   - No roadmap logic in domain services

2. **Roadmap is projection layer** ✅
   - `roadmap_items` references domain entities by `(domain_entity_type, domain_entity_id)`
   - Roadmap contains only structure (track, subtrack, ordering, hierarchy)
   - Integrity trigger enforces project matching

3. **Compatibility bridge** ✅
   - Mirror triggers keep legacy fields in sync
   - Taskflow and Calendar continue reading from roadmap_items
   - No breaking changes to execution layers

4. **Dependencies flow downward** ✅
   - Domain services have no roadmap dependencies
   - Roadmap service references domain by ID only
   - Execution layers read from roadmap (temporary, Phase 2/3 will change)

---

## Data Migration

### Migration Process

1. **Pre-migration state:**
   - All tasks/events stored in `roadmap_items` table
   - `roadmap_items` contains both semantics and structure

2. **Post-migration state:**
   - Domain entities in `guardrails_tasks` and `guardrails_events`
   - `roadmap_items` references domain entities
   - Legacy fields remain for compatibility (mirrored by triggers)

3. **Migration validation:**
   - All tasks migrated: `SELECT COUNT(*) FROM roadmap_items WHERE type='task' AND domain_entity_type IS NULL` → 0
   - All events migrated: `SELECT COUNT(*) FROM roadmap_items WHERE type='event' AND domain_entity_type IS NULL` → 0
   - Referential integrity verified
   - Project consistency verified

### Rollback Plan

If migration needs to be rolled back:
1. Clear entity references: `UPDATE roadmap_items SET domain_entity_type = NULL, domain_entity_id = NULL`
2. Domain tables remain (for data recovery)
3. Revert service code to read from roadmap_items
4. Remove triggers

---

## Service Layer Changes

### Creation Flow (Domain-First)

```typescript
// OLD (Phase 0):
createRoadmapItem() → inserts into roadmap_items

// NEW (Phase 1):
createRoadmapItem() → 
  1. createGuardrailsTask() or createGuardrailsEvent() [domain]
  2. insert into roadmap_items with domain reference [projection]
  3. Sync to Taskflow/Calendar [execution]
```

### Update Flow (Semantic vs Structural)

```typescript
// Semantic edits (title, description, status, dates):
updateRoadmapItem() → 
  updateGuardrailsTask() or updateGuardrailsEvent() [domain]
  → triggers mirror to roadmap_items [compatibility]

// Structural edits (track, subtrack, ordering):
updateRoadmapItem() → 
  update roadmap_items only [projection]
  → domain entity unchanged
```

---

## Compatibility Bridge

### Mirror Triggers

- **Task updates** → mirror `title`, `status`, `end_date`, `metadata` to roadmap_items
- **Event updates** → mirror `title`, `start_date`, `end_date`, `metadata` to roadmap_items
- **Archive operations** → mirror `archived_at` to roadmap_items

### Why This Works

- Taskflow reads from `roadmap_items.title`, `roadmap_items.status` → ✅ Works
- Calendar reads from `roadmap_items.start_date`, `roadmap_items.end_date` → ✅ Works
- No changes needed to execution layer code in Phase 1
- Phase 2/3 will refactor execution to read from domain directly

---

## Testing Checklist

### ✅ Data Integrity

- [x] Creating task creates domain row + roadmap reference
- [x] Creating event creates domain row + roadmap reference
- [x] Editing task semantics updates domain (triggers mirror to roadmap)
- [x] Editing event semantics updates domain (triggers mirror to roadmap)
- [x] Reordering roadmap does not touch domain
- [x] Moving items between tracks updates roadmap only
- [x] Roadmap item cannot reference entity in different project (trigger enforced)

### ✅ UI Functionality

- [x] Roadmap loads correctly (uses RPC or client merge)
- [x] Creating tasks/events works
- [x] Editing tasks/events works
- [x] Ordering/hierarchy unchanged
- [x] Taskflow still displays items (reads from roadmap mirror fields)
- [x] Calendar still displays events (reads from roadmap mirror fields)

### ✅ Migration Validation

- [x] All tasks migrated to `guardrails_tasks`
- [x] All events migrated to `guardrails_events`
- [x] All roadmap items have domain references
- [x] No orphaned roadmap items
- [x] No invalid entity references
- [x] Project consistency verified

---

## Known Limitations (Accepted for Phase 1)

### 1. Legacy Fields in roadmap_items

**Status:** ✅ Accepted (temporary compatibility bridge)

- `title`, `status`, `start_date`, `end_date`, `metadata` remain in roadmap_items
- These are mirrored by triggers for Taskflow/Calendar compatibility
- Will be removed in Phase 2/3 when execution layers read from domain

### 2. Execution Layers Read from Roadmap

**Status:** ✅ Accepted (deferred to Phase 2/3)

- Taskflow reads from `roadmap_items` (via mirror fields)
- Calendar reads from `roadmap_items` (via mirror fields)
- Phase 2/3 will refactor to read from `guardrails_tasks` and `guardrails_events` directly

### 3. Other Item Types Not Migrated

**Status:** ✅ Accepted (Phase 1 scope is tasks and events only)

- Goals, habits, milestones, etc. remain in roadmap_items
- These will be migrated in future phases
- Constraint allows only 'task' | 'event' initially

---

## Next Steps (Phase 2/3)

### Phase 2: Taskflow Refactor
- Refactor Taskflow to read from `guardrails_tasks` directly
- Remove `roadmap_item_id` foreign key from `taskflow_tasks`
- Add `domain_task_id` foreign key to `taskflow_tasks`
- Remove task mirror triggers

### Phase 3: Calendar Refactor
- Refactor Calendar sync to read from `guardrails_events` directly
- Update `calendar_guardrails_sync` to reference domain entities
- Remove event mirror triggers

### Phase 4: Cleanup
- Remove legacy semantic fields from `roadmap_items` (title, status, dates, metadata)
- Remove mirror triggers
- Update RPC function to remove fallback to legacy fields

### Phase 5: Additional Domain Entities
- Create `guardrails_goals` table
- Create `guardrails_habits` table
- Migrate existing items
- Update constraints and triggers

---

## Files Changed

### New Files
- `supabase/migrations/20260125000000_phase1_create_domain_tables.sql`
- `supabase/migrations/20260125000001_phase1_repurpose_roadmap_items.sql`
- `supabase/migrations/20260125000002_phase1_backfill_domain_entities.sql`
- `supabase/migrations/20260125000003_phase1_compatibility_mirror_triggers.sql`
- `supabase/migrations/20260125000004_phase1_roadmap_projection_rpc.sql`
- `src/lib/guardrails/guardrailsTaskService.ts`
- `src/lib/guardrails/guardrailsEventService.ts`

### Modified Files
- `src/lib/guardrails/roadmapService.ts` (updated create/update flows)

---

## Assumptions

1. **Existing permission helpers work correctly**
   - Assumes `user_can_view_project()` and `user_can_edit_project()` are reliable
   - RLS policies depend on these functions

2. **Migration runs on clean state**
   - Assumes no concurrent writes during migration
   - Backfill script processes items sequentially

3. **Mirror triggers are sufficient**
   - Assumes Taskflow/Calendar only read the mirrored fields
   - If they read other fields, compatibility bridge may need extension

4. **Date conversion is acceptable**
   - Converts `date` to `timestamptz` during migration
   - Uses UTC timezone for events without explicit timezone

---

## Risks and Mitigations

### Risk: Migration fails mid-process
**Mitigation:** Migration is idempotent (checks `domain_entity_type IS NULL` before migrating)

### Risk: Mirror triggers cause performance issues
**Mitigation:** Triggers are AFTER UPDATE (non-blocking), indexes on foreign keys

### Risk: Execution layers break
**Mitigation:** Compatibility bridge keeps legacy fields in sync, no code changes needed

### Risk: Data inconsistency
**Mitigation:** Integrity trigger enforces project matching, unique constraint prevents duplicates

---

## Success Criteria Met

✅ Domain tables created with proper schema and RLS  
✅ Roadmap items reference domain entities by ID  
✅ New creations write domain-first, then roadmap reference  
✅ Semantic edits update domain (triggers mirror to roadmap)  
✅ Structural edits update roadmap only  
✅ Taskflow/Calendar still work (via compatibility bridge)  
✅ No new code adds semantics to roadmap_items  
✅ All Phase 0 architectural rules followed  

---

**Phase 1 Status:** ✅ **COMPLETE**

All deliverables implemented, tested, and ready for deployment.
