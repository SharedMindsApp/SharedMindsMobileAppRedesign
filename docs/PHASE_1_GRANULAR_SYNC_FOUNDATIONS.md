# Phase 1: Granular Calendar Sync Settings - Implementation Summary

**Date:** 2025-01-XX  
**Status:** ✅ Complete  
**Phase:** Architecture Foundation (No Behavior Changes)

---

## Overview

Phase 1 introduces granular sync intent storage at four levels (project, track, subtrack, event) and a pure resolver function to determine effective sync settings. This is **architecture-only** - no behavior changes, no UI, no automatic syncing.

**Key Principle:** We're laying railway tracks, not running trains.

---

## What Was Created

### 1. Database Schema

**Migration:** `supabase/migrations/20260104000000_add_granular_calendar_sync_settings.sql`

**New Tables:**
- `project_calendar_sync_settings` - Project-level sync configuration
- `track_calendar_sync_settings` - Track-level sync configuration
- `subtrack_calendar_sync_settings` - Subtrack-level sync configuration
- `event_calendar_sync_settings` - Event-level sync configuration

**Schema Extension:**
- `calendar_events.source_subtrack_id` - For explainability (not authority)

**Characteristics:**
- ✅ User-scoped (all tables have `user_id`)
- ✅ Explicit opt-in (`sync_enabled = false` by default)
- ✅ Target calendar selection (`personal | shared | both`)
- ✅ Inheritance support (`inherit_from_*` boolean fields)
- ✅ RLS enabled (users can only access own settings)
- ✅ Performance indexes on all foreign keys

### 2. TypeScript Types

**File:** `src/lib/guardrails/calendarSync/types.ts`

**Types:**
- `ProjectCalendarSyncSettings`
- `TrackCalendarSyncSettings`
- `SubtrackCalendarSyncSettings`
- `EventCalendarSyncSettings`
- `SyncResolutionContext`
- `SyncResolutionResult`
- Input types for CRUD operations

### 3. Pure Resolver Function

**File:** `src/lib/guardrails/calendarSync/syncSettingsResolver.ts`

**Function:** `resolveEffectiveCalendarSync(userId, context)`

**Resolution Order (Most Specific Wins):**
1. Event-level setting (if `eventId` provided)
2. Subtrack-level setting (if `subtrackId` provided)
3. Track-level setting (if `trackId` provided)
4. Project-level setting
5. Global `calendar_sync_settings` (fallback)

**Characteristics:**
- ✅ Pure function (no side effects)
- ✅ Does NOT create calendar events
- ✅ Does NOT mutate anything
- ✅ Deterministic and testable
- ✅ Safe to call from sync services later

### 4. CRUD Service Functions

**File:** `src/lib/guardrails/calendarSync/syncSettingsService.ts`

**Functions:**
- Project: `getProjectSyncSettings()`, `upsertProjectSyncSettings()`, `deleteProjectSyncSettings()`
- Track: `getTrackSyncSettings()`, `upsertTrackSyncSettings()`, `deleteTrackSyncSettings()`
- Subtrack: `getSubtrackSyncSettings()`, `upsertSubtrackSyncSettings()`, `deleteSubtrackSyncSettings()`
- Event: `getEventSyncSettings()`, `upsertEventSyncSettings()`, `deleteEventSyncSettings()`

**Characteristics:**
- ✅ Full CRUD operations
- ✅ NOT wired into sync logic yet
- ✅ Safe to call from UI (when UI is built)

### 5. Index File

**File:** `src/lib/guardrails/calendarSync/index.ts`

Clean exports for all types, resolver, and service functions.

---

## What Was NOT Changed

### Existing Sync Behavior

✅ **Unchanged:**
- `guardrailsCalendarSync.ts` still uses global `calendar_sync_settings`
- No calls to new resolver function
- Existing sync logic continues to work exactly as before
- Calendar views unchanged
- Planner views unchanged

### UI Components

✅ **No UI Changes:**
- No new UI components created
- No changes to existing UI components
- Guardrails sync panel unchanged

### Automatic Syncing

✅ **No Automatic Behavior:**
- No database triggers
- No background jobs
- No auto-creation of sync settings rows
- Tables are empty by default

---

## Architecture Details

### Inheritance Model

**Hierarchy:**
```
Event Setting
    ↓ (if inherit_from_subtrack !== false)
Subtrack Setting
    ↓ (if inherit_from_track !== false)
Track Setting
    ↓ (if inherit_from_project !== false)
Project Setting
    ↓ (if inherit_from_global !== false)
Global Setting (calendar_sync_settings)
```

**Rules:**
- Most specific setting always wins
- If `inherit_from_* = false`, use that level's setting
- If `inherit_from_* = true` or `NULL`, check parent level
- If no setting exists at a level, check parent level
- Global settings are always the fallback

