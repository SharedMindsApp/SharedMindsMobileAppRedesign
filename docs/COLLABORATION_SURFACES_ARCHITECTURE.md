# Collaboration Surfaces & Awareness Architecture

## Overview

The Collaboration Surfaces Architecture is a **passive awareness and attribution system** that enables understanding of who is involved, what is being worked on, and where activity is happening across Guardrails—without introducing automation, notifications, UI, or real-time systems.

**Core Principle: Observe, don't enforce. Record, don't react. Enable, don't execute.**

This is foundational infrastructure designed to support future collaboration features while remaining completely non-intrusive to existing workflows.

---

## Core Principles

### 1. Architecture Only

This implementation includes:
- ✅ Database schema and migrations
- ✅ Type definitions
- ✅ Service-layer functions
- ✅ Query helpers
- ✅ Permission-safe access patterns

This implementation **does NOT** include:
- ❌ UI components
- ❌ Notifications
- ❌ Real-time sync or websockets
- ❌ Background jobs or automation
- ❌ Email, push, or in-app messaging
- ❌ Activity feeds or dashboards
- ❌ AI summarization
- ❌ Comments or messaging systems

### 2. Guardrails Remains Authoritative

Collaboration awareness is a **secondary layer** that observes Guardrails activity. It:
- Does NOT grant permissions
- Does NOT enforce assignments
- Does NOT control access
- Does NOT modify behavior
- Does NOT create dependencies

Guardrails' permission system, project structure, and data model remain unchanged.

### 3. Append-Only Historical Record

The `collaboration_activity` table is **append-only**:
- No updates allowed
- No deletes allowed
- Pure historical record
- Immutable audit trail

This design ensures:
- Complete activity history
- Audit compliance
- No data loss
- Reliable attribution

### 4. Awareness ≠ Permission, Assignment, or Responsibility

**Critical Distinctions:**

| What Awareness IS | What Awareness IS NOT |
|-------------------|----------------------|
| Historical record of interaction | Permission grant |
| Participation indicator | Task assignment |
| Activity attribution | Responsibility delegation |
| Collaboration footprint | Ownership transfer |

A user may appear in collaboration surfaces without:
- Being assigned to a task
- Having edit rights
- Being a project owner
- Having any formal role

### 5. Privacy-Aware and Permission-Safe

All queries respect:
- Project-level permissions
- User-level access control
- Personal Spaces isolation
- Cross-project boundaries

**Rule:** Users can only see collaboration data for entities they already have permission to access.

---

## Data Model

### Collaboration Activity Table

```sql
CREATE TABLE collaboration_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  surface_type collaboration_surface_type NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  activity_type collaboration_activity_type NOT NULL,
  context_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Field Descriptions:**

- **user_id**: User who performed the activity (not necessarily owner/assignee)
- **project_id**: Project context for activity (NULL for cross-project or personal)
- **surface_type**: High-level collaboration surface (project, track, roadmap_item, etc.)
- **entity_type**: Specific entity type (more granular than surface_type)
- **entity_id**: UUID of the entity acted upon
- **activity_type**: Type of activity (created, updated, viewed, linked, etc.)
- **context_metadata**: Additional context (changed fields, related entities)
- **created_at**: Timestamp (immutable, never updated)

### Enums

#### Collaboration Surface Type

```typescript
type CollaborationSurfaceType =
  | 'project'
  | 'track'
  | 'roadmap_item'
  | 'execution_unit'
  | 'taskflow'
  | 'mind_mesh'
  | 'personal_bridge'
  | 'side_project'
  | 'offshoot_idea';
