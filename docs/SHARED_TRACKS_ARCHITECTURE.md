# Shared Tracks & Cross-Project Linking

## Overview

Shared Tracks enable a single track definition to exist across multiple projects while maintaining Guardrails as the authoritative source. This architecture separates **track definition** (authoritative content) from **project instance** (contextual placement), enabling powerful cross-project workflows without duplication or copy-on-write complexity.

**Core Principle: One track, many contexts. Single source of truth, multiple perspectives.**

---

## Core Concept

### Track Definition (Authoritative Content)

The **Track Definition** owns the core content and structure:
- Name, description
- Subtrack hierarchy
- Roadmap items (including composable child items)
- Mind Mesh nodes and composition edges
- Authority mode and primary owner

**Location:** `guardrails_tracks_v2` table

### Project Track Instance (Contextual Placement)

The **Project Track Instance** owns project-specific configuration:
- `project_id` (which project sees this track)
- `include_in_roadmap` flag (show in this project's timeline?)
- `visibility_state` (visible, hidden, collapsed, archived)
- `order_index` (positioning in project's track list)
- `is_primary` (is this the primary owner project?)
- `instance_metadata` (local configuration overrides)

**Location:** `track_project_instances` junction table

**Critical Distinction:**
- Editing track **content** (name, items, subtracks) → requires authority permission
- Editing track **instance** (visibility, ordering) → requires project membership only

---

## Data Model

### Database Schema

#### Extended Columns in `guardrails_tracks_v2`

```sql
is_shared boolean NOT NULL DEFAULT false
primary_owner_project_id uuid REFERENCES master_projects(id) ON DELETE SET NULL
authority_mode track_authority_mode DEFAULT 'primary_project_only'
```

**Backward Compatibility:**
- Existing tracks: `is_shared = false` (legacy single-project)
- Legacy tracks use `master_project_id` directly
- No breaking changes to existing data

#### New Table: `track_project_instances`

```sql
CREATE TABLE track_project_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks_v2(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  include_in_roadmap boolean NOT NULL DEFAULT true,
  visibility_state track_instance_visibility NOT NULL DEFAULT 'visible',
  order_index integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  instance_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_track_project UNIQUE (track_id, master_project_id)
);
```

**Key Constraints:**
- One instance per track-project pair (enforced by unique constraint)
- Only one `is_primary = true` per track (enforced by trigger)
- Cascade delete: removing track removes all instances

#### Enums

```sql
CREATE TYPE track_authority_mode AS ENUM (
  'shared_editing',       -- All linked projects can edit content
  'primary_project_only'  -- Only primary owner can edit content
);

CREATE TYPE track_instance_visibility AS ENUM (
  'visible',    -- Normal visibility
  'hidden',     -- Hidden from views but data accessible
  'collapsed',  -- Collapsed in UI
  'archived'    -- Archived in this project context
);
```

### Type System

```typescript
interface Track {
  id: string;
  masterProjectId: string;  // Legacy single-project support
  name: string;
  description: string | null;
  isShared: boolean;
  primaryOwnerProjectId: string | null;
  authorityMode: TrackAuthorityMode;
  // ... other fields
}

interface TrackProjectInstance {
  id: string;
  trackId: string;
  masterProjectId: string;
  includeInRoadmap: boolean;
  visibilityState: TrackInstanceVisibility;
  orderIndex: number;
  isPrimary: boolean;
  instanceMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface TrackWithInstance extends Track {
  instance?: TrackProjectInstance;
}
```

---

## Authority & Edit Model

### Authority Modes

#### `shared_editing`

**Behavior:**
- Any linked project can edit track content (name, description, items, subtracks)
- All projects see changes immediately
- Suitable for collaborative teams working on shared work streams

**Use Case:**
```
Director's Production Track (shared_editing)
  ├─ Linked to: Pre-Production Project
  ├─ Linked to: Principal Photography Project
  └─ Linked to: Post-Production Project

All three projects can edit the track's content.
Each project controls its own visibility/ordering.
```

#### `primary_project_only`

**Behavior:**
- Only the primary owner project can edit track content
- Other projects have read-only access to content
- All projects can configure their own instance (visibility, ordering)
- Default mode for new shared tracks

**Use Case:**
```
Executive Strategy Track (primary_project_only)
  ├─ Primary: Executive Project (can edit)
  ├─ Linked: Engineering Project (read-only)
  └─ Linked: Marketing Project (read-only)

Only Executive Project can edit track content.
Engineering and Marketing can configure visibility/ordering.
```

### Edit Permission Logic

```typescript
function canEditTrackContent(
  track: Track,
  projectId: string,
  isLinkedProject: boolean
): boolean {
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
  if (track.authorityMode === 'primary_project_only') {
    return track.primaryOwnerProjectId === projectId;
  }

  return false;
}
```

**Service-Level Enforcement:**
- Validation occurs in `checkTrackEditPermission()` service function
- Database helper: `can_edit_track(track_id, project_id)` returns boolean
- No UI enforcement (architecture only)

---

## Cross-Project Linking Rules

### Rule 1: Single Definition, Multiple Instances

A track definition can be linked to multiple projects via `track_project_instances`.

**Maximum:** 50 projects per track (configurable via `MAX_LINKED_PROJECTS`)

**Example:**
```
Film Production Track (Definition)
  ├─ Instance in: Pre-Production Project
  ├─ Instance in: Principal Photography Project
  └─ Instance in: Post-Production Project
```

### Rule 2: No Private Copies

Shared tracks **never** create private copies. All projects see the same underlying content.

**Anti-Pattern (NOT implemented):**
```
❌ Copy-on-Write: Project A creates local copy when editing
❌ Forking: Project B "forks" track into independent version
❌ Branching: Project C creates branch with merge-back
```

**Correct Pattern (implemented):**
```
✅ Single Definition: All projects reference same track_id
✅ Shared Content: Edits visible to all linked projects
✅ Instance Config: Each project controls visibility/ordering
```

### Rule 3: Authority Enforcement

Edit authority is checked at service layer before mutations.

**Content Changes (require authority):**
- Updating track name, description, color
- Creating/editing/deleting roadmap items
- Creating/editing/deleting subtracks
- Changing track dates

**Instance Changes (require project membership only):**
- Setting `include_in_roadmap`
- Changing `visibility_state`
- Adjusting `order_index`
- Updating `instance_metadata`

### Rule 4: Primary Owner Management

**Primary Owner Responsibilities:**
- Has authority in `primary_project_only` mode
- Can transfer primary ownership to another linked project
- Cannot unlink while other projects are linked

**Transfer Primary Ownership:**
```typescript
await transferPrimaryOwnership(trackId, newPrimaryProjectId);
```

**Validation:**
- New primary must be a linked project
- Only one primary per track
- Automatic `is_primary` flag update in instances

---

## Integration Points

### Roadmap Items

**Behavior:**
- Roadmap items reference `track_id`
- All roadmap items belong to track definition (not instance)
- Per-project filtering uses `include_in_roadmap` flag

**Query Pattern:**
```typescript
// Get timeline-eligible items for a project
const tracks = await getTracksForProject(projectId, includeInstances: true);
const visibleTrackIds = tracks
  .filter(t => t.instance?.includeInRoadmap)
  .map(t => t.id);

const items = await getRoadmapItemsByTracks(visibleTrackIds);
```

**Key Points:**
- Items appear in timeline only if track instance has `include_in_roadmap = true`
- Each project independently controls roadmap inclusion
- Item content is shared across all projects

### Task Flow

**Behavior:**
- Task Flow sync is project-scoped
- Items sync to Task Flow based on their project context
- No cross-project Task Flow coupling

**Per-Project Control:**
```typescript
// Project A: Track visible in roadmap → items sync to Task Flow
trackInstanceA.includeInRoadmap = true;

// Project B: Track hidden from roadmap → items don't sync to Task Flow
trackInstanceB.includeInRoadmap = false;
```

### Mind Mesh

**Behavior:**
- Single node identity per track definition
- Node uses `sourceType: 'track'` and `sourceId: trackId`
- Multiple project edges allowed (e.g., "Project A uses Track X", "Project B uses Track X")
- No node duplication

**Auto-Generation:**
```typescript
// Track Definition → Mind Mesh Node
{
  sourceType: 'track',
  sourceId: trackId,
  label: track.name,
  masterProjectId: primaryOwnerProjectId,
  autoGenerated: true
}

// Project Instance → Project Reference Edge
{
  fromNodeId: projectNode.id,
  toNodeId: trackNode.id,
  edgeType: 'reference',
  direction: 'undirected',
  label: `uses (${includeInRoadmap ? 'roadmap' : 'hidden'})`
}
```

**Contextual Labeling:**
- Edge labels reflect instance configuration
- `include_in_roadmap` status shown in edge metadata
- Visibility state encoded in edge styling (future UI)

### Subtracks (Hierarchical Tracks)

**Behavior:**
- Subtracks inherit parent track's linkages
- If parent is shared, children are accessible in all linked projects
- Each project can independently control subtrack visibility via instances

**Rule:**
```
ALLOW_CROSS_PROJECT_SUBTRACKS = true
```

**Example:**
```
Production Track (shared across 3 projects)
  ├─ Pre-Production Subtrack (inherited: accessible in all 3)
  ├─ Filming Subtrack (inherited: accessible in all 3)
  └─ Post-Production Subtrack (inherited: accessible in all 3)

Project A: Shows all subtracks (instance visibility = visible)
Project B: Hides Pre-Production (instance visibility = hidden)
Project C: Collapses Post-Production (instance visibility = collapsed)
```

### Personal Spaces Bridge

**Behavior:**
- Personal space links remain per-item, not per-track
- Shared track items can be linked to personal spaces
- Link eligibility unchanged by track sharing

**No Cross-Contamination:**
- Project A's personal links don't appear in Project B
- Track sharing doesn't affect personal space privacy

---

## API Surface

### Track Definition Operations

#### Convert Track to Shared

```typescript
async function convertTrackToShared(
  input: ConvertToSharedTrackInput
): Promise<{ success: boolean; error?: string }>

interface ConvertToSharedTrackInput {
  trackId: string;
  authorityMode?: TrackAuthorityMode;
}
```

**Behavior:**
1. Sets `is_shared = true`
2. Sets `primary_owner_project_id = current master_project_id`
3. Creates primary instance in junction table
4. Validates no conflicts (track has subtracks/items warning)

**Example:**
```typescript
const result = await convertTrackToShared({
  trackId: 'track-123',
  authorityMode: 'primary_project_only'
});

if (result.success) {
  console.log('Track is now shared');
}
```

---

### Track Instance Operations

#### Link Track to Project

```typescript
async function linkTrackToProject(
  input: LinkTrackToProjectInput
): Promise<{ success: boolean; error?: string; instance?: TrackProjectInstance }>

interface LinkTrackToProjectInput {
  trackId: string;
  projectId: string;
  includeInRoadmap?: boolean;
  visibilityState?: TrackInstanceVisibility;
}
```

**Behavior:**
1. Validates track is shared
2. Validates project not already linked
3. Creates instance in junction table
4. Returns new instance

**Example:**
```typescript
const result = await linkTrackToProject({
  trackId: 'track-production',
  projectId: 'project-filming',
  includeInRoadmap: true,
  visibilityState: 'visible'
});
```

#### Unlink Track from Project

```typescript
async function unlinkTrackFromProject(
  input: UnlinkTrackFromProjectInput
): Promise<{ success: boolean; error?: string }>

interface UnlinkTrackFromProjectInput {
  trackId: string;
  projectId: string;
}
```

**Behavior:**
1. Validates project is linked
2. Prevents unlinking primary owner if others linked
3. Deletes instance from junction table
4. Cascade: roadmap items remain (belong to track definition)

**Example:**
```typescript
await unlinkTrackFromProject({
  trackId: 'track-production',
  projectId: 'project-filming'
});
```

#### Update Track Instance

```typescript
async function updateTrackInstance(
  trackId: string,
  projectId: string,
  input: UpdateTrackInstanceInput
): Promise<{ success: boolean; error?: string; instance?: TrackProjectInstance }>

interface UpdateTrackInstanceInput {
  includeInRoadmap?: boolean;
  visibilityState?: TrackInstanceVisibility;
  orderIndex?: number;
  instanceMetadata?: Record<string, any>;
}
```

**Behavior:**
- Updates project-specific configuration
- No authority check required (project membership sufficient)
- Isolated to this project's view

**Example:**
```typescript
// Hide track from roadmap in this project only
await updateTrackInstance('track-123', 'project-456', {
  includeInRoadmap: false,
  visibilityState: 'hidden'
});
```

---

### Query Operations

#### Get Track Projects

```typescript
async function getTrackProjects(
  trackId: string
): Promise<TrackProjectInfo[]>

interface TrackProjectInfo {
  projectId: string;
  isPrimary: boolean;
  includeInRoadmap: boolean;
  visibilityState: TrackInstanceVisibility;
}
```

**Behavior:**
- For shared tracks: returns all instances from junction table
- For legacy tracks: returns single project from `master_project_id`

**Example:**
```typescript
const projects = await getTrackProjects('track-production');
// [
//   { projectId: 'proj-1', isPrimary: true, includeInRoadmap: true, visibilityState: 'visible' },
//   { projectId: 'proj-2', isPrimary: false, includeInRoadmap: true, visibilityState: 'visible' },
//   { projectId: 'proj-3', isPrimary: false, includeInRoadmap: false, visibilityState: 'hidden' }
// ]
```

#### Get Project Tracks

```typescript
async function getProjectTracks(
  projectId: string
): Promise<string[]>
```

**Behavior:**
- Returns track IDs accessible in this project
- Includes both shared instances and legacy single-project tracks

**Example:**
```typescript
const trackIds = await getProjectTracks('project-filming');
// ['track-production', 'track-budget', 'track-schedule']
```

#### Get Tracks for Project (with Instances)

```typescript
async function getTracksForProject(
  projectId: string,
  includeInstances?: boolean
): Promise<TrackWithInstance[]>
```

**Behavior:**
- Returns full track definitions accessible in project
- Optionally includes instance configuration
- Useful for rendering project track list

**Example:**
```typescript
const tracks = await getTracksForProject('project-filming', true);

tracks.forEach(track => {
  console.log(track.name);
  if (track.instance) {
    console.log('  Include in roadmap:', track.instance.includeInRoadmap);
    console.log('  Visibility:', track.instance.visibilityState);
  }
});
```

---

### Permission Checking

#### Check Edit Permission

```typescript
async function checkTrackEditPermission(
  trackId: string,
  projectId: string
): Promise<{ canEdit: boolean; reason?: string }>
```

**Behavior:**
- Checks if project can edit track content
- Returns permission status and reason if denied

**Example:**
```typescript
const permission = await checkTrackEditPermission('track-123', 'project-456');

if (permission.canEdit) {
  // Allow edit UI
} else {
  console.log('Cannot edit:', permission.reason);
}
```

---

### Authority Operations

#### Transfer Primary Ownership

```typescript
async function transferPrimaryOwnership(
  trackId: string,
  newPrimaryProjectId: string
): Promise<{ success: boolean; error?: string }>
```

**Behavior:**
1. Validates new primary is linked
2. Updates `primary_owner_project_id` on track
3. Updates `is_primary` flag on instances

**Example:**
```typescript
await transferPrimaryOwnership('track-production', 'project-post-prod');
```

#### Change Authority Mode

```typescript
async function changeTrackAuthorityMode(
  trackId: string,
  newAuthorityMode: TrackAuthorityMode
): Promise<{ success: boolean; error?: string }>
```

**Behavior:**
- Changes edit authority mode
- Affects all linked projects immediately

**Example:**
```typescript
// Allow all projects to edit
await changeTrackAuthorityMode('track-production', 'shared_editing');

// Restrict to primary only
await changeTrackAuthorityMode('track-production', 'primary_project_only');
```

---

## Use Cases

### Use Case 1: Film Director/Producer Workflow

**Scenario:**
- Director manages overall production track
- Producer handles budget and scheduling tracks
- Both need visibility into all aspects, but controlled editing

**Implementation:**
```typescript
// Create shared production track
const prodTrack = await createTrack({
  masterProjectId: directorProjectId,
  name: 'Film Production',
  isShared: true,
  authorityMode: 'shared_editing'
});

// Link to producer's project
await linkTrackToProject({
  trackId: prodTrack.id,
  projectId: producerProjectId,
  includeInRoadmap: true
});

// Create budget track (producer-owned)
const budgetTrack = await createTrack({
  masterProjectId: producerProjectId,
  name: 'Budget Management',
  isShared: true,
  authorityMode: 'primary_project_only'
});

// Link to director's project (read-only)
await linkTrackToProject({
  trackId: budgetTrack.id,
  projectId: directorProjectId,
  includeInRoadmap: true
});
```

**Result:**
- Director sees production + budget tracks
- Producer sees production + budget tracks
- Both can edit production track (shared_editing)
- Only producer can edit budget track (primary_project_only)

---

### Use Case 2: Cross-Functional Team Alignment

**Scenario:**
- Engineering, Design, and Marketing teams work on product launch
- Shared "Product Launch" track visible in all projects
- Each team controls local visibility and ordering

**Implementation:**
```typescript
// Create shared launch track
const launchTrack = await createTrack({
  masterProjectId: productProjectId,
  name: 'Product Launch Q1',
  isShared: true,
  authorityMode: 'primary_project_only'
});

// Link to Engineering
await linkTrackToProject({
  trackId: launchTrack.id,
  projectId: engineeringProjectId,
  includeInRoadmap: true,
  visibilityState: 'visible'
});

// Link to Design
await linkTrackToProject({
  trackId: launchTrack.id,
  projectId: designProjectId,
  includeInRoadmap: true,
  visibilityState: 'visible'
});

// Link to Marketing
await linkTrackToProject({
  trackId: launchTrack.id,
  projectId: marketingProjectId,
  includeInRoadmap: true,
  visibilityState: 'visible'
});

// Marketing decides to collapse it (less focus)
await updateTrackInstance(launchTrack.id, marketingProjectId, {
  visibilityState: 'collapsed'
});
```

**Result:**
- All teams see same launch plan
- Product team controls content (primary owner)
- Each team configures visibility independently

---

### Use Case 3: Personal Trainer with Multiple Clients

**Scenario:**
- Trainer has "Client Program Template" track
- Each client sees their own roadmap with trainer oversight
- Trainer maintains single source of truth for program structure

**Implementation:**
```typescript
// Create shared program track
const programTrack = await createTrack({
  masterProjectId: trainerProjectId,
  name: 'Strength Training Program',
  isShared: true,
  authorityMode: 'primary_project_only'
});

// Link to Client A
await linkTrackToProject({
  trackId: programTrack.id,
  projectId: clientAProjectId,
  includeInRoadmap: true
});

// Link to Client B
await linkTrackToProject({
  trackId: programTrack.id,
  projectId: clientBProjectId,
  includeInRoadmap: true
});

// Trainer updates program (all clients see updates)
await updateRoadmapItem(programItemId, {
  title: 'Updated: Week 3 Strength Focus',
  description: 'New progression scheme'
});
```

**Result:**
- Trainer updates program once
- All clients see updates immediately
- Clients cannot edit program content (primary_project_only)

---

## Validation Rules

### Track Linking Validation

```typescript
validateTrackLinking(trackId, projectId, existingProjectIds):
  ✓ Track ID and Project ID are required
  ✓ Track is not already linked to this project
  ✓ Linked projects count < MAX_LINKED_PROJECTS (50)
  ⚠ Warning if linked to > 10 projects (organization considerations)
```

### Track Unlinking Validation

```typescript
validateTrackUnlinking(trackId, projectId, existingProjectIds, isPrimary):
  ✓ Track is currently linked to this project
  ✗ Cannot unlink primary owner if other projects are linked
  ⚠ Warning if unlinking last project (track becomes inaccessible)
```

### Convert to Shared Validation

```typescript
validateConvertToShared(hasSubtracks, hasItems, hasChildren):
  ⚠ Warning if track has subtracks (all become accessible)
  ⚠ Warning if track has items (all become accessible)
  ✗ Error if cross-project subtracks not enabled
```

### Primary Owner Transfer Validation

```typescript
validatePrimaryOwnerTransfer(currentPrimary, newPrimary, linkedProjects):
  ✓ New primary must be a linked project
  ✗ Cannot transfer to unlinked project
  ✗ Cannot transfer to same project (already primary)
```

---

## Error Messages

```typescript
export const SHARED_TRACK_ERROR_MESSAGES = {
  NOT_LINKED: 'Track is not linked to this project',
  ALREADY_LINKED: 'Track is already linked to this project',
  MAX_PROJECTS_EXCEEDED: 'Cannot link track to more than 50 projects',
  CANNOT_UNLINK_PRIMARY: 'Cannot unlink primary owner project',
  NO_EDIT_PERMISSION: 'Project does not have edit permission for this track',
  TRACK_NOT_SHARED: 'Track is not configured as shared',
  INVALID_AUTHORITY_MODE: 'Invalid authority mode',
  PRIMARY_OWNER_REQUIRED: 'Shared tracks must have a primary owner project',
};
```

---

## Database Helper Functions

### `get_track_projects(track_id)`

Returns all projects linked to a track.

**For shared tracks:** Queries `track_project_instances`
**For legacy tracks:** Returns single `master_project_id`

### `get_project_tracks(project_id)`

Returns all tracks accessible in a project.

**Includes:** Both shared instances and legacy single-project tracks

### `can_edit_track(track_id, project_id)`

Checks if a project can edit track content based on authority mode.

**Returns:** `boolean`

---

## Backward Compatibility

### Existing Tracks

All existing tracks automatically have:
- `is_shared = false` (legacy single-project mode)
- `primary_owner_project_id = null` (not applicable)
- `authority_mode = 'primary_project_only'` (default)

### Query Compatibility

**Legacy Query:**
```sql
SELECT * FROM guardrails_tracks_v2 WHERE master_project_id = $1;
```

**Still Works:** Returns all non-shared tracks owned by project

**New Query (recommended):**
```typescript
const tracks = await getTracksForProject(projectId);
```

**Returns:** Both shared instances and legacy tracks

### Migration Path

1. Existing tracks remain single-project by default
2. Users explicitly convert tracks to shared via `convertTrackToShared()`
3. No automatic reorganization or conversion
4. No data loss or structure changes

---

## What is Explicitly NOT Implemented

### No UI

- ❌ No track linking UI
- ❌ No instance configuration UI
- ❌ No authority mode selector
- ❌ No primary owner transfer UI

**Reason:** Architecture only. UI implementation is future work.

### No Syncing Jobs

- ❌ No background sync processes
- ❌ No conflict detection jobs
- ❌ No consistency checking workers

**Reason:** Single source of truth eliminates need for sync.

### No Conflict Resolution

- ❌ No merge conflict UI
- ❌ No version control system
- ❌ No change history tracking

**Reason:** Real-time updates, no branching/merging.

### No Forking or Cloning

- ❌ Cannot fork shared track into independent copy
- ❌ Cannot clone track with new ID
- ❌ Cannot create private branches

**Reason:** Shared tracks are truly shared. No copy-on-write.

### No Notifications or Automation

- ❌ No email notifications on track changes
- ❌ No auto-link suggestions
- ❌ No automated authority transfers

**Reason:** Manual, intentional linking only.

---

## Summary

Shared Tracks enable **one track, many contexts** by cleanly separating authoritative content (track definition) from project-specific configuration (track instances). This architecture maintains Guardrails as the single source of truth while enabling powerful cross-project workflows for collaborative teams, trainers with multiple clients, and complex multi-phase projects.

**Key Achievements:**
- ✅ Single source of truth (no duplication)
- ✅ Authority-based editing (configurable permissions)
- ✅ Per-project instance configuration (visibility, ordering)
- ✅ Backward compatible (legacy tracks unchanged)
- ✅ Mind Mesh integration (single node identity)
- ✅ Roadmap/Task Flow compatibility (project-scoped)

**Next Steps:**
UI implementation can proceed with confidence that the underlying architecture prevents data corruption, maintains referential integrity, and provides clear authority semantics across all shared track operations.