### Target Calendar Selection

**Options:**
- `personal` - Sync to Personal Calendar (existing behavior)
- `shared` - Sync to Shared Calendar (household/space)
- `both` - Sync to both calendars

**Implementation Note:**
- Target selection is stored but not used yet
- Will be implemented in future phases
- Shared calendar sync will use `calendar_projections` system

### Entity Type Filtering

**Supported Types:**
- `roadmap_event` - Roadmap items with type='event'
- `task` - Tasks with dates
- `mindmesh_event` - Mind Mesh containers with dates

**Filtering:**
- Each sync setting has toggles for each entity type
- Resolver checks entity type before returning `shouldSync`
- Global settings also respect entity type toggles

---

## Database Schema Reference

### project_calendar_sync_settings

```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
project_id uuid NOT NULL
sync_enabled boolean DEFAULT false
sync_roadmap_events boolean DEFAULT true
sync_tasks_with_dates boolean DEFAULT true
sync_mindmesh_events boolean DEFAULT true
target_calendar_type text DEFAULT 'personal'
target_space_id uuid NULL
inherit_from_global boolean DEFAULT true
created_at timestamptz
updated_at timestamptz
UNIQUE(user_id, project_id)
```

### track_calendar_sync_settings

```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
project_id uuid NOT NULL
track_id uuid NOT NULL
sync_enabled boolean DEFAULT false
sync_roadmap_events boolean DEFAULT true
sync_tasks_with_dates boolean DEFAULT true
sync_mindmesh_events boolean DEFAULT true
target_calendar_type text DEFAULT 'personal'
target_space_id uuid NULL
inherit_from_project boolean DEFAULT true
created_at timestamptz
updated_at timestamptz
UNIQUE(user_id, project_id, track_id)
```

### subtrack_calendar_sync_settings

```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
project_id uuid NOT NULL
track_id uuid NOT NULL
subtrack_id uuid NOT NULL
sync_enabled boolean DEFAULT false
sync_roadmap_events boolean DEFAULT true
sync_tasks_with_dates boolean DEFAULT true
sync_mindmesh_events boolean DEFAULT true
target_calendar_type text DEFAULT 'personal'
target_space_id uuid NULL
inherit_from_track boolean DEFAULT true
created_at timestamptz
updated_at timestamptz
UNIQUE(user_id, project_id, track_id, subtrack_id)
```

### event_calendar_sync_settings

```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
project_id uuid NOT NULL
event_id uuid NOT NULL
entity_type text NOT NULL  -- 'roadmap_event' | 'task' | 'mindmesh_event'
track_id uuid NULL
subtrack_id uuid NULL
sync_enabled boolean DEFAULT false
target_calendar_type text DEFAULT 'personal'
target_space_id uuid NULL
inherit_from_subtrack boolean NULL
inherit_from_track boolean NULL
inherit_from_project boolean NULL
created_at timestamptz
updated_at timestamptz
UNIQUE(user_id, project_id, event_id, entity_type)
```

---

## Usage Examples (Future Phases)

### Example 1: Project-Level Sync

```typescript
// Enable sync for entire project
await upsertProjectSyncSettings({
  user_id: userId,
  project_id: projectId,
  sync_enabled: true,
  target_calendar_type: 'personal',
  inherit_from_global: false,  // Override global settings
});

// Resolver will use project setting for all entities in project
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: projectId,
  trackId: trackId,
  entityType: 'roadmap_event',
});
// result.source = 'project'
```

### Example 2: Track-Level Override

```typescript
// Project sync enabled, but disable for specific track
await upsertTrackSyncSettings({
  user_id: userId,
  project_id: projectId,
  track_id: trackId,
  sync_enabled: false,
  inherit_from_project: false,  // Override project setting
});

// Resolver will skip sync for this track
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: projectId,
  trackId: trackId,
  entityType: 'roadmap_event',
});
// result.shouldSync = false
// result.source = 'track'
```

### Example 3: Subtrack-Level Override

```typescript
// Track sync disabled, but enable for specific subtrack
await upsertSubtrackSyncSettings({
  user_id: userId,
  project_id: projectId,
  track_id: trackId,
  subtrack_id: subtrackId,
  sync_enabled: true,
  inherit_from_track: false,  // Override track setting
});

// Resolver will sync only this subtrack
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: projectId,
  trackId: trackId,
  subtrackId: subtrackId,
  entityType: 'roadmap_event',
});
// result.shouldSync = true
// result.source = 'subtrack'
```

### Example 4: Event-Level Override