```

**Surface Definitions:**

| Surface | Description | Entities Included |
|---------|-------------|-------------------|
| project | Project-level activity | master_projects |
| track | Track planning and organization | tracks, subtracks, track_instances |
| roadmap_item | Roadmap item execution | roadmap_items |
| execution_unit | Composable units work | child_items (composable) |
| taskflow | Task Flow management | taskflow_tasks |
| mind_mesh | Ideation and knowledge graph | mind_mesh_nodes, mind_mesh_edges |
| personal_bridge | Personal Spaces connections | personal_bridge_links |
| side_project | Side project exploration | side_projects |
| offshoot_idea | Offshoot idea capture | offshoot_ideas |

#### Activity Type

```typescript
type CollaborationActivityType =
  | 'created'
  | 'updated'
  | 'commented'
  | 'viewed'
  | 'linked'
  | 'unlinked'
  | 'status_changed'
  | 'deadline_changed'
  | 'assigned'
  | 'unassigned'
  | 'shared'
  | 'archived'
  | 'restored'
  | 'converted'
  | 'synced';
```

**Activity Descriptions:**

- **created**: Entity was created
- **updated**: Entity was modified
- **commented**: Comment was added (future)
- **viewed**: Entity was viewed (future)
- **linked**: Entity linked to another entity
- **unlinked**: Entity unlinked
- **status_changed**: Status updated
- **deadline_changed**: Deadline modified
- **assigned**: Person assigned
- **unassigned**: Person unassigned
- **shared**: Entity shared across projects
- **archived**: Entity archived
- **restored**: Entity restored from archive
- **converted**: Entity converted to another type
- **synced**: Entity synced with external system

---

## API Surface

### Recording Activity

#### Record Activity (Generic)

```typescript
async function recordActivity(
  input: RecordActivityInput
): Promise<{ success: boolean; error?: string; activity?: CollaborationActivity }>

interface RecordActivityInput {
  userId: string;
  projectId?: string | null;
  surfaceType: CollaborationSurfaceType;
  entityType: string;
  entityId: string;
  activityType: CollaborationActivityType;
  contextMetadata?: Record<string, any>;
}
```

**Usage:**
```typescript
await recordActivity({
  userId: currentUser.id,
  projectId: 'project-123',
  surfaceType: 'track',
  entityType: 'track',
  entityId: 'track-456',
  activityType: 'updated',
  contextMetadata: {
    changedFields: ['name', 'description'],
    previousName: 'Old Track Name',
    newName: 'New Track Name'
  }
});
```

#### Specialized Recording Functions

```typescript
// Track activity
await recordTrackActivity(userId, trackId, projectId, 'updated', metadata);

// Roadmap item activity
await recordRoadmapItemActivity(userId, itemId, projectId, 'status_changed', metadata);

// Mind Mesh activity
await recordMindMeshActivity(userId, nodeId, projectId, 'created', metadata);

// Task Flow activity
await recordTaskFlowActivity(userId, taskId, projectId, 'synced', metadata);
```

---

### Querying Collaboration Data

#### Get Entity Collaborators

```typescript
async function getEntityCollaborators(
  options: GetCollaboratorsOptions
): Promise<EntityCollaborator[]>

interface GetCollaboratorsOptions {
  entityType: string;
  entityId: string;
  limit?: number;
}

interface EntityCollaborator {
  userId: string;
  activityCount: number;
  lastActivityAt: string;
  activityTypes: CollaborationActivityType[];
}
```

**Usage:**
```typescript
const collaborators = await getEntityCollaborators({
  entityType: 'track',
  entityId: 'track-123',
  limit: 10
});

// Result:
// [
//   {
//     userId: 'user-1',
//     activityCount: 45,
//     lastActivityAt: '2025-12-12T10:30:00Z',
//     activityTypes: ['created', 'updated', 'status_changed']
//   },
//   {
//     userId: 'user-2',
//     activityCount: 12,
//     lastActivityAt: '2025-12-11T15:20:00Z',
//     activityTypes: ['updated', 'viewed']
//   }
// ]
```

#### Get User Collaboration Footprint

```typescript
async function getUserCollaborationFootprint(
  options: GetCollaborationFootprintOptions
): Promise<CollaborationFootprintEntry[]>

