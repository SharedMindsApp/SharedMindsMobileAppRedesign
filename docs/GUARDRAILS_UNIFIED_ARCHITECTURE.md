# Guardrails Unified Architecture (Authoritative)

## Overview

This document describes the Guardrails project management architecture, which provides structured project organization through projects, tracks, subtracks, roadmap items, and a Mind Mesh knowledge graph. The system supports both single-project tracks and shared tracks that can be linked across multiple projects, with calendar sync integration and execution-focused task flow views.

**Last Updated:** January 2026

## ⚠️ Important: Phase 0 Architectural Lock-In

**Before reading this document, please review:** [GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md](./GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md)

This architecture document describes the **current implementation state**, which includes accepted architectural debt. The Phase 0 lock-in document establishes the **target mental model** for a future refactor:

- **Current State (This Document)**: Domain entities are stored in `roadmap_items` table
- **Target State (Phase 0 Document)**: Roadmap is a projection layer; domain entities exist independently
- **Phase 0 Status**: Documentation and rules established; no schema changes yet

**Key Distinction:**
- This document describes "how it works now"
- The Phase 0 document describes "how it should work" and "how it will work after Phase 1"

All contributors must understand both documents before making architectural decisions.

## Core Principles

1. **Tracks are Organizational Units** - Tracks organize work within projects and can be shared across projects
2. **Shared Track Model** - Single track definition with multiple project instances for flexible cross-project workflows
3. **Authority-Based Editing** - Configurable edit permissions (shared_editing or primary_project_only)
4. **Per-Project Configuration** - Each project controls visibility, roadmap inclusion, and ordering independently
5. **Mind Mesh Integration** - All entities (tracks, items, widgets) connect through a knowledge graph
6. **ADC Stays Focused** - Active Data Context manages only Active Master Project and Active Track, nothing more

## Architecture Layers

### Layer 0: Master Projects (Top-Level Container)

Master projects are the top-level organizational unit in Guardrails:
- Contain tracks, subtracks, roadmap items, and widgets
- Support multi-user collaboration with roles (owner, editor, viewer)
- Can be linked to domains for categorization
- Independent permission boundaries

**Database Table:** `master_projects`

### Layer 1: Track Definition (Authoritative Content)

The track definition owns the core content and structure:
- Name, description, color
- Start and end dates
- Sharing configuration (is_shared, authority_mode, primary_owner)
- Contains subtracks for additional granularity

**Database Table:** `guardrails_tracks`

### Layer 2: Project Instances (Contextual Configuration)

For shared tracks, project instances define project-specific configuration:
- `include_in_roadmap` - Whether track appears in project's timeline
- `visibility_state` - visible, hidden, collapsed, or archived
- `order_index` - Position in project's track list
- `is_primary` - Whether this is the primary owner project
- `instance_metadata` - Project-specific overrides

**Database Table:** `track_project_instances`

### Layer 3: Subtracks (Organizational Refinement)

Subtracks provide additional organization within tracks:
- Break down tracks into more granular work streams
- Each track can have multiple subtracks
- Roadmap items, focus sessions, and side ideas can be assigned to subtracks
- Optional layer (items work without subtracks)

**Database Table:** `guardrails_subtracks`

### Layer 4: Roadmap Items (Time-Bound Work)

Roadmap items represent actual work with dates and status:
- Multiple types: task, event, milestone, goal, habit, note, document, photo, etc.
- Type-specific metadata stored in JSONB column
- Composable hierarchy (items can contain sub-items)
- Deadline tracking with extension support
- Assignment to people
- Can be linked to tracks and optionally to subtracks

**Database Table:** `roadmap_items`

### Layer 5: Mind Mesh (Knowledge Graph)

Connects all entities in a flexible graph structure:
- Widgets (content nodes: text, doc, image, link)
- Connections (typed edges: expands, inspires, depends_on, references, etc.)
- Auto-generated connections for track hierarchy and roadmap linkage

**Database Tables:** `mindmesh_widgets`, `mindmesh_connections`

### Layer 6: Execution Views (Derived Systems)

Derived views provide specialized interfaces for work execution:

#### Task Flow (Kanban View)
- Execution-focused view of roadmap items
- Syncs task, habit, and goal types from roadmap
- Roadmap remains source of truth
- Provides Kanban board interface

