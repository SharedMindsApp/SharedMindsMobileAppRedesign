# Guardrails Sub-Tracks Architecture

## Overview

Sub-Tracks extend the existing Tracks system by providing an additional layer of organizational structure within each track. This allows users to break down tracks into more granular components while maintaining the top-level track grouping.

## Database Schema

### Table: `guardrails_subtracks`

The core sub-tracks table stores all sub-track information.

```sql
CREATE TABLE guardrails_subtracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_subtrack_order_per_track UNIQUE(track_id, ordering_index)
);
```

**Column Descriptions:**

- `id` - Unique identifier for the sub-track
- `track_id` - Parent track reference (CASCADE on delete)
- `name` - Sub-track display name
- `description` - Optional detailed description
- `ordering_index` - Position within the parent track (auto-incremented)
- `is_default` - Flag for wizard-created or default sub-tracks
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp (auto-updated via trigger)

**Indexes:**

- `idx_subtracks_track_id` - Fast lookups by track
- `idx_subtracks_ordering` - Fast ordered queries within tracks

## Relationships

### Parent Track Relationship

Each sub-track belongs to exactly one track:

```typescript
SubTrack --(many-to-one)--> Track
```

- **ON DELETE CASCADE**: When a track is deleted, all its sub-tracks are automatically deleted
- **Ordering**: Sub-tracks are ordered within their parent track using `ordering_index`

### Item Relationships

Sub-tracks can be assigned to various Guardrails entities:

#### Roadmap Items

```sql
ALTER TABLE roadmap_items ADD COLUMN subtrack_id uuid
  REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
```

#### Side Ideas (Mind Mesh)

```sql
ALTER TABLE side_ideas ADD COLUMN subtrack_id uuid
  REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
```

#### Focus Sessions

```sql
ALTER TABLE focus_sessions ADD COLUMN subtrack_id uuid
  REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;
```

**Behavior on Sub-Track Deletion:**

- When a sub-track is deleted, all items referencing it have their `subtrack_id` set to NULL
- Items remain assigned to their parent `track_id`
- No data loss occurs

## Row Level Security (RLS)

All RLS policies inherit from the parent track's security model.

### Policy: View Sub-Tracks

```sql
Users can view subtracks if they own the parent track's master project
```

### Policy: Create Sub-Tracks

```sql
Users can create subtracks for tracks they own
```

### Policy: Update Sub-Tracks

```sql
Users can update subtracks they own
```

### Policy: Delete Sub-Tracks

```sql
Users can delete subtracks they own
```

## TypeScript Types

### Core Types

```typescript
interface SubTrack {
  id: string;
  track_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateSubTrackInput {
  track_id: string;
  name: string;
  description?: string;
}

interface UpdateSubTrackInput {
  name?: string;
  description?: string;
  ordering_index?: number;
}

interface SubTrackStats {
  roadmapItemCount: number;
  sideIdeaCount: number;
  focusSessionCount: number;
  completedItemsCount: number;
  inProgressItemsCount: number;
  notStartedItemsCount: number;
  blockedItemsCount: number;
}
```

## Service Layer API

Location: `src/lib/guardrails/subtracks.ts`

### Core CRUD Operations

#### Get Sub-Tracks for Track

```typescript
async function getSubTracksForTrack(trackId: string): Promise<SubTrack[]>
```

Returns all sub-tracks for a given track, ordered by `ordering_index`.

#### Get Sub-Track by ID

```typescript
async function getSubTrackById(id: string): Promise<SubTrack | null>
```

Retrieves a single sub-track by its ID.

#### Create Sub-Track

```typescript
async function createSubTrack(input: CreateSubTrackInput): Promise<SubTrack>
```

Creates a new sub-track. The `ordering_index` is automatically calculated.

#### Update Sub-Track

```typescript
async function updateSubTrack(id: string, input: UpdateSubTrackInput): Promise<SubTrack>
```

Updates sub-track properties. Only provided fields are updated.

#### Delete Sub-Track

```typescript
async function deleteSubTrack(id: string): Promise<void>
```

Deletes a sub-track. All items with this sub-track are set to NULL.

#### Reorder Sub-Tracks

```typescript
async function reorderSubTracks(trackId: string, orderedSubTrackIds: string[]): Promise<void>
```