interface GetCollaborationFootprintOptions {
  userId: string;
  projectId?: string;
  daysBack?: number;
}

interface CollaborationFootprintEntry {
  surfaceType: CollaborationSurfaceType;
  entityType: string;
  entityId: string;
  activityCount: number;
  lastActivityAt: string;
}
```

**Usage:**
```typescript
const footprint = await getUserCollaborationFootprint({
  userId: 'user-123',
  projectId: 'project-456',
  daysBack: 30
});

// Shows all entities user has interacted with in last 30 days
```

#### Get Project Collaboration Heatmap

```typescript
async function getProjectCollaborationHeatmap(
  options: GetProjectHeatmapOptions
): Promise<CollaborationHeatmapEntry[]>

interface GetProjectHeatmapOptions {
  projectId: string;
  daysBack?: number;
}

interface CollaborationHeatmapEntry {
  surfaceType: CollaborationSurfaceType;
  activityCount: number;
  uniqueUsers: number;
  mostRecentActivity: string;
}
```

**Usage:**
```typescript
const heatmap = await getProjectCollaborationHeatmap({
  projectId: 'project-123',
  daysBack: 30
});

// Result shows collaboration intensity by surface:
// [
//   { surfaceType: 'track', activityCount: 234, uniqueUsers: 5, mostRecentActivity: '...' },
//   { surfaceType: 'roadmap_item', activityCount: 189, uniqueUsers: 4, ... },
//   { surfaceType: 'taskflow', activityCount: 67, uniqueUsers: 3, ... }
// ]
```

#### Get Active Users for Surface

```typescript
async function getActiveUsersForSurface(
  options: GetActiveUsersOptions
): Promise<ActiveUser[]>

interface GetActiveUsersOptions {
  surfaceType: CollaborationSurfaceType;
  entityId?: string;
  daysBack?: number;
}
```

**Usage:**
```typescript
// Get all users active in tracks in last 7 days
const activeUsers = await getActiveUsersForSurface({
  surfaceType: 'track',
  daysBack: 7
});

// Get users active on specific track
const trackUsers = await getActiveUsersForSurface({
  surfaceType: 'track',
  entityId: 'track-123',
  daysBack: 7
});
```

#### Get Most Collaborated Tracks

```typescript
async function getMostCollaboratedTracks(
  options: GetMostCollaboratedTracksOptions
): Promise<CollaboratedTrack[]>

interface CollaboratedTrack {
  trackId: string;
  collaboratorCount: number;
  activityCount: number;
  lastActivityAt: string;
}
```

**Usage:**
```typescript
const topTracks = await getMostCollaboratedTracks({
  projectId: 'project-123',
  limit: 10,
  daysBack: 30
});

// Returns tracks ranked by collaboration intensity
```

#### Get Dormant Entities with Collaborators

```typescript
async function getDormantEntitiesWithCollaborators(
  options: GetDormantEntitiesOptions
): Promise<DormantEntity[]>

interface GetDormantEntitiesOptions {
  projectId: string;
  dormantDays?: number;
  minCollaborators?: number;
}
```

**Usage:**
```typescript
const stalled = await getDormantEntitiesWithCollaborators({
  projectId: 'project-123',
  dormantDays: 30,
  minCollaborators: 2
});

// Identifies potential stalled work:
// Entities with multiple collaborators but no recent activity
```

#### Get Cross-Project Entity Activity

```typescript
async function getCrossProjectEntityActivity(
  options: GetCrossProjectActivityOptions
): Promise<CrossProjectActivity[]>
```

**Usage:**
```typescript
// For shared tracks, see activity breakdown by project
const crossProjectActivity = await getCrossProjectEntityActivity({
  entityType: 'track',
  entityId: 'shared-track-123'
});