```typescript
// All levels disabled, but enable for specific event
await upsertEventSyncSettings({
  user_id: userId,
  project_id: projectId,
  event_id: eventId,
  entity_type: 'roadmap_event',
  sync_enabled: true,
  inherit_from_subtrack: false,
  inherit_from_track: false,
  inherit_from_project: false,
});

// Resolver will sync only this event
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: projectId,
  trackId: trackId,
  subtrackId: subtrackId,
  eventId: eventId,
  entityType: 'roadmap_event',
});
// result.shouldSync = true
// result.source = 'event'
```

### Example 5: Shared Calendar Sync

```typescript
// Sync project to shared calendar
await upsertProjectSyncSettings({
  user_id: userId,
  project_id: projectId,
  sync_enabled: true,
  target_calendar_type: 'shared',
  target_space_id: spaceId,
});

// Resolver will return shared calendar target
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: projectId,
  entityType: 'roadmap_event',
});
// result.targetCalendar = 'shared'
// result.targetSpaceId = spaceId
```

---

## Testing the Resolver

### Test Case 1: No Settings (Fallback to Global)

```typescript
// No granular settings exist
const result = await resolveEffectiveCalendarSync(userId, {
  projectId: 'project-123',
  entityType: 'roadmap_event',
});

// Should fall back to global settings
// result.source = 'global'
// result.shouldSync = (depends on global settings)
```

### Test Case 2: Project Setting Overrides Global

```typescript
// Create project setting
await upsertProjectSyncSettings({
  user_id: userId,
  project_id: 'project-123',
  sync_enabled: true,
  inherit_from_global: false,
});

const result = await resolveEffectiveCalendarSync(userId, {
  projectId: 'project-123',
  entityType: 'roadmap_event',
});

// Should use project setting
// result.source = 'project'
// result.shouldSync = true
```

### Test Case 3: Track Setting Overrides Project

```typescript
// Project: sync enabled
await upsertProjectSyncSettings({
  user_id: userId,
  project_id: 'project-123',
  sync_enabled: true,
  inherit_from_global: false,
});

// Track: sync disabled
await upsertTrackSyncSettings({
  user_id: userId,
  project_id: 'project-123',
  track_id: 'track-456',
  sync_enabled: false,
  inherit_from_project: false,
});

const result = await resolveEffectiveCalendarSync(userId, {
  projectId: 'project-123',
  trackId: 'track-456',
  entityType: 'roadmap_event',
});

// Should use track setting (most specific)
// result.source = 'track'
// result.shouldSync = false
```

---

## Next Steps

### Phase 2: Wire Resolver into Sync Logic

**Tasks:**
1. Update `guardrailsCalendarSync.ts` to call `resolveEffectiveCalendarSync()`
2. Populate `source_subtrack_id` when available from roadmap items
3. Respect `targetCalendar` from resolver (personal/shared/both)
4. Implement shared calendar sync logic

**Files to Modify:**
- `src/lib/guardrails/guardrailsCalendarSync.ts`

### Phase 3: UI Components

**Tasks:**
1. Create project sync settings panel
2. Create track sync settings panel
3. Create subtrack sync settings panel
4. Create event sync settings panel
5. Update Guardrails sync panel to show granular status

**Files to Create:**
- `src/components/guardrails/sync/ProjectSyncSettingsPanel.tsx`
- `src/components/guardrails/sync/TrackSyncSettingsPanel.tsx`
- `src/components/guardrails/sync/SubtrackSyncSettingsPanel.tsx`
- `src/components/guardrails/sync/EventSyncSettingsPanel.tsx`

### Phase 4: Shared Calendar Sync

**Tasks:**
1. Implement shared calendar sync using `calendar_projections`
2. Handle `target_calendar_type = 'shared'` or `'both'`
3. Create projections for shared calendar events
4. Update UI to show shared calendar sync status

---

## Safety Guarantees

### Backward Compatibility

✅ **Guaranteed:**
- Existing global sync continues to work
- No breaking changes to existing code
- All existing calendar views unchanged
- Planner unchanged

### Data Integrity

✅ **Guaranteed:**
- RLS policies prevent unauthorized access
- Unique constraints prevent duplicate settings
- Foreign key constraints maintain referential integrity
- Cascade deletes clean up orphaned settings

### Performance

✅ **Optimized:**
- Indexes on all foreign key combinations
- Efficient queries (single table lookups)
- No N+1 query problems
- Resolver caches nothing (pure function)

---

## Conclusion

Phase 1 successfully establishes the foundation for granular calendar sync settings:

✅ **Complete:**
- Database schema for 4-level granular settings
- Pure resolver function with hierarchical resolution
- CRUD service functions ready for UI
- TypeScript types for type safety
- No behavior changes (existing sync unchanged)

✅ **Ready For:**
- Phase 2: Wiring resolver into sync logic
- Phase 3: UI components for settings management
- Phase 4: Shared calendar sync implementation

**Status:** ✅ Phase 1 Complete - Ready for Phase 2

---

**End of Summary**
