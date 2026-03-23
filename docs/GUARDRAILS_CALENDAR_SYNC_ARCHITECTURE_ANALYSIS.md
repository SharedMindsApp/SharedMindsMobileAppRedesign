# Guardrails Calendar Sync Architecture Analysis

**Date:** 2025-01-XX  
**Purpose:** Analyze current Guardrails calendar sync implementation and compare with desired granular (project/track/subtrack) sync architecture  
**Status:** Analysis Only (No Code Changes)

---

## Executive Summary

The current Guardrails calendar sync architecture provides **global user-level sync settings** that apply to all projects. The desired architecture requires **granular sync control** at project, track, and subtrack levels, with the ability to sync to either Personal or Shared calendars.

**Current State:** ✅ Global sync working, ❌ Granular control missing  
**Desired State:** ✅ Granular project/track/subtrack sync with Personal/Shared calendar targeting

---

## Current Architecture

### 1. Database Schema

#### `calendar_sync_settings` Table

**Location:** `supabase/migrations/20251217203615_20251217190000_create_calendar_sync_settings.sql`

**Structure:**
```sql
CREATE TABLE calendar_sync_settings (
  user_id uuid PRIMARY KEY,
  
  -- Guardrails → Personal Spaces (default: enabled)
  sync_guardrails_to_personal boolean NOT NULL DEFAULT true,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  -- Personal Spaces → Guardrails (default: disabled)
  sync_personal_to_guardrails boolean NOT NULL DEFAULT false,
  require_confirmation_for_personal_sync boolean NOT NULL DEFAULT true,
  
  created_at timestamptz,
  updated_at timestamptz
);
```

**Characteristics:**
- ✅ **User-scoped**: One row per user
- ✅ **Global settings**: Applies to ALL projects
- ❌ **No project-level control**: Cannot enable/disable sync per project
- ❌ **No track-level control**: Cannot enable/disable sync per track
- ❌ **No subtrack-level control**: Cannot enable/disable sync per subtrack
- ❌ **No target calendar selection**: Only syncs to Personal Calendar (not Shared)

#### `calendar_events` Table

**Relevant Fields:**
```sql
calendar_events (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL,  -- Required (constraint)
  created_by uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  
  -- Source tracking
  source_type text,  -- 'roadmap_event', 'task', 'mindmesh_event', 'personal'
  source_entity_id uuid,  -- ID of roadmap_item, task, etc.
  source_project_id uuid,  -- master_project.id (exists)
  source_track_id uuid,  -- track.id (exists but NOT used for filtering)
  
  ...
)
```

**Key Observations:**
- ✅ `source_project_id` exists and is populated
- ✅ `source_track_id` exists and is populated (for roadmap events and Mind Mesh)
- ❌ `source_track_id` is **NOT used** in sync filtering logic
- ❌ No `source_subtrack_id` field exists
- ❌ No `target_calendar_type` field (Personal vs Shared)

### 2. Sync Service Layer

**File:** `src/lib/guardrails/guardrailsCalendarSync.ts`

#### Current Sync Functions

1. **`syncRoadmapEventToCalendar(userId, item)`**
   - Checks global `calendar_sync_settings`
   - Only syncs if `syncGuardrailsToPersonal = true` AND `syncRoadmapEvents = true`
   - Creates/updates `calendar_events` with `source_type='roadmap_event'`
   - Stores `source_project_id` and `source_track_id` but doesn't use them for filtering

2. **`syncTaskToCalendar(userId, task)`**
   - Checks global `calendar_sync_settings`
   - Only syncs if `syncGuardrailsToPersonal = true` AND `syncTasksWithDates = true`
   - Creates/updates `calendar_events` with `source_type='task'`
   - Stores `source_project_id` but no track/subtrack info

3. **`syncMindMeshEventToCalendar(userId, container)`**
   - Checks global `calendar_sync_settings`
   - Only syncs if `syncGuardrailsToPersonal = true` AND `syncMindMeshEvents = true`
   - Creates/updates `calendar_events` with `source_type='mindmesh_event'`
   - Stores `source_project_id` and `source_track_id`

#### Sync Logic Flow