// Result:
// [
//   { projectId: 'proj-1', userCount: 3, activityCount: 45, lastActivityAt: '...' },
//   { projectId: 'proj-2', userCount: 2, activityCount: 23, lastActivityAt: '...' }
// ]
```

#### Get Participation Intensity

```typescript
async function getParticipationIntensity(
  options: GetParticipationIntensityOptions
): Promise<ParticipationIntensity | null>

interface ParticipationIntensity {
  totalActivities: number;
  firstActivityAt: string;
  lastActivityAt: string;
  daysActive: number;
  activityTypes: CollaborationActivityType[];
}
```

**Usage:**
```typescript
const intensity = await getParticipationIntensity({
  entityType: 'roadmap_item',
  entityId: 'item-123',
  userId: 'user-456'
});

// Result:
// {
//   totalActivities: 28,
//   firstActivityAt: '2025-11-01T...',
//   lastActivityAt: '2025-12-12T...',
//   daysActive: 15,
//   activityTypes: ['created', 'updated', 'status_changed', 'deadline_changed']
// }
```

---

## Permission-Safe Access

All queries are **permission-aware**. Users can only see collaboration data for entities they have access to.

### Permission Check Function

```typescript
async function canUserSeeCollaborationSurface(
  userId: string,
  entityType: string,
  entityId: string,
  projectId?: string
): Promise<PermissionCheckResult>

interface PermissionCheckResult {
  canView: boolean;
  canRecord: boolean;
  reason?: string;
}
```

**Usage:**
```typescript
const permission = await canUserSeeCollaborationSurface(
  currentUser.id,
  'track',
  'track-123',
  'project-456'
);

if (permission.canView) {
  const collaborators = await getEntityCollaborators({
    entityType: 'track',
    entityId: 'track-123'
  });
}
```

### Permission-Safe Query Wrappers

```typescript
// Get collaborators with built-in permission check
const collaborators = await getPermissionSafeCollaborators(
  currentUser.id,
  'track',
  'track-123',
  'project-456',
  10
);

// Get footprint with permission check
const footprint = await getPermissionSafeFootprint(
  requestingUserId,
  targetUserId,
  projectId,
  30
);
```

### Personal Spaces Isolation

**Rule:** Personal Spaces never expose collaborators.

```typescript
function isPersonalSpaceEntity(entityType: string): boolean {
  const personalSpaceTypes = [
    'personal_space',
    'personal_item',
    'personal_goal',
    'personal_note'
  ];
  return personalSpaceTypes.includes(entityType);
}

// Personal space entities cannot record collaboration activity
const canRecord = await canRecordActivityForEntity(userId, 'personal_item', itemId);
// Returns: false
```

---

## Integration Points

### Shared Tracks Compatibility

Collaboration awareness fully supports Shared Tracks architecture:

**Cross-Project Activity Scoping:**
```typescript
const scope = await getCrossProjectAwarenessScope(
  currentUser.id,
  'track',
  'shared-track-123'
);

// Result:
// {
//   canSeeActivity: true,
//   limitedToProjects: ['proj-1', 'proj-2', 'proj-3']
// }
```

**Recording Activity on Shared Tracks:**
```typescript
// User in Project A edits shared track
await recordTrackActivity(
  userA.id,
  sharedTrackId,
  'project-a',
  'updated',
  { context: 'Project A context' }
);

// User in Project B views same track
await recordTrackActivity(
  userB.id,
  sharedTrackId,
  'project-b',
  'viewed',
  { context: 'Project B context' }
);

// Cross-project activity query shows both:
const activity = await getCrossProjectEntityActivity({
  entityType: 'track',
  entityId: sharedTrackId
});

