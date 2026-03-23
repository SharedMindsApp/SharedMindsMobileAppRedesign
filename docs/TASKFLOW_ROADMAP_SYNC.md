# Task Flow ↔ Roadmap One-Way Sync Architecture

## Overview

This document describes the one-way synchronization architecture where certain Roadmap Items create and maintain corresponding Task Flow entries. This is a foundational sync layer that establishes Task Flow as a derived execution view of Roadmap Items.

**Key Principles:**
- Roadmap remains the **source of truth**
- Task Flow is a **derived execution view**
- Sync is **one-way only** (Roadmap → Task Flow)
- Not automation, not bi-directional, not workflow intelligence
- Backward compatible with existing systems

## Architecture Components

### 1. Database Layer

**New Table: `taskflow_tasks`**

```sql
CREATE TABLE taskflow_tasks (
  id uuid PRIMARY KEY,
  roadmap_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status roadmap_item_status NOT NULL DEFAULT 'not_started',
  archived boolean DEFAULT false,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Constraints:**
- `UNIQUE INDEX` on `roadmap_item_id` (one task per roadmap item)
- `ON DELETE SET NULL` preserves Task Flow tasks when Roadmap Items are deleted
- RLS policies inherit from project permissions

**Migration:** `supabase/migrations/20251212_create_taskflow_system_with_roadmap_sync.sql`

### 2. Type System

**Core Types** (`src/lib/guardrails/taskFlowTypes.ts`):

```typescript
interface TaskFlowTask {
  id: string;
  roadmapItemId: string | null;
  masterProjectId: string;
  title: string;
  description: string | null;
  status: RoadmapItemStatus;
  archived: boolean;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type TaskFlowEligibleType = 'task' | 'habit' | 'goal';

interface TaskFlowSyncResult {
  success: boolean;
  taskFlowTaskId: string | null;
  action: 'created' | 'updated' | 'archived' | 'skipped' | 'error';
  reason?: string;
}
```

### 3. Service Layer

**Task Flow Sync Service** (`src/lib/guardrails/taskFlowSyncService.ts`):

**Key Functions:**

```typescript
// Check if roadmap item type is eligible for Task Flow
isRoadmapItemTaskFlowEligible(item: RoadmapItem): boolean

// Get linked Task Flow task for a roadmap item
getTaskFlowTaskForRoadmapItem(roadmapItemId: string): Promise<TaskFlowTask | null>

// Sync roadmap item to Task Flow (create or update)
syncRoadmapItemToTaskFlow(roadmapItem: RoadmapItem): Promise<TaskFlowSyncResult>

// Archive Task Flow task when roadmap item is deleted
archiveTaskFlowTaskForRoadmapItem(roadmapItemId: string): Promise<void>

// CRUD operations for Task Flow tasks
createTaskFlowTask(input: CreateTaskFlowTaskInput): Promise<TaskFlowTask>
updateTaskFlowTask(taskId: string, input: UpdateTaskFlowTaskInput): Promise<TaskFlowTask>
archiveTaskFlowTask(taskId: string): Promise<void>
deleteTaskFlowTask(taskId: string): Promise<void>
getTaskFlowTasksForProject(masterProjectId: string): Promise<TaskFlowTask[]>
```

## Eligibility Rules

### Roadmap Item Types → Task Flow

| Roadmap Item Type | Creates Task Flow Task | Reason |
|-------------------|------------------------|--------|
| `task` | ✅ Yes | Core execution item |
| `habit` | ✅ Yes | Recurring execution item |
| `goal` | ✅ Yes | Trackable outcome |
| `milestone` | ❌ No | Marker, not executable |
| `event` | ❌ No | Calendar item, not task |
| `note` | ❌ No | Documentation only |
| `document` | ❌ No | Reference material |
| `review` | ❌ No | Retrospective content |
| `photo` | ❌ No | Media asset |
| `grocery_list` | ❌ No | Specialized widget |

**Validation:** Enforced at service layer via `isTaskFlowEligible(type)` check.

## Sync Rules

### Creation

When an eligible Roadmap Item is created:
1. **Validation**: Check if item type is eligible (`task`, `habit`, or `goal`)
2. **Creation**: Automatically create corresponding Task Flow task
3. **Linkage**: Set `roadmap_item_id` to establish connection
4. **Timestamp**: Set `synced_at` to current timestamp

**Hook:** `roadmapService.createRoadmapItem()` calls `syncRoadmapItemToTaskFlow()`

### Updates

When a Roadmap Item is updated, the following fields sync to Task Flow:
- `title` → Task Flow task title
- `description` → Task Flow task description
- `status` → Task Flow task status
- Archive/completion state → Task Flow archived flag

**Fields that DO NOT sync:**
- `start_date` / `end_date` (dates remain in Roadmap)
- `color` (visual property only)
- `track_id` / `subtrack_id` (organizational structure)
- `metadata` (type-specific data)

**Hook:** `roadmapService.updateRoadmapItem()` calls `syncRoadmapItemToTaskFlow()`

### Deletion / Archival

When a Roadmap Item is deleted:
1. **Archive First**: Linked Task Flow task is archived (not deleted)
2. **Preserve Data**: Task remains in Task Flow for historical tracking
3. **Link Breaks**: `roadmap_item_id` is set to NULL via ON DELETE SET NULL

**Hook:** `roadmapService.deleteRoadmapItem()` calls `archiveTaskFlowTaskForRoadmapItem()`

## Data Flow Diagrams

### Create Flow

```
┌─────────────────┐
│ User creates    │
│ Roadmap Item    │
│ (type: task)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ roadmapService.createRoadmapItem│
│ 1. Validate input               │
│ 2. Insert into roadmap_items    │
│ 3. Create Mind Mesh connection  │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ syncRoadmapItemToTaskFlow        │
│ 1. Check eligibility             │
│ 2. Create taskflow_tasks entry   │
│ 3. Set synced_at timestamp       │
└──────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Task Flow task created  │
│ Status: synced          │
└─────────────────────────┘
```

### Update Flow

```
┌─────────────────┐
│ User updates    │
│ Roadmap Item    │
│ (status change) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ roadmapService.updateRoadmapItem│
│ 1. Validate input               │
│ 2. Update roadmap_items         │
│ 3. Update Mind Mesh metadata    │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ syncRoadmapItemToTaskFlow        │
│ 1. Find linked task              │
│ 2. Update task fields            │
│ 3. Update synced_at              │
└──────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Task Flow task updated  │
│ Status: synced          │
└─────────────────────────┘
```

### Delete Flow

```
┌─────────────────┐
│ User deletes    │
│ Roadmap Item    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ roadmapService.deleteRoadmapItem│
│ 1. Archive Task Flow task       │
│ 2. Delete roadmap_items entry   │
│ 3. Clean up Mind Mesh links     │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ archiveTaskFlowTaskForRoadmapItem│
│ 1. Find linked task              │
│ 2. Set archived = true           │
│ 3. Preserve task for history     │
└──────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Task Flow task archived │
│ Link preserved          │
└─────────────────────────┘
```

## UI Integration

### Roadmap Item Drawer

**Location:** `src/components/guardrails/roadmap/ItemDrawer.tsx`

**Feature:** Read-only Task Flow sync status badge

When a Roadmap Item is linked to Task Flow, the drawer displays:

```
┌────────────────────────────────────────┐
│ 🔵 Linked to Task Flow                 │
│ This item is synced to Task Flow       │
│ for execution tracking                 │
│                                        │
│ Status: in progress                    │
└────────────────────────────────────────┘
```

**Behavior:**
- Badge only appears for eligible types (`task`, `habit`, `goal`)
- Shows current Task Flow status (read-only)
- Does not support editing from this view
- Auto-updates when drawer reopens

**No Editing:** Task Flow status changes must occur in the Roadmap or Task Flow view to maintain single source of truth.

## Permissions & Security

### RLS Policies

Task Flow inherits project permissions:

**SELECT:** Users can view tasks in projects they have access to
```sql
EXISTS (
  SELECT 1 FROM project_users
  WHERE project_users.master_project_id = taskflow_tasks.master_project_id
  AND project_users.user_id = auth.uid()
)
```

**INSERT/UPDATE/DELETE:** Users need `editor` or `owner` role
```sql
EXISTS (
  SELECT 1 FROM project_users
  WHERE project_users.master_project_id = taskflow_tasks.master_project_id
  AND project_users.user_id = auth.uid()
  AND project_users.role IN ('editor', 'owner')
)
```

### Permission Model

- No new permission system introduced
- Reuses existing `project_users` and role-based access
- Task Flow respects project membership implicitly

## Validation & Safety

### Duplicate Prevention

- `UNIQUE INDEX` on `roadmap_item_id` prevents duplicate Task Flow tasks
- Service checks for existing tasks before creation
- Update operation used when task already exists

### Backward Compatibility

- Task Flow tasks can exist without `roadmap_item_id` (standalone tasks)
- Existing Task Flow UI continues to work
- No breaking changes to current Task Flow usage
- Legacy tasks gracefully handled

### Error Handling

```typescript
interface TaskFlowSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'archived' | 'skipped' | 'error';
  reason?: string;
}
```

**Common Results:**
- `skipped`: Item type not eligible (e.g., milestone, note)
- `created`: New Task Flow task created successfully
- `updated`: Existing Task Flow task updated
- `archived`: Task archived due to deletion
- `error`: Sync failed with reason

### Missing/Legacy Items

- Service handles missing roadmap items gracefully
- NULL `roadmap_item_id` indicates standalone task
- Archived tasks remain queryable for history

## Integration Points

### Compatible Systems

✅ **People & Assignments:** Task Flow tasks can be assigned to project people
✅ **Deadlines & Extensions:** Roadmap deadline metadata can be referenced
✅ **Permissions:** Inherits project user permissions
✅ **Personal Bridge:** Task Flow tasks can be synced to Personal Spaces (future)

### Independent Systems

- Task Flow sync is independent of Mind Mesh connections
- Does not interfere with Track/Subtrack hierarchy
- Separate from Focus Mode and Regulation Engine

## Future Extensions (NOT IMPLEMENTED)

The following are explicitly NOT part of this initial implementation but are documented for future consideration:

### Bi-Directional Sync (NOT IMPLEMENTED)

Potential future: Task Flow status changes could sync back to Roadmap
- Would require conflict resolution strategy
- Must maintain Roadmap as primary source of truth
- Needs comprehensive testing and rollback strategy

### Automation (NOT IMPLEMENTED)

Potential future: Auto-create Roadmap Items from Task Flow
- Currently out of scope
- Would change fundamental source-of-truth model
- Requires architecture review

### Notifications (NOT IMPLEMENTED)

Potential future: Notify users when sync occurs
- Email/in-app notifications when tasks sync
- Alerts for sync failures or conflicts
- Not part of initial MVP

### Task Flow UI Redesign (NOT IMPLEMENTED)

Current UI is not being modified except for minimal drawer badge
- Full Task Flow redesign is separate initiative
- Kanban board remains unchanged
- Task editing stays in existing views

## Testing Strategy

### Service Layer Tests

```typescript
// Test eligible types create tasks
const taskItem = { type: 'task', ... };
const result = await syncRoadmapItemToTaskFlow(taskItem);
expect(result.action).toBe('created');