```
Guardrails Entity Created/Updated
    ↓
Check global calendar_sync_settings (user-level)
    ↓
If sync enabled:
  Check entity type (roadmap_event, task, mindmesh_event)
    ↓
  If type-specific sync enabled:
    Create/Update calendar_events
    Set source_type, source_entity_id, source_project_id, source_track_id
    ↓
  Event appears in Personal Calendar
```

**Limitations:**
- ❌ No check for project-level sync settings
- ❌ No check for track-level sync settings
- ❌ No check for subtrack-level sync settings
- ❌ Always syncs to Personal Calendar (household_id from user's household)
- ❌ No option to sync to Shared Calendar (space)

### 3. Service Layer: `calendarSyncSettings.ts`

**File:** `src/lib/calendarSyncSettings.ts`

**Current Functions:**
- `getCalendarSyncSettings(userId)`: Read-only access to global settings
- `hasCalendarSyncSettings(userId)`: Check if settings exist
- Helper functions for checking sync permissions

**Limitations:**
- ❌ No project-level settings access
- ❌ No track-level settings access
- ❌ No subtrack-level settings access
- ❌ No target calendar selection

### 4. UI Components

**Guardrails Sync Panel:**
- **File:** `src/components/guardrails/GuardrailsCalendarSyncPanel.tsx` (referenced in docs)
- Master toggle: "Sync Guardrails to Personal Calendar"
- Child toggles: Roadmap Events, Tasks with Dates, Mind Mesh Events
- **Scope:** Global (all projects)

**Limitations:**
- ❌ No per-project sync controls
- ❌ No per-track sync controls
- ❌ No per-subtrack sync controls
- ❌ No target calendar selection (Personal vs Shared)

---

## Desired Architecture

### Requirements

1. **Project-Level Sync Control**
   - Users can enable/disable sync for entire projects
   - Default: Inherit from global settings (or opt-in per project)

2. **Track-Level Sync Control**
   - Users can enable/disable sync for specific tracks within a project
   - Default: Inherit from project settings

3. **Subtrack-Level Sync Control**
   - Users can enable/disable sync for specific subtracks within a track
   - Default: Inherit from track settings

4. **Target Calendar Selection**
   - Users can choose to sync to:
     - Personal Calendar (existing behavior)
     - Shared Calendar (household/space calendar)
     - Both (optional)

5. **Two-Way Sync**
   - Changes in Guardrails reflect in calendar (existing)
   - Changes in calendar reflect in Guardrails (not yet implemented)

6. **Opt-In Only**
   - No automatic syncing
   - Users must explicitly enable sync at desired granularity

---

## Gap Analysis

### What's Missing

#### 1. Granular Sync Settings Table

**Current:** `calendar_sync_settings` (user-level only)  
**Needed:** Multi-level sync settings

**Proposed Schema:**
```sql
-- Option A: Single table with nullable foreign keys
CREATE TABLE guardrails_calendar_sync_settings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  
  -- Hierarchy (only one should be set)
  project_id uuid NULL,  -- If set: project-level setting
  track_id uuid NULL,    -- If set: track-level setting (requires project_id)
  subtrack_id uuid NULL, -- If set: subtrack-level setting (requires track_id)
  
  -- Sync configuration
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  -- Target calendar
  target_calendar_type text NOT NULL DEFAULT 'personal',  -- 'personal' | 'shared' | 'both'
  target_space_id uuid NULL,  -- If target_calendar_type = 'shared' or 'both'
  
  -- Inheritance
  inherit_from_parent boolean NOT NULL DEFAULT true,  -- Use parent setting if not explicitly set
  
  created_at timestamptz,
  updated_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_hierarchy CHECK (
    (project_id IS NOT NULL AND track_id IS NULL AND subtrack_id IS NULL) OR
    (project_id IS NOT NULL AND track_id IS NOT NULL AND subtrack_id IS NULL) OR
    (project_id IS NOT NULL AND track_id IS NOT NULL AND subtrack_id IS NOT NULL)
  )
);

-- Option B: Separate tables per level (cleaner, more explicit)
CREATE TABLE project_calendar_sync_settings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT false,
  target_calendar_type text NOT NULL DEFAULT 'personal',
  ...
);

CREATE TABLE track_calendar_sync_settings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  track_id uuid NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT false,
  inherit_from_project boolean NOT NULL DEFAULT true,
  ...
);

CREATE TABLE subtrack_calendar_sync_settings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  track_id uuid NOT NULL,
  subtrack_id uuid NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT false,
  inherit_from_track boolean NOT NULL DEFAULT true,
  ...
);
```

**Recommendation:** Option B (separate tables) for:
- Clearer data model
- Easier queries (no complex NULL checks)
- Better performance (indexed foreign keys)
- Explicit inheritance model

#### 2. Sync Logic Enhancement

**Current:** Checks only global settings  
**Needed:** Hierarchical settings resolution

**Proposed Resolution Logic:**
```typescript
async function shouldSyncEntity(
  userId: string,
  entity: {
    projectId: string;
    trackId?: string;
    subtrackId?: string;
    type: 'roadmap_event' | 'task' | 'mindmesh_event';
  }
): Promise<{
  shouldSync: boolean;
  targetCalendar: 'personal' | 'shared' | 'both';
  targetSpaceId?: string;
}> {
  // 1. Check subtrack-level setting (most specific)
  if (entity.subtrackId) {
    const subtrackSetting = await getSubtrackSyncSetting(
      userId, 
      entity.projectId, 
      entity.trackId!, 
      entity.subtrackId
    );
    if (subtrackSetting && !subtrackSetting.inheritFromTrack) {
      return {
        shouldSync: subtrackSetting.syncEnabled && 
                   isEntityTypeEnabled(subtrackSetting, entity.type),
        targetCalendar: subtrackSetting.targetCalendarType,
        targetSpaceId: subtrackSetting.targetSpaceId,
      };
    }
  }
  
  // 2. Check track-level setting
  if (entity.trackId) {
    const trackSetting = await getTrackSyncSetting(
      userId, 
      entity.projectId, 
      entity.trackId
    );
    if (trackSetting && !trackSetting.inheritFromProject) {
      return {
        shouldSync: trackSetting.syncEnabled && 
                   isEntityTypeEnabled(trackSetting, entity.type),
        targetCalendar: trackSetting.targetCalendarType,
        targetSpaceId: trackSetting.targetSpaceId,
      };
    }
  }
  
  // 3. Check project-level setting
  const projectSetting = await getProjectSyncSetting(
    userId, 
    entity.projectId
  );
  if (projectSetting && !projectSetting.inheritFromGlobal) {
    return {
      shouldSync: projectSetting.syncEnabled && 
                 isEntityTypeEnabled(projectSetting, entity.type),
      targetCalendar: projectSetting.targetCalendarType,
      targetSpaceId: projectSetting.targetSpaceId,
    };
  }
  
  // 4. Fall back to global settings
  const globalSettings = await getCalendarSyncSettings(userId);
  return {
    shouldSync: globalSettings.syncGuardrailsToPersonal && 
               isEntityTypeEnabled(globalSettings, entity.type),
    targetCalendar: 'personal',  // Default to personal
    targetSpaceId: undefined,
  };
}
```

#### 3. Database Schema Enhancements

**Needed Changes:**

1. **Add `source_subtrack_id` to `calendar_events`:**
```sql
ALTER TABLE calendar_events 
ADD COLUMN source_subtrack_id uuid REFERENCES guardrails_subtracks(id);
```

2. **Add `target_calendar_type` to `calendar_events`:**
```sql
ALTER TABLE calendar_events 
ADD COLUMN target_calendar_type text DEFAULT 'personal';  -- 'personal' | 'shared'
ADD COLUMN target_space_id uuid REFERENCES spaces(id);
```

3. **Create granular sync settings tables** (as proposed above)

#### 4. UI Components

**Needed Components:**

1. **Project Sync Settings Panel**
   - Location: Project settings page
   - Toggle: "Sync this project to calendar"
   - Target selection: Personal / Shared / Both
   - Entity type toggles: Roadmap Events, Tasks, Mind Mesh

2. **Track Sync Settings Panel**
   - Location: Track settings/context menu
   - Toggle: "Sync this track to calendar"
   - Inherit from project toggle
   - Target selection: Personal / Shared / Both

3. **Subtrack Sync Settings Panel**
   - Location: Subtrack settings/context menu
   - Toggle: "Sync this subtrack to calendar"
   - Inherit from track toggle
   - Target selection: Personal / Shared / Both

4. **Bulk Sync Management**
   - Location: Project settings
   - View all tracks/subtracks with sync status
   - Bulk enable/disable sync
   - Visual hierarchy (project → tracks → subtracks)

---

## Implementation Recommendations

### 1. Database Design

**Recommended Approach: Separate Tables per Level**

**Rationale:**
- **Clarity**: Each table has a single responsibility
- **Performance**: Direct foreign key indexes (no complex NULL checks)
- **Maintainability**: Easier to query and understand
- **Scalability**: Can add level-specific fields without affecting others

**Tables:**
```sql
-- Project-level sync settings
CREATE TABLE project_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  target_calendar_type text NOT NULL DEFAULT 'personal',  -- 'personal' | 'shared' | 'both'
  target_space_id uuid NULL REFERENCES spaces(id),
  
  inherit_from_global boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, project_id)
);

-- Track-level sync settings
CREATE TABLE track_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES guardrails_tracks_v2(id) ON DELETE CASCADE,
  
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  target_calendar_type text NOT NULL DEFAULT 'personal',
  target_space_id uuid NULL REFERENCES spaces(id),
  
  inherit_from_project boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, project_id, track_id)
);

-- Subtrack-level sync settings
CREATE TABLE subtrack_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES guardrails_tracks_v2(id) ON DELETE CASCADE,
  subtrack_id uuid NOT NULL REFERENCES guardrails_subtracks(id) ON DELETE CASCADE,
  
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  target_calendar_type text NOT NULL DEFAULT 'personal',
  target_space_id uuid NULL REFERENCES spaces(id),
  
  inherit_from_track boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, project_id, track_id, subtrack_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_project_sync_user_project ON project_calendar_sync_settings(user_id, project_id);
CREATE INDEX idx_track_sync_user_track ON track_calendar_sync_settings(user_id, project_id, track_id);
CREATE INDEX idx_subtrack_sync_user_subtrack ON subtrack_calendar_sync_settings(user_id, project_id, track_id, subtrack_id);
```

### 2. Service Layer Architecture

**Recommended Structure:**

```
src/lib/guardrails/calendarSync/
├── settings/
│   ├── projectSyncSettings.ts      -- Project-level settings CRUD
│   ├── trackSyncSettings.ts        -- Track-level settings CRUD
│   ├── subtrackSyncSettings.ts     -- Subtrack-level settings CRUD
│   └── syncSettingsResolver.ts     -- Hierarchical resolution logic
├── sync/
│   ├── syncResolver.ts              -- Should sync? (checks all levels)
│   ├── roadmapEventSync.ts         -- Enhanced with granular checks
│   ├── taskSync.ts                 -- Enhanced with granular checks
│   └── mindmeshSync.ts             -- Enhanced with granular checks
└── targets/
    ├── personalCalendarSync.ts     -- Sync to personal calendar
    └── sharedCalendarSync.ts       -- Sync to shared calendar
```

**Key Functions:**

1. **`resolveSyncSettings(userId, entity)`**
   - Checks subtrack → track → project → global (hierarchical)
   - Returns effective sync configuration
   - Handles inheritance logic

2. **`shouldSyncEntity(userId, entity)`**
   - Calls `resolveSyncSettings()`
   - Checks entity type (roadmap_event, task, mindmesh_event)
   - Returns boolean + target calendar info

3. **Enhanced sync functions**
   - Call `shouldSyncEntity()` before syncing
   - Respect target calendar type (personal/shared/both)
   - Create events in appropriate calendar(s)

### 3. Inheritance Model

**Recommended Inheritance Rules:**

1. **Explicit Override**: If a setting exists and `inherit_from_* = false`, use that setting
2. **Inheritance**: If `inherit_from_* = true` or setting doesn't exist, check parent level
3. **Default Fallback**: If no explicit settings at any level, use global `calendar_sync_settings`

**Inheritance Chain:**
```
Subtrack Setting (if exists and inherit_from_track = false)
    ↓ (if inherit_from_track = true or doesn't exist)
Track Setting (if exists and inherit_from_project = false)
    ↓ (if inherit_from_project = true or doesn't exist)
Project Setting (if exists and inherit_from_global = false)
    ↓ (if inherit_from_global = true or doesn't exist)
Global Setting (calendar_sync_settings)
```

**Example:**
- Project "Wedding Planning": `sync_enabled = true`, `inherit_from_global = false`
- Track "Venue": `sync_enabled = false`, `inherit_from_project = false`
- Subtrack "Catering": No explicit setting, `inherit_from_track = true` (default)

**Result:** Subtrack "Catering" does NOT sync (inherits `sync_enabled = false` from track)

### 4. Target Calendar Handling

**Shared Calendar Sync:**

When `target_calendar_type = 'shared'` or `'both'`:
- Use `target_space_id` to determine which shared space calendar
- Create `calendar_events` with `household_id` from space's household
- OR use `calendar_projections` system (if context-sovereign calendar is enabled)

**Recommendation:** Use `calendar_projections` for shared calendar sync:
- Aligns with existing context-sovereign architecture
- Supports permission-based visibility
- Handles multi-user scenarios better

### 5. Two-Way Sync (Future Enhancement)

**Current:** One-way only (Guardrails → Calendar)  
**Desired:** Two-way (Guardrails ↔ Calendar)

**Implementation Approach:**

1. **Calendar → Guardrails:**
   - Detect calendar event changes (via webhooks or polling)
   - Check if event has `source_type = 'guardrails'` and `source_entity_id`
   - Update corresponding Guardrails entity
   - Requires conflict resolution strategy

2. **Conflict Resolution:**
   - **Last Write Wins**: Simple but can lose data
   - **User Choice**: Prompt user on conflict
   - **Source of Truth**: Guardrails always wins (recommended for now)

**Recommendation:** Implement one-way sync first, add two-way later with careful conflict handling.

---

## Professional-Grade Architecture Improvements

### 1. Audit Trail

**Add to sync settings tables:**
```sql
ALTER TABLE project_calendar_sync_settings
ADD COLUMN last_synced_at timestamptz,
ADD COLUMN sync_count integer DEFAULT 0,
ADD COLUMN last_sync_error text;
```

**Purpose:**
- Track when sync last occurred
- Monitor sync health
- Debug sync issues
- Analytics on sync usage

### 2. Sync Status Tracking

**New Table:**
```sql
CREATE TABLE calendar_sync_status (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,  -- 'roadmap_event', 'task', 'mindmesh_event'
  entity_id uuid NOT NULL,
  project_id uuid NOT NULL,
  track_id uuid NULL,
  subtrack_id uuid NULL,
  
  calendar_event_id uuid REFERENCES calendar_events(id),
  sync_status text NOT NULL,  -- 'synced', 'pending', 'failed', 'skipped'
  target_calendar_type text NOT NULL,
  last_synced_at timestamptz,
  error_message text,
  
  created_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE(user_id, entity_type, entity_id)
);
```

**Purpose:**
- Track sync state per entity
- Enable retry logic for failed syncs
- Show sync status in UI
- Debug sync issues

### 3. Batch Sync Operations

**Function:**
```typescript
async function syncProjectToCalendar(
  userId: string,
  projectId: string,
  options?: {
    force?: boolean;  // Re-sync even if already synced
    dryRun?: boolean;  // Preview what would sync
  }
): Promise<SyncBatchResult>;
```

**Purpose:**
- Bulk sync entire projects
- Re-sync after settings changes
- Preview sync impact
- Better performance (batch operations)

### 4. Sync Validation

**Function:**
```typescript
async function validateSyncSettings(
  userId: string,
  projectId: string
): Promise<ValidationResult> {
  // Check for:
  // - Circular dependencies
  // - Invalid target spaces
  // - Missing required settings
  // - Conflicting settings
}
```

**Purpose:**
- Prevent invalid configurations
- Provide helpful error messages
- Ensure data integrity

### 5. Performance Optimizations

**Recommendations:**

1. **Caching:**
   - Cache resolved sync settings (Redis or in-memory)
   - Invalidate on settings changes
   - TTL: 5 minutes

2. **Batch Queries:**
   - Load all sync settings for a project in one query
   - Use JOINs instead of multiple queries
   - Prefetch settings when loading projects

3. **Lazy Evaluation:**
   - Only check sync settings when entity is created/updated
   - Don't check on every read operation
   - Use database triggers for automatic sync (optional)

### 6. Error Handling & Resilience

**Recommendations:**

1. **Retry Logic:**
   - Retry failed syncs with exponential backoff
   - Max retries: 3
   - Log failures for manual review

2. **Partial Sync:**
   - If one entity fails, continue with others
   - Report failures separately
   - Don't block entire batch

3. **Sync Queue:**
   - Queue sync operations for async processing
   - Handle high-volume scenarios
   - Prioritize user-initiated syncs

### 7. User Experience Enhancements

**UI Recommendations:**

1. **Visual Sync Status:**
   - Icons on roadmap items/tasks showing sync status
   - Color coding: Green (synced), Yellow (pending), Red (failed)
   - Tooltip with sync details

2. **Bulk Actions:**
   - "Sync all events in this track" button
   - "Sync entire project" option
   - "Unsync all" for quick disable

3. **Sync Preview:**
   - Show what will sync before enabling
   - Count of events that will appear in calendar
   - Preview target calendar

4. **Settings Inheritance Visualization:**
   - Show inheritance chain in UI
   - "Inheriting from Project" badge
   - "Override" button to break inheritance

---

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)