// Result:
// [
//   { projectId: 'project-a', userCount: 1, activityCount: 5, ... },
//   { projectId: 'project-b', userCount: 1, activityCount: 2, ... }
// ]
```

**Privacy Rule:** Users only see activity for projects they have access to.

### Mind Mesh Integration

Mind Mesh activity is recorded for:
- Creating manual idea nodes
- Creating manual edges
- Annotating auto-generated nodes

```typescript
// User creates manual Mind Mesh node
await recordMindMeshActivity(
  userId,
  nodeId,
  projectId,
  'created',
  { nodeType: 'manual', label: 'New Idea' }
);

// User links two nodes
await recordActivity({
  userId,
  projectId,
  surfaceType: 'mind_mesh',
  entityType: 'mind_mesh_edge',
  entityId: edgeId,
  activityType: 'linked',
  contextMetadata: {
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    edgeType: 'relates_to'
  }
});

// Query Mind Mesh collaborators
const mindMeshUsers = await getActiveUsersForSurface({
  surfaceType: 'mind_mesh',
  daysBack: 7
});
```

### Task Flow Sync

Task Flow sync events are recorded:

```typescript
// Roadmap item synced to Task Flow
await recordRoadmapItemActivity(
  userId,
  itemId,
  projectId,
  'updated',
  { syncedToTaskFlow: true }
);

await recordTaskFlowActivity(
  userId,
  taskId,
  projectId,
  'synced',
  { syncedFromRoadmapItem: itemId }
);

// Query Task Flow activity
const taskFlowUsers = await getActiveUsersForSurface({
  surfaceType: 'taskflow',
  daysBack: 7
});
```

### Composable Execution Units

Child items (composable) are tracked separately:

```typescript
await recordActivity({
  userId,
  projectId,
  surfaceType: 'execution_unit',
  entityType: 'child_item',
  entityId: childItemId,
  activityType: 'created',
  contextMetadata: {
    parentItemId: 'parent-123',
    isComposable: true
  }
});
```

### Personal Spaces Bridge

Personal Spaces Bridge links are recorded in Guardrails domain only:

```typescript
// Link created from Guardrails to Personal
await recordActivity({
  userId,
  projectId: null, // No project context for bridge
  surfaceType: 'personal_bridge',
  entityType: 'personal_bridge_link',
  entityId: linkId,
  activityType: 'linked',
  contextMetadata: {
    guardrailsItemId: 'item-123',
    personalItemId: 'personal-456',
    direction: 'guardrails_to_personal'
  }
});
```

**Rule:** Personal Spaces consumption is private. Bridge links are recorded, but personal space activity is not.

---

## Use Cases (Future-Ready)

This architecture enables future implementation of:

### Use Case 1: Activity Feed (Future)

```typescript
// Future UI implementation
const recentActivity = await getProjectRecentActivity('project-123', 50);

// Render feed:
// "Alice updated Track: Production Planning (2 hours ago)"
// "Bob changed status on Roadmap Item: Scene 3 Filming (3 hours ago)"
// "Charlie created Mind Mesh node: Budget Considerations (5 hours ago)"
```

### Use Case 2: Presence Indicators (Future)

```typescript
// Future UI implementation
const activeUsers = await getActiveUsersForSurface({
  surfaceType: 'track',
  entityId: currentTrackId,
  daysBack: 1
});

// Show avatars of users active in last 24 hours
```

### Use Case 3: Collaboration Insights (Future)

```typescript
// Future analytics dashboard
const heatmap = await getProjectCollaborationHeatmap({
  projectId: currentProjectId,
  daysBack: 30
});

// Visualize collaboration intensity across surfaces
// Identify collaboration hotspots
// Detect underutilized surfaces
```

### Use Case 4: Stalled Work Detection (Future)

```typescript
// Future notification system
const stalled = await getDormantEntitiesWithCollaborators({
  projectId: currentProjectId,
  dormantDays: 14,
  minCollaborators: 2
});

// Notify: "Track: Production Planning has 3 collaborators but no activity in 14 days"
```

### Use Case 5: Team Coordination (Future)

```typescript
// Future team view
const footprint = await getUserCollaborationFootprint({
  userId: teamMemberId,
  projectId: currentProjectId,
  daysBack: 7
});