Reorders sub-tracks within a track by updating their `ordering_index` values.

### Item Assignment Operations

#### Bulk Assign Items

```typescript
async function bulkAssignItemsToSubTrack(
  itemIds: string[],
  subTrackId: string,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void>
```

Assigns multiple items to a sub-track in a single operation.

#### Bulk Unassign Items

```typescript
async function bulkUnassignItemsFromSubTrack(
  itemIds: string[],
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void>
```

Removes sub-track assignment from multiple items.

#### Move Item to Sub-Track

```typescript
async function moveItemToSubTrack(
  itemId: string,
  subTrackId: string | null,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void>
```

Moves a single item to a different sub-track (or to null/unassigned).

#### Get Items by Sub-Track

```typescript
async function getItemsBySubTrack(
  subTrackId: string,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<any[]>
```

Retrieves all items of a specific type assigned to a sub-track.

### Analytics and Statistics

#### Get Sub-Track Statistics

```typescript
async function getSubTrackStats(subTrackId: string): Promise<SubTrackStats>
```

Returns comprehensive statistics about a sub-track including:
- Total item counts by type
- Status breakdown for roadmap items
- Completion metrics

#### Get Sub-Track Progress

```typescript
async function getSubTrackProgress(subTrackId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}>
```

Calculates progress based on completed vs total roadmap items.

### Project-Level Operations

#### Get All Sub-Tracks for Project

```typescript
async function getAllSubTracksForProject(
  masterProjectId: string
): Promise<Map<string, SubTrack[]>>
```

Returns a map of track IDs to their sub-tracks for an entire project.

### Utility Functions

#### Duplicate Sub-Track

```typescript
async function duplicateSubTrack(
  subTrackId: string,
  newName?: string
): Promise<SubTrack>
```

Creates a copy of a sub-track (items are not duplicated).

## Integration with Existing Systems

### Roadmap View

Sub-tracks can be displayed as:
- Nested rows within track rows in the Gantt view
- Expandable/collapsible sections
- Color-coded lanes
- Filtering options

**Example Usage:**

```typescript
const track = await getTrackById(trackId);
const subtracks = await getSubTracksForTrack(trackId);

// Display track with nested sub-tracks
// Items can be assigned to both track_id and subtrack_id
```

### Task Flow (Kanban)

Sub-tracks can become:
- Sub-columns within track columns
- Horizontal swimlanes within tracks
- Grouped cards with sub-headers

**Example Usage:**

```typescript
const tracks = await getTracksForProject(projectId);
const subtracksMap = await getAllSubTracksForProject(projectId);

// For each track column
tracks.forEach(track => {
  const subtracks = subtracksMap.get(track.id) || [];
  // Render sub-columns or groupings
});
```

### Mind Mesh (Nodes)

Sub-tracks can provide:
- Additional visual grouping within track clusters
- Hierarchical node organization
- Filter layers for node visibility

**Example Usage:**

```typescript
// Assign a side idea to a sub-track
await moveItemToSubTrack(ideaId, subTrackId, 'idea');

// Filter nodes by sub-track
const nodesInSubTrack = await getItemsBySubTrack(subTrackId, 'idea');
```

### Focus Sessions

Sub-tracks provide focused work context:

```typescript
// Start a focus session with sub-track context
const session = await createFocusSession({
  track_id: trackId,
  subtrack_id: subTrackId,
  // ... other session data
});

// Track progress within specific sub-tracks
const stats = await getSubTrackStats(subTrackId);
```

## Backward Compatibility

### Existing Data

- All existing roadmap items, ideas, and sessions continue to work
- `subtrack_id` is nullable - items without sub-tracks are valid
- Tracks work independently of sub-tracks
- No breaking changes to existing APIs

### Migration Strategy

When implementing sub-tracks in the UI:

1. **Phase 1**: Backend support (current implementation)
2. **Phase 2**: Optional sub-track creation in UI
3. **Phase 3**: Sub-track assignment dropdowns in item editors
4. **Phase 4**: Visual sub-track displays in Roadmap/Task Flow/Mind Mesh
5. **Phase 5**: Advanced sub-track features (templates, automation)

## Usage Examples

### Creating a Sub-Track Structure