**Database Table:** `taskflow_tasks`

#### Calendar Sync
- Roadmap events and tasks can be synced to calendar
- User-initiated sync mappings at project, track, or subtrack level
- Source attribution for calendar events
- Bidirectional updates possible

**Database Tables:** `calendar_guardrails_sync`, `calendar_events` (with source attribution)

## Domain Model

### Track (Definition)

```typescript
interface Track {
  id: string;
  masterProjectId: string;          // Legacy single-project support
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;
  isDefault: boolean;

  // Shared tracks support
  isShared: boolean;
  primaryOwnerProjectId: string | null;
  authorityMode: 'shared_editing' | 'primary_project_only';

  start_date: string | null;
  end_date: string | null;

  createdAt: string;
  updatedAt: string;
}
```

**Key Fields:**
- `isShared`: If false, track uses legacy single-project mode; if true, uses track_project_instances
- `primaryOwnerProjectId`: For shared tracks, the project with primary authority
- `authorityMode`: Controls who can edit track content (see Authority & Edit Model)

### Track Project Instance

```typescript
interface TrackProjectInstance {
  id: string;
  trackId: string;
  masterProjectId: string;
  includeInRoadmap: boolean;
  visibilityState: 'visible' | 'hidden' | 'collapsed' | 'archived';
  orderIndex: number;
  isPrimary: boolean;
  instanceMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Links shared tracks to projects with per-project configuration

**Key Constraint:** One instance per (trackId, masterProjectId) pair

### Roadmap Item

```typescript
interface RoadmapItem {
  id: string;
  masterProjectId: string;
  trackId: string;
  type: RoadmapItemType;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  status: RoadmapItemStatus;
  parentItemId?: string | null;
  itemDepth: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

**Roadmap Item Types:**
- `task` - Completable work items
- `event` - Date-specific events
- `milestone` - Key project milestones
- `goal` - Long-term objectives
- `note` - Reference notes
- `document` - Document references
- `photo` - Image attachments
- `grocery_list` - Household lists
- `habit` - Recurring activities
- `review` - Retrospective items

**Type-Specific Metadata:**
- The `metadata` JSONB column stores type-specific data
- Each item type can have custom fields and validation
- Examples: recurring patterns for habits, checklist items for grocery lists, etc.

**Item Composition:**
- Items can contain sub-items via `parentItemId`
- Unlimited nesting depth (tracked via `itemDepth`)
- Auto-calculated hierarchy with validation

**Subtrack Assignment:**
- Roadmap items can optionally be assigned to a subtrack
- `subtrack_id` column references `guardrails_subtracks`
- Items remain assigned to parent track even without subtrack
- ON DELETE SET NULL: items preserved when subtrack deleted

### People & Assignments

#### Global Person (Identity Layer)

```typescript
interface GlobalPerson {
  id: string;
  name: string;
  email?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Canonical identity across all projects (NOT system users)

#### Project Person (Membership Layer)

```typescript
interface Person {
  id: string;
  masterProjectId: string;
  globalPersonId: string;
  name: string;         // denormalized
  email?: string;       // denormalized
  role?: string;        // project-specific (semantic only)
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Project membership with roles (roles are informational, not permission-based)

#### Assignment

```typescript
interface RoadmapItemAssignment {
  id: string;
  roadmapItemId: string;
  personId: string;  // references project_people
  assignedAt: string;
}
```

**Purpose:** Link people to roadmap items (many-to-many)

### Subtracks (Optional Organization Layer)

```typescript
interface SubTrack {
  id: string;
  trackId: string;
  name: string;
  description?: string;
  orderingIndex: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Additional organizational layer within tracks

**Key Features:**
- Each track can have multiple subtracks
- Subtracks are ordered within their parent track
- Roadmap items, side ideas, and focus sessions can reference subtracks
- Optional: items work without subtrack assignment
- ON DELETE CASCADE: subtracks deleted when parent track is deleted
- ON DELETE SET NULL: items preserved when subtrack is deleted

**Use Cases:**
- Breaking down large tracks into work streams
- Team-based organization within tracks
- Phase-based organization (e.g., "Planning", "Development", "Testing")
- Component-based organization (e.g., "API", "Database", "Frontend")

### Task Flow Tasks (Execution View)

```typescript
interface TaskFlowTask {
  id: string;
  roadmapItemId?: string;  // nullable - can exist independently
  masterProjectId: string;
  title: string;
  description?: string;
  status: RoadmapItemStatus;
  archived: boolean;
  syncedAt?: string;  // last sync from roadmap
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Derived execution view for actionable work items

**Key Features:**
- One-way sync from roadmap to task flow (roadmap is source of truth)
- Only syncs task, habit, and goal types
- Provides Kanban-style interface for execution
- Can have standalone tasks (without roadmap linkage)
- Unique constraint: one task per roadmap item

**Sync Behavior:**
- Roadmap changes flow to task flow automatically
- Task flow is a filtered, execution-focused view
- Tasks can be created directly in task flow (no roadmap link)
- Bidirectional sync possible but roadmap remains authoritative

### Calendar Sync Integration

```typescript
interface CalendarGuardrailsSync {
  id: string;
  masterProjectId: string;
  userId: string;
  syncLevel: 'project' | 'track' | 'subtrack' | 'item';
  trackId?: string;
  subtrackId?: string;
  roadmapItemId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** User-initiated mappings from Guardrails entities to calendar

**Sync Levels:**
1. **Project Level**: Sync all events from a project
2. **Track Level**: Sync all events from a specific track
3. **Subtrack Level**: Sync all events from a specific subtrack
4. **Item Level**: Sync a specific roadmap item

**Calendar Event Attribution:**
Calendar events synced from Guardrails have source attribution:
- `source_type`: 'guardrails_project', 'guardrails_track', etc.
- `source_entity_id`: ID of the source roadmap item
- `source_project_id`: Master project ID
- `source_track_id`: Track ID (if applicable)

**Benefits:**
- Users control what appears in their personal calendar
- Multiple granularity levels for flexible syncing
- Clear source attribution enables bidirectional updates
- Each user can configure their own sync preferences

### Mind Mesh Components

#### Widget (Content Node)

```typescript
interface MindMeshWidget {
  id: string;
  masterProjectId: string;
  type: 'text' | 'doc' | 'image' | 'link';
  title: string;
  content: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Connection (Graph Edge)

```typescript
interface MindMeshConnection {
  id: string;
  masterProjectId: string;
  sourceType: 'track' | 'roadmap_item' | 'widget';
  sourceId: string;
  targetType: 'track' | 'roadmap_item' | 'widget';
  targetId: string;
  relationship: 'expands' | 'inspires' | 'depends_on' | 'references' | 'hierarchy' | 'offshoot' | 'composition';
  autoGenerated: boolean;
  createdAt: string;
}
```

**Auto-Generated Connections:**
- Track → Roadmap Item (references)
- Parent Item → Child Item (composition)
- Track → Widget (user-created)

## Authority & Edit Model

### Authority Modes

#### `shared_editing` Mode

**Who Can Edit:** Any linked project can edit track content
**Use Case:** Collaborative teams working on shared work streams
**Example:** Production team track shared between director and producer projects

#### `primary_project_only` Mode

**Who Can Edit:** Only the primary owner project can edit track content
**Use Case:** Read-only reference tracks or controlled content distribution
**Example:** Executive strategy track viewable by multiple departments but editable only by executives

**Default:** `primary_project_only`

### Edit Permission Logic

**Content Changes (require authority):**
- Track name, description, color, dates
- Creating/editing/deleting roadmap items
- Creating/editing/deleting sub-items

**Instance Changes (require project membership only):**
- Setting `include_in_roadmap`
- Changing `visibility_state`
- Adjusting `order_index`
- Updating `instance_metadata`

### Permission Check

```typescript
function canEditTrackContent(track: Track, projectId: string, isLinkedProject: boolean): boolean {
  // Legacy single-project track
  if (!track.isShared) {
    return track.masterProjectId === projectId;
  }

  // Must be linked to track
  if (!isLinkedProject) {
    return false;
  }

  // Shared editing mode
  if (track.authorityMode === 'shared_editing') {
    return true;
  }

  // Primary project only mode
  return track.primaryOwnerProjectId === projectId;
}
```

## Core Services

### Track Service (`trackService.ts`)

Manages track creation, updates, and queries.

**Key Functions:**
- `createTrack(input)` - Create new track
- `updateTrack(id, input)` - Update track with validation
- `getTracksByProject(projectId)` - Get all tracks for a project
- `deleteTrack(id)` - Delete track

### Shared Track Service (`sharedTrackService.ts`)

Manages shared tracks and cross-project linking.

**Key Functions:**
- `convertTrackToShared(input)` - Convert single-project track to shared
- `linkTrackToProject(input)` - Link shared track to another project
- `unlinkTrackFromProject(input)` - Remove track from project
- `updateTrackInstance(trackId, projectId, input)` - Update project-specific configuration
- `transferPrimaryOwnership(trackId, newProjectId)` - Transfer primary ownership
- `changeTrackAuthorityMode(trackId, mode)` - Change edit authority mode
- `checkTrackEditPermission(trackId, projectId)` - Check edit permissions
- `getTracksForProject(projectId, includeInstances)` - Get tracks with instance data
- `getTrackProjects(trackId)` - Get all projects linked to a track

### Roadmap Service (`roadmapService.ts`)

Manages roadmap items and their composition hierarchy.

**Key Functions:**
- `createRoadmapItem(input)` - Create item
- `updateRoadmapItem(id, input)` - Update item
- `getRoadmapItemsByProject(projectId)` - Get all items for project
- `getRoadmapItemsByTrack(trackId)` - Get items for specific track
- `getRoadmapItemsBySubtrack(subtrackId)` - Get items for specific subtrack
- `attachChildItem(childId, parentId)` - Create parent-child relationship
- `detachChildItem(childId)` - Remove from parent
- `getRoadmapItemTree(projectId)` - Get hierarchical tree structure

### Subtrack Service (`subtracks.ts`)

Manages subtracks within tracks.

**Key Functions:**
- `getSubTracksForTrack(trackId)` - Get all subtracks for a track
- `getSubTrackById(id)` - Get single subtrack
- `createSubTrack(input)` - Create new subtrack
- `updateSubTrack(id, input)` - Update subtrack properties
- `deleteSubTrack(id)` - Delete subtrack (items preserved)
- `reorderSubTracks(trackId, orderedIds)` - Reorder subtracks within track
- `moveItemToSubTrack(itemId, subtrackId, itemType)` - Assign item to subtrack
- `bulkAssignItemsToSubTrack(itemIds, subtrackId, itemType)` - Bulk assignment
- `getSubTrackStats(subtrackId)` - Get statistics and progress
- `getAllSubTracksForProject(projectId)` - Get all subtracks in a project

### Task Flow Service (`taskFlowService.ts`)

Manages the execution-focused task flow view.

**Key Functions:**
- `createTaskFlowTask(input)` - Create standalone task
- `syncRoadmapItemToTaskFlow(roadmapItemId)` - Sync single item from roadmap
- `bulkSyncRoadmapItems(projectId)` - Sync all eligible items from roadmap
- `updateTaskFlowTask(id, input)` - Update task
- `getTaskFlowTasksByProject(projectId)` - Get all tasks for project
- `archiveTask(id)` - Archive completed task
- `deleteTask(id)` - Delete task

### Calendar Sync Service (`calendarSyncService.ts`)

Manages Guardrails-to-calendar synchronization.

**Key Functions:**
- `createCalendarSync(input)` - Create new sync mapping
- `updateCalendarSync(id, input)` - Update sync configuration
- `deleteCalendarSync(id)` - Remove sync mapping
- `getUserCalendarSyncs(userId)` - Get all syncs for user
- `getProjectCalendarSyncs(projectId)` - Get all syncs for project
- `syncGuardrailsToCalendar(syncId)` - Execute sync operation
- `bulkSyncAllActive(userId)` - Sync all active mappings for user

### Mind Mesh Service (`mindMeshService.ts`)

Manages widgets and connections for the knowledge graph.

**Key Functions:**
- `createWidget(input)` - Create content node
- `updateWidget(id, input)` - Update widget
- `getWidgetsByProject(projectId)` - Get all widgets
- `createConnection(input)` - Create graph edge
- `getConnectionsForNode(type, id)` - Get all connections for a node
- `getMindMeshGraph(projectId)` - Get complete graph structure

### People Services

#### Global People Service (`globalPeopleService.ts`)

Manages canonical person identities.

**Key Functions:**
- `createGlobalPerson(input)` - Create identity
- `updateGlobalPerson(id, input)` - Update identity
- `findGlobalPersonByEmail(email)` - Find by email
- `findOrCreateGlobalPerson(name, email)` - Deduplication helper
- `getGlobalPersonWithProjects(id)` - Get person with memberships

#### People Service (`peopleService.ts`)

Manages project membership with automatic global identity linking.

**Key Functions:**
- `createPerson(input)` - Create membership (auto-links to global_person)
- `updatePerson(id, input)` - Update membership and sync with global_person
- `getPeopleByProject(projectId)` - Get project members
- `getPersonWithGlobalIdentity(id)` - Get enriched person data

#### Assignment Service (`assignmentService.ts`)

Manages roadmap item assignments.

**Key Functions:**
- `assignPerson(roadmapItemId, personId)` - Create assignment
- `unassignPerson(roadmapItemId, personId)` - Remove assignment
- `getAssignedPeople(roadmapItemId)` - Get people assigned to item
- `getAssignedRoadmapItemsForPerson(personId)` - Get items assigned to person

## Integration Points

### Task Flow Sync

Roadmap items of type `task`, `habit`, and `goal` can be synced to Task Flow (Kanban board) for execution-focused work management. Task Flow operates within a single project scope; shared tracks don't create cross-project Task Flow coupling.

**Key Points:**
- One-way sync: Roadmap → Task Flow (roadmap is source of truth)
- Automatic sync on roadmap item creation/update
- Tasks can also be created directly in Task Flow without roadmap linkage
- Unique constraint prevents duplicate tasks per roadmap item

**Service:** `taskFlowService.ts`

### Calendar Sync

Users can configure sync mappings from Guardrails entities (projects, tracks, subtracks, items) to their personal calendar. Events and tasks from roadmap appear in the calendar with source attribution.

**Key Points:**
- User-initiated sync at multiple granularity levels
- Source attribution enables bidirectional updates
- Each user controls their own sync preferences
- Active/inactive toggle for temporary sync control

**Services:** `calendarSyncService.ts`, `calendarGuardrailsSyncService.ts`

### Personal Spaces Bridge

Roadmap items can be linked to personal spaces (calendar, tasks, goals, etc.) based on item type eligibility. Personal space links are user-specific and don't leak across projects.

**Key Points:**
- Type-based eligibility (e.g., goals can link to personal goals)
- User-specific bridging preserves privacy
- No cross-project data leakage
- Optional feature per user

**Service:** `personalBridgeService.ts`

### Project Users & Permissions

Projects can have multiple users with roles (owner, editor, viewer). Permissions control who can view and edit project content.

**Key Points:**
- Role-based access control (owner, editor, viewer)
- Project-scoped permissions
- Can transfer ownership between users
- RLS enforced at database level

**Service:** `projectUserService.ts`

## Usage Examples

### Creating a Single-Project Track

```typescript
import { createTrack } from '@/lib/guardrails';

const track = await createTrack({
  masterProjectId: projectId,
  name: 'MVP Development',
  description: 'Core product features',
  color: '#3B82F6',
});
```

### Converting Track to Shared

```typescript
import { convertTrackToShared } from '@/lib/guardrails';

const result = await convertTrackToShared({
  trackId: track.id,
  authorityMode: 'primary_project_only',
});
```

### Linking Shared Track to Another Project

```typescript
import { linkTrackToProject } from '@/lib/guardrails';

const result = await linkTrackToProject({
  trackId: track.id,
  projectId: anotherProjectId,
  includeInRoadmap: true,
  visibilityState: 'visible',
});
```

### Configuring Track Instance

```typescript
import { updateTrackInstance } from '@/lib/guardrails';

// Hide track from roadmap in this project only
await updateTrackInstance(trackId, projectId, {
  includeInRoadmap: false,
  visibilityState: 'hidden',
});
```

### Creating Roadmap Item

```typescript
import { createRoadmapItem } from '@/lib/guardrails';

const item = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'task',
  title: 'Implement login flow',
  startDate: '2024-01-01',
  endDate: '2024-01-15',
  status: 'not_started',
});
```

### Creating Item Hierarchy

```typescript
import { createRoadmapItem, attachChildItem } from '@/lib/guardrails';

// Create parent milestone
const milestone = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'milestone',
  title: 'Launch MVP',
  endDate: '2024-03-01',
});

// Create sub-task
const subtask = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'task',
  title: 'Deploy to production',
  parentItemId: milestone.id,
});
```

### Assigning People to Items

```typescript
import { assignPerson, createPerson } from '@/lib/guardrails';

// Create person (auto-links to global identity)
const person = await createPerson({
  masterProjectId: projectId,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'Developer',
});

// Assign to item
await assignPerson(roadmapItemId, person.id);
```

### Working with Subtracks

```typescript
import { createSubTrack, getSubTracksForTrack, moveItemToSubTrack } from '@/lib/guardrails';

// Create subtracks for organization
const apiSubtrack = await createSubTrack({
  track_id: trackId,
  name: 'API Development',
  description: 'RESTful API endpoints and services',
});

const dbSubtrack = await createSubTrack({
  track_id: trackId,
  name: 'Database Schema',
  description: 'Schema design and migrations',
});

// Get all subtracks for a track
const subtracks = await getSubTracksForTrack(trackId);

// Assign roadmap item to subtrack
await moveItemToSubTrack(roadmapItemId, apiSubtrack.id, 'roadmap');
```

### Syncing to Task Flow

```typescript
import { syncRoadmapItemToTaskFlow, getTaskFlowTasksByProject } from '@/lib/guardrails';

// Sync a roadmap item to task flow
const taskFlowTask = await syncRoadmapItemToTaskFlow(roadmapItemId);

// Get all task flow tasks for execution view
const tasks = await getTaskFlowTasksByProject(projectId);
```

### Configuring Calendar Sync

```typescript
import { createCalendarSync, syncGuardrailsToCalendar } from '@/lib/guardrails';

// Sync entire project to calendar
const projectSync = await createCalendarSync({
  masterProjectId: projectId,
  userId: userId,
  syncLevel: 'project',
  isActive: true,
});

// Sync specific track to calendar
const trackSync = await createCalendarSync({
  masterProjectId: projectId,
  userId: userId,
  syncLevel: 'track',
  trackId: trackId,
  isActive: true,
});

// Execute sync operation
await syncGuardrailsToCalendar(projectSync.id);
```

### Checking Edit Permission

```typescript
import { checkTrackEditPermission } from '@/lib/guardrails';

const permission = await checkTrackEditPermission(trackId, projectId);

if (permission.canEdit) {
  // Allow edit UI
} else {
  console.log('Cannot edit:', permission.reason);
}
```

## How Tasks and Events Are Stored in Guardrails

> **⚠️ Architectural Debt Note**: This section describes the **current implementation state**. The Phase 0 architectural lock-in document establishes that `roadmap_items` should be a projection layer referencing domain entities, not storing them. This is accepted debt until Phase 1. See [GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md](./GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md) Section 6 for details.

### Roadmap Items (Current Implementation - Primary Storage)

**Current State:** All Guardrails tasks and events are stored in the **`roadmap_items`** table, regardless of whether they belong to a track, subtrack, or are standalone items.

**Future State (Phase 1):** Domain entities will exist in dedicated tables (`guardrails_tasks`, `guardrails_events`, etc.), and `roadmap_items` will reference them by ID only. See Phase 0 document for architectural rules.

**Key Columns:**
- `id` - Unique identifier
- `master_project_id` - Project the item belongs to (required)
- `track_id` - Track the item belongs to (required)
- `subtrack_id` - Optional subtrack assignment (nullable)
- `type` - Item type: 'task', 'event', 'milestone', 'goal', 'habit', etc.
- `title` - Item title
- `description` - Optional description
- `start_date` - Start date (nullable, required for events)
- `end_date` - End date/deadline (nullable)
- `status` - Status enum: 'not_started', 'in_progress', 'completed', 'blocked', etc.
- `metadata` - JSONB column for type-specific data
- `parent_item_id` - For hierarchical sub-items (nullable)
- `item_depth` - Nesting depth in hierarchy

### Task Flow Tasks (Derived Storage)

Tasks that need execution focus can be synced to the **`taskflow_tasks`** table, which provides a Kanban-style view.

**Key Columns:**
- `id` - Unique identifier
- `roadmap_item_id` - Link back to source roadmap item (nullable)
- `master_project_id` - Project the task belongs to (required)
- `title` - Task title
- `description` - Optional description
- `status` - Status enum (same as roadmap)
- `synced_at` - Last sync timestamp from roadmap
- `archived` - Whether task is archived

**Sync Behavior:**
- Only `task`, `habit`, and `goal` types sync from roadmap to task flow
- Roadmap remains the source of truth
- One-way sync: changes in roadmap flow to task flow
- Tasks can also be created directly in task flow without roadmap linkage
- Unique constraint: one task per roadmap item

### Adding Events to a Project

When a user adds an event to a Guardrails project:

1. **Create a roadmap item** with `type = 'event'`
2. **Assign to a track** via `track_id` (required)
3. **Optionally assign to a subtrack** via `subtrack_id`
4. **Set date fields**: `start_date` and optionally `end_date`
5. **Set metadata**: Store event-specific data in the `metadata` JSONB column
6. **Optionally sync to calendar**: User can configure calendar sync at project/track/subtrack level

**Example:**
```typescript
const event = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: trackId,
  subtrackId: subtrackId, // optional
  type: 'event',
  title: 'Product Launch',
  startDate: '2026-03-15',
  endDate: '2026-03-15',
  status: 'not_started',
  metadata: {
    location: 'Convention Center',
    attendees: ['team@example.com'],
  },
});
```

### Adding Tasks to a Project for Tracks/Subtracks

When a user adds a task to a Guardrails project:

1. **Create a roadmap item** with `type = 'task'`
2. **Assign to a track** via `track_id` (required)
3. **Optionally assign to a subtrack** via `subtrack_id`
4. **Set deadline** via `end_date` (optional)
5. **Set status**: 'not_started', 'in_progress', 'completed', etc.
6. **Optionally sync to task flow**: Task automatically syncs to taskflow_tasks for Kanban view

**Example:**
```typescript
const task = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: trackId,
  subtrackId: dbSubtrack.id, // optional
  type: 'task',
  title: 'Create users table migration',
  description: 'Define schema for users table',
  endDate: '2026-02-01',
  status: 'not_started',
});

// Task automatically syncs to task flow if configured
```

### Task Hierarchy and Sub-tasks

Tasks can contain sub-tasks via the `parent_item_id` field:

```typescript
// Create parent task
const parentTask = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: trackId,
  type: 'task',
  title: 'Implement authentication system',
});

// Create sub-task
const subtask = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: trackId,
  type: 'task',
  title: 'Set up JWT token generation',
  parentItemId: parentTask.id, // links to parent
});
```

### Key Rules

1. **All items require a project and track** - `master_project_id` and `track_id` are required
2. **Subtracks are optional** - Items work without subtrack assignment
3. **Task Flow is derived** - Roadmap is always the source of truth
4. **Type determines sync behavior** - Only tasks/habits/goals sync to task flow
5. **Calendar sync is user-controlled** - Users configure what syncs to their calendar
6. **Hierarchy is flexible** - Items can nest unlimited levels deep

## ADC Responsibilities (Confirmed)

ADC (Active Data Context) is responsible ONLY for:
- Active Master Project
- Active Track (current track in focus)

ADC must NEVER:
- Filter tracks by visibility
- Infer hierarchy
- Handle sharing logic
- Manage track state transitions
- Apply instance configuration

All domain logic belongs in the services. ADC is purely for tracking user focus.

## Database Schema

### Core Tables

1. **master_projects** - Project definitions (top-level container)
2. **domains** - Project domains (categories)
3. **guardrails_tracks** - Track definitions
4. **guardrails_subtracks** - Subtrack definitions within tracks
5. **track_project_instances** - Project-specific track configuration (for shared tracks)
6. **roadmap_items** - Time-bound work items
7. **roadmap_item_assignments** - People assigned to items
8. **taskflow_tasks** - Execution-focused task view (derived from roadmap)
9. **calendar_guardrails_sync** - User sync mappings from Guardrails to calendar
10. **mindmesh_widgets** - Content nodes
11. **mindmesh_connections** - Graph edges
12. **global_people** - Canonical person identities
13. **project_people** - Project membership
14. **project_users** - Project collaboration with roles

### Helper Functions (Postgres)

1. **`get_track_projects(track_id)`** - Get all projects linked to a track
2. **`get_project_tracks(project_id)`** - Get all tracks accessible in a project
3. **`can_edit_track(track_id, project_id)`** - Check edit permission

## Validation Rules

### Track Linking

- Track must be shared (`is_shared = true`)
- Project cannot already be linked
- Maximum 50 linked projects per track

### Track Unlinking

- Project must be linked
- Cannot unlink primary owner if other projects are linked
- Must transfer primary ownership first if needed

### Roadmap Items

- Must reference a valid track
- Type-specific validation (e.g., events require dates)
- Parent-child relationships validated for cycles
- Max depth enforced via composition rules

### Authority

- Edit permission checked before all content mutations
- Instance updates don't require authority check
- Primary owner transfer requires new owner to be linked

## Backward Compatibility

All existing tracks automatically have:
- `isShared = false` (legacy single-project mode)
- `primaryOwnerProjectId = null`
- `authorityMode = 'primary_project_only'`

Legacy queries remain functional:
```sql
SELECT * FROM guardrails_tracks WHERE master_project_id = $1;
```

For new code, use service functions:
```typescript
const tracks = await getTracksForProject(projectId);
```

## What is NOT Implemented

### No UI

This is architecture only. No UI components have been created for:
- Track linking interface
- Instance configuration controls
- Authority mode selector
- Primary owner transfer UI
- Permission indicators

### No Real-Time Sync

- No WebSocket updates
- No optimistic UI updates
- No conflict resolution UI

### No Forking or Branching

- Cannot fork shared track into independent copy
- Cannot create branches with merge-back
- No copy-on-write

### No Automated Workflows

- No auto-link suggestions
- No automated authority transfers
- No change notifications

## Benefits

1. **Single Source of Truth** - One track, many contexts
2. **Flexible Authority** - Configurable edit permissions
3. **Per-Project Control** - Each project configures visibility independently
4. **Backward Compatible** - Legacy tracks unchanged
5. **Mind Mesh Native** - All entities connect through graph
6. **Composable Items** - Unlimited item hierarchy depth
7. **People First** - Global identity with project membership
8. **Type Safe** - Full TypeScript type coverage

## Next Steps for UI Implementation

When building UI components:

1. **Import services from `@/lib/guardrails`** - Use centralized service functions
2. **Check `track.isShared`** - Show/hide sharing features based on flag
3. **Use `checkTrackEditPermission()`** - Disable edit UI when not authorized
4. **Display instance configuration** - Show per-project settings clearly
5. **Let services handle validation** - Display error messages from services
6. **Respect ADC boundaries** - Don't add domain logic to Active Data Context

The architecture is solid. UI implementation can proceed with confidence that the underlying data model prevents corruption, maintains referential integrity, and provides clear authority semantics.

---

**Document Status:** Up to date as of January 2026

**Recent Updates:**
- Added subtracks layer for organizational refinement
- Added task flow system for execution-focused Kanban view
- Added calendar sync integration with source attribution
- Clarified how tasks and events are stored in roadmap_items
- Updated service layer documentation with new services
- Expanded usage examples for all new features

**Related Documents:**
- **[GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md](./GUARDRAILS_PHASE0_ARCHITECTURAL_LOCKIN.md)** - **⚠️ READ FIRST** - Phase 0 architectural rules and mental model (roadmap as projection layer)
- GUARDRAILS_USERS_PERMISSIONS_ARCHITECTURE.md - Project collaboration and permissions
- GUARDRAILS_SUBTRACKS.md - Detailed subtrack system specification
- GUARDRAILS_CALENDAR_SYNC_ARCHITECTURE_ANALYSIS.md - Calendar sync implementation
- GUARDRAILS_PERSONAL_BRIDGE.md - Personal spaces integration
- AI_CHAT_MODEL.md - AI assistant integration
- DAILY_ALIGNMENT_ARCHITECTURE.md - Regulation system
- MIND_MESH_ARCHITECTURE.md - Knowledge graph details