// Show what each team member worked on this week
```

### Use Case 6: Cross-Project Visibility (Future)

```typescript
// Future shared track insights
const crossProject = await getCrossProjectEntityActivity({
  entityType: 'track',
  entityId: sharedTrackId
});

// Show which projects are actively using shared track
// Identify primary contributors per project
```

---

## Analytics-Ready Queries

### Top Collaborators per Project

```typescript
const heatmap = await getProjectCollaborationHeatmap({
  projectId: 'project-123',
  daysBack: 30
});

const topUsers = heatmap
  .sort((a, b) => b.uniqueUsers - a.uniqueUsers)
  .slice(0, 10);
```

### Most Collaborated Tracks

```typescript
const topTracks = await getMostCollaboratedTracks({
  projectId: 'project-123',
  limit: 10,
  daysBack: 30
});

// Ranked by collaborator count and activity count
```

### Items with High Participation but Low Completion

```typescript
// Query roadmap items
const items = await getRoadmapItemsByProject('project-123');

// For each item, get collaboration intensity
const itemsWithIntensity = await Promise.all(
  items.map(async (item) => {
    const collaborators = await getEntityCollaborators({
      entityType: 'roadmap_item',
      entityId: item.id,
      limit: 100
    });

    return {
      ...item,
      collaboratorCount: collaborators.length,
      totalActivity: collaborators.reduce((sum, c) => sum + c.activityCount, 0)
    };
  })
);

// Filter: high activity but status not "completed"
const highParticipationNotCompleted = itemsWithIntensity.filter(
  (item) => item.collaboratorCount >= 3 && item.status !== 'completed'
);
```

### Dormant Tracks with Many Collaborators

```typescript
const dormant = await getDormantEntitiesWithCollaborators({
  projectId: 'project-123',
  dormantDays: 30,
  minCollaborators: 2
});

const dormantTracks = dormant.filter((e) => e.entityType === 'track');
```

---

## Database Helper Functions

All helper functions are **stable** (read-only, deterministic) and optimized for performance.

### Available Functions

| Function | Purpose |
|----------|---------|
| `get_entity_collaborators(type, id, limit)` | Get collaborators for any entity |
| `get_user_collaboration_footprint(user, project, days)` | Get user's activity footprint |
| `get_project_collaboration_heatmap(project, days)` | Get collaboration intensity by surface |
| `get_active_users_for_surface(surface, entity, days)` | Get active users on a surface |
| `get_dormant_entities_with_collaborators(project, days, min)` | Find stalled work |
| `get_cross_project_entity_activity(type, id)` | Get activity across projects |
| `get_most_collaborated_tracks(project, limit, days)` | Get top tracks by collaboration |
| `get_participation_intensity(type, id, user)` | Get detailed user participation |

### Performance Considerations

**Indexes:**
- User activity: `idx_collab_activity_user`
- Project activity: `idx_collab_activity_project`
- Entity activity: `idx_collab_activity_entity`
- Surface activity: `idx_collab_activity_surface`
- Composite queries: `idx_collab_activity_composite`
- Metadata queries: `idx_collab_activity_metadata` (GIN index)

**Query Patterns:**
- All queries use indexed columns
- Helper functions use efficient aggregations
- Time-based filters leverage created_at index
- JSONB queries use GIN index

---

## Security and Privacy

### RLS Policies

```sql
-- Users can view activity for accessible projects
CREATE POLICY "Users can view collaboration activity for accessible projects"
  ON collaboration_activity
  FOR SELECT
  USING (
    project_id IS NULL
    OR user owns project
    OR user is project member
  );

-- Users can insert their own activity only
CREATE POLICY "Users can create their own collaboration activity"
  ON collaboration_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No updates allowed (append-only)
CREATE POLICY "No updates allowed" FOR UPDATE USING (false);