// Test ineligible types skip
const noteItem = { type: 'note', ... };
const result = await syncRoadmapItemToTaskFlow(noteItem);
expect(result.action).toBe('skipped');

// Test updates sync correctly
await updateRoadmapItem(itemId, { status: 'in_progress' });
const taskFlowTask = await getTaskFlowTaskForRoadmapItem(itemId);
expect(taskFlowTask.status).toBe('in_progress');

// Test deletion archives task
await deleteRoadmapItem(itemId);
const taskFlowTask = await getTaskFlowTaskForRoadmapItem(itemId);
expect(taskFlowTask.archived).toBe(true);
```

### Integration Tests

- Create eligible Roadmap Item → verify Task Flow task created
- Update Roadmap Item title → verify Task Flow task title synced
- Delete Roadmap Item → verify Task Flow task archived
- Create ineligible Roadmap Item → verify no Task Flow task
- Backward compatibility: existing Task Flow continues working

## Success Criteria

✅ **One-way sync only** (Roadmap → Task Flow)
✅ **Roadmap remains authoritative** (no reverse sync)
✅ **No UI redesign** (minimal drawer badge only)
✅ **No automation or notifications** (future work)
✅ **Build passes with zero errors**
✅ **Compatible with People, Deadlines, Permissions, Personal Bridge**
✅ **Backward compatible** (existing Task Flow unaffected)

## File Reference

### Database
- `supabase/migrations/20251212_create_taskflow_system_with_roadmap_sync.sql`

### Types
- `src/lib/guardrails/taskFlowTypes.ts`

### Services
- `src/lib/guardrails/taskFlowSyncService.ts`
- `src/lib/guardrails/roadmapService.ts` (integration hooks)

### UI Components
- `src/components/guardrails/roadmap/ItemDrawer.tsx` (sync status badge)

### Documentation
- `TASKFLOW_ROADMAP_SYNC.md` (this file)

## Summary

This implementation establishes Task Flow as a derived execution view of Roadmap Items through a robust one-way sync architecture. The system:

- Automatically creates Task Flow tasks for eligible Roadmap Items
- Keeps Task Flow in sync with Roadmap updates
- Preserves historical data through archival on deletion
- Maintains backward compatibility with existing systems
- Provides minimal, non-intrusive UI feedback
- Enforces security through existing permission model
- Lays foundation for future bi-directional sync (if needed)

**Core Principle:** Roadmap is the source of truth. Task Flow is the execution view.