```typescript
// Create a track
const track = await createTrack({
  masterProjectId: projectId,
  name: 'Backend Development',
});

// Add sub-tracks for organization
const apiSubtrack = await createSubTrack({
  track_id: track.id,
  name: 'API Development',
  description: 'RESTful API endpoints and services',
});

const dbSubtrack = await createSubTrack({
  track_id: track.id,
  name: 'Database Schema',
  description: 'Schema design and migrations',
});

const authSubtrack = await createSubTrack({
  track_id: track.id,
  name: 'Authentication',
  description: 'User auth and session management',
});
```

### Organizing Roadmap Items

```typescript
// Create roadmap items and assign to sub-tracks
await createRoadmapItem({
  section_id: sectionId,
  title: 'Design User Login API',
  track_id: track.id,
  subtrack_id: apiSubtrack.id,
  // ... other fields
});

await createRoadmapItem({
  section_id: sectionId,
  title: 'Create Users Table',
  track_id: track.id,
  subtrack_id: dbSubtrack.id,
  // ... other fields
});

// Get all items in a sub-track
const apiItems = await getItemsBySubTrack(apiSubtrack.id, 'roadmap');
```

### Moving Items Between Sub-Tracks

```typescript
// Move an item from one sub-track to another
await moveItemToSubTrack(itemId, newSubTrackId, 'roadmap');

// Unassign from sub-track (but keep track assignment)
await moveItemToSubTrack(itemId, null, 'roadmap');

// Bulk move multiple items
await bulkAssignItemsToSubTrack(
  [item1Id, item2Id, item3Id],
  targetSubTrackId,
  'roadmap'
);
```

### Tracking Progress

```typescript
// Get detailed statistics
const stats = await getSubTrackStats(subTrackId);
console.log(`Progress: ${stats.completedItemsCount}/${stats.roadmapItemCount}`);

// Get simple percentage
const progress = await getSubTrackProgress(subTrackId);
console.log(`${progress.percentage}% complete`);
```

## Best Practices

### When to Use Sub-Tracks

Use sub-tracks when:
- A track has multiple distinct work streams
- You need additional organization within a track
- Team members focus on specific areas within a track
- You want to measure progress at a more granular level

### When NOT to Use Sub-Tracks

Avoid sub-tracks when:
- A track is already small and focused
- Over-organization would create complexity
- The track changes frequently (use tags/labels instead)

### Naming Conventions

- Keep sub-track names concise (2-4 words)
- Use consistent naming patterns across tracks
- Consider using verbs for action-oriented sub-tracks
- Use nouns for component-based sub-tracks

### Performance Considerations

- Limit sub-tracks to 10-15 per track for optimal UI performance
- Use bulk operations when moving multiple items
- Cache sub-track lists when rendering large views
- Consider lazy-loading sub-track details

## Future Enhancements

Potential future features:

- Sub-track templates for common workflows
- Automatic sub-track creation based on item types
- Sub-track-level time estimates and tracking
- Sub-track dependencies and blocking relationships
- Sub-track color themes independent of parent track
- Sub-track milestones and deadlines
- Cross-track sub-track linking

## Troubleshooting

### Common Issues

**Issue**: Sub-track not appearing in dropdown
**Solution**: Ensure the sub-track's parent track is loaded and the user has permission

**Issue**: Items not showing in sub-track view
**Solution**: Verify both `track_id` AND `subtrack_id` are set correctly

**Issue**: Ordering conflicts
**Solution**: Run `reorderSubTracks()` to reset ordering indexes

**Issue**: RLS errors
**Solution**: Confirm user owns the master project containing the track

## Testing Recommendations

When implementing UI features:

1. Test sub-track creation/deletion
2. Test item assignment and movement
3. Test ordering and reordering
4. Test deletion cascades
5. Test statistics accuracy
6. Test RLS policies
7. Test backward compatibility with trackless items

## Summary

Sub-Tracks provide a flexible, hierarchical organization system within Tracks without breaking existing functionality. The implementation is:

- **Non-breaking**: All existing code continues to work
- **Optional**: Items work without sub-tracks
- **Secure**: RLS inherited from parent tracks
- **Performant**: Indexed and optimized queries
- **Extensible**: Ready for future UI integration