-- No deletes allowed (permanent record)
CREATE POLICY "No deletes allowed" FOR DELETE USING (false);
```

### Privacy Rules

1. **Personal Spaces Isolation**: Personal space entities never record or expose collaboration
2. **Project Scoping**: Activity visibility respects project permissions
3. **No Leakage**: Shared track activity isolated per project context
4. **User Privacy**: Users can only see their own full footprint across all projects
5. **Permission-Safe**: All queries check permissions before returning data

---

## Backward Compatibility

### No Breaking Changes

- No modifications to existing tables
- No changes to existing workflows
- No behavioral side effects
- Purely additive architecture

### Opt-In Recording

Collaboration activity recording is **opt-in** via explicit service calls. Existing code continues to work without modification.

### Future Integration Points

When integrating with existing code:

```typescript
// Example: Track update handler
async function updateTrack(trackId: string, updates: UpdateTrackInput) {
  // Existing update logic
  const result = await trackService.updateTrack(trackId, updates);

  // NEW: Record collaboration activity (optional)
  if (result.success) {
    await recordTrackActivity(
      currentUser.id,
      trackId,
      track.projectId,
      'updated',
      { changedFields: Object.keys(updates) }
    );
  }

  return result;
}
```

---

## What This Architecture Enables

This foundational layer enables future features to be built safely and coherently:

### Notifications (Future)

```typescript
// Future: Subscribe to entity activity
subscribeToEntityActivity('track', trackId, (activity) => {
  if (activity.userId !== currentUser.id) {
    notify(`${activity.userId} ${activity.activityType} ${activity.entityType}`);
  }
});
```

### Presence Indicators (Future)

```typescript
// Future: Show who's currently active
const activeNow = await getActiveUsersForSurface({
  surfaceType: 'track',
  entityId: currentTrackId,
  daysBack: 0.01 // Last ~15 minutes
});
```

### Activity Feeds (Future)

```typescript
// Future: Render activity feed
const activities = await getProjectRecentActivity(projectId, 50);
renderActivityFeed(activities);
```

### AI Summarization (Future)

```typescript
// Future: AI summary of collaboration patterns
const heatmap = await getProjectCollaborationHeatmap({ projectId, daysBack: 30 });
const summary = await generateAISummary(heatmap);
// "Your team is most active in Tracks and Roadmap Items. Mind Mesh usage is low."
```

### Paid Collaboration Tools (Future)

```typescript
// Future: Premium collaboration analytics
if (subscription.tier === 'premium') {
  const insights = await getAdvancedCollaborationInsights(projectId);
  renderPremiumDashboard(insights);
}
```

---

## Implementation Checklist

- ✅ Database migration with enums and table
- ✅ RLS policies for permission-safe access
- ✅ Indexes for query performance
- ✅ Helper functions for common queries
- ✅ Type definitions for all interfaces
- ✅ Service layer for recording activity
- ✅ Query helpers for awareness data
- ✅ Permission-safe access patterns
- ✅ Cross-project awareness support
- ✅ Personal Spaces isolation
- ✅ Mind Mesh integration
- ✅ Task Flow compatibility
- ✅ Shared Tracks support
- ✅ Documentation

---

## Summary

The Collaboration Surfaces & Awareness Architecture provides a **passive, permission-safe, append-only foundation** for understanding collaboration patterns across Guardrails. It:

- ✅ Records who interacts with what
- ✅ Enables querying collaboration patterns
- ✅ Respects permissions and privacy
- ✅ Supports cross-project awareness
- ✅ Integrates with all major Guardrails features
- ✅ Provides analytics-ready data

**Without:**
- ❌ UI changes
- ❌ Automation
- ❌ Notifications
- ❌ Real-time systems
- ❌ Behavioral changes

This architecture is **future-ready infrastructure** that enables powerful collaboration features to be built safely when needed, while remaining completely non-intrusive to existing workflows.