1. **Add database tables** (granular sync settings)
2. **Add service layer** (settings CRUD, resolver)
3. **Enhance sync logic** (check granular settings, fall back to global)
4. **No UI changes yet** (backward compatible)

**Result:** Granular sync works, but UI still shows global settings

### Phase 2: UI Enhancement

1. **Add project sync settings panel**
2. **Add track sync settings panel**
3. **Add subtrack sync settings panel**
4. **Update Guardrails sync panel** (show granular status)

**Result:** Users can configure granular sync

### Phase 3: Shared Calendar Support

1. **Add target calendar selection**
2. **Implement shared calendar sync**
3. **Update UI** (target calendar picker)

**Result:** Users can sync to Personal or Shared calendars

### Phase 4: Two-Way Sync (Future)

1. **Implement calendar → Guardrails sync**
2. **Add conflict resolution**
3. **Update UI** (show bidirectional sync status)

**Result:** Full two-way sync

---

## Summary

### Current State

✅ **Implemented:**
- Global user-level sync settings
- One-way sync (Guardrails → Personal Calendar)
- Entity-level sync (roadmap events, tasks, Mind Mesh)
- Source tracking (`source_project_id`, `source_track_id`)

❌ **Missing:**
- Project-level sync settings
- Track-level sync settings
- Subtrack-level sync settings
- Target calendar selection (Personal vs Shared)
- Hierarchical settings resolution
- Two-way sync

### Required Changes

1. **Database:**
   - Create granular sync settings tables (project/track/subtrack)
   - Add `source_subtrack_id` to `calendar_events`
   - Add `target_calendar_type` and `target_space_id` to `calendar_events`

2. **Service Layer:**
   - Create settings CRUD functions
   - Implement hierarchical settings resolver
   - Enhance sync functions to check granular settings
   - Add shared calendar sync support

3. **UI:**
   - Project sync settings panel
   - Track sync settings panel
   - Subtrack sync settings panel
   - Target calendar selection
   - Visual sync status indicators

### Recommended Architecture

- **Separate tables per level** (project/track/subtrack)
- **Hierarchical inheritance** (subtrack → track → project → global)
- **Explicit override model** (users can break inheritance)
- **Target calendar selection** (Personal/Shared/Both)
- **Audit trail and status tracking**
- **Batch operations and performance optimizations**

### Professional Enhancements

- Sync status tracking table
- Audit trail (last synced, sync count, errors)
- Batch sync operations
- Sync validation
- Performance optimizations (caching, batch queries)
- Error handling and retry logic
- Enhanced UI (visual status, bulk actions, preview)

---

**End of Analysis**
