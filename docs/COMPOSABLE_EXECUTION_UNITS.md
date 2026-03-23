# Composable Execution Units (Hierarchical Roadmap Items)

## Overview

Composable Execution Units enable **items inside items** by allowing roadmap items to contain other roadmap items in a parent-child relationship. This creates a hierarchical structure for better organization and execution modeling, such as an event containing tasks, or a goal containing habits.

**Core Principle: Guardrails tracks remain the primary organizational structure. Composable items enable execution-level hierarchies within tracks.**

## Concept & Terminology

### What is a Composable Execution Unit?

A Composable Execution Unit is a roadmap item that can:
1. Stand alone (top-level item)
2. Contain other items (parent item)
3. Be contained by another item (child item)

### Key Terms

**Top-Level Item:** A roadmap item with `parent_item_id = null`. Appears on the Infinite Roadmap timeline.

**Parent Item:** A top-level or mid-level item that contains child items.

**Child Item:** An item that belongs to a parent item. Execution-only; does not appear on main timeline.

**Item Depth:** The level in the hierarchy:
- `0` = top-level (appears on timeline)
- `1` = first child level
- `2` = second child level (maximum by default)

**Composition:** The act of attaching a child item to a parent item, creating a containment relationship.

---

## Data Model

### Database Schema

#### Extended Columns in `roadmap_items`

```sql
parent_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL
item_depth int NOT NULL DEFAULT 0
```

#### Indexes

- `idx_roadmap_items_parent_section` on `(section_id, parent_item_id)`
- `idx_roadmap_items_parent` on `(parent_item_id)` WHERE `parent_item_id IS NOT NULL`
- `idx_roadmap_items_depth` on `(item_depth)`
- `idx_roadmap_items_top_level_timeline` on `(section_id, start_date, end_date)` WHERE `parent_item_id IS NULL`

#### Helper Functions

**`calculate_item_depth(item_id)`**
- Returns the depth of an item in the hierarchy (0 for top-level)

**`is_item_ancestor(ancestor_id, descendant_id)`**
- Checks if first item is an ancestor of second item (prevents cycles)

**`get_all_child_items(parent_id)`**
- Returns all descendant items recursively

**`get_item_path(item_id)`**
- Returns breadcrumb path from root to item

**`get_root_item_id(item_id)`**
- Returns the top-level item for any item in hierarchy

**`items_same_section(item_id_1, item_id_2)`**
- Validates that two items belong to same section (and thus same project)

### Type System

```typescript
interface RoadmapItem {
  id: string;
  masterProjectId: string;
  trackId: string;
  type: RoadmapItemType;
  title: string;
  parentItemId?: string | null;  // NEW
  itemDepth: number;              // NEW
  // ... other fields
}

interface RoadmapItemTreeNode {
  item: RoadmapItem;
  children: RoadmapItemTreeNode[];
  childCount: number;
  descendantCount: number;
}

interface RoadmapItemPath {
  itemId: string;
  title: string;
  type: RoadmapItemType;
  depth: number;
}
```

---

## Rules Matrix

### Maximum Depth

```
MAX_ITEM_DEPTH = 2
```

This means: `Track → Item → Child Item` (three total levels including track)

Depth levels:
- `0` = Top-level item (direct child of track)
- `1` = First nested level
- `2` = Second nested level (maximum)

### Parent-Child Type Compatibility Matrix

```typescript
const PARENT_CHILD_TYPE_MATRIX = {
  event: ['task', 'note', 'document', 'photo', 'grocery_list', 'review', 'milestone', 'goal', 'habit'],
  task: ['task', 'note', 'document', 'photo', 'grocery_list', 'review', 'habit', 'goal'],
  goal: ['task', 'habit', 'review', 'note', 'document', 'photo'],
  milestone: ['task', 'note', 'document', 'photo', 'review'],
  habit: ['review', 'note'],
  note: [],
  document: [],
  photo: [],
  review: [],
  grocery_list: []
};
```

**Key Insights:**
- **event** is the most flexible container (can hold almost anything)
- **task** can contain subtasks and supporting items
- **goal** focuses on tasks and habits
- **note, document, photo, review, grocery_list** are leaf types (cannot contain children)

### Timeline Eligibility

```
TIMELINE_ELIGIBLE_ONLY_TOP_LEVEL = true
```

Only items with `parent_item_id = null` appear on the Infinite Roadmap timeline. Child items are execution-only and visible via drilldown (future UI feature).

### Task Flow Sync

```
TASKFLOW_SYNC_CHILD_ITEMS = false
```

By default, only top-level items sync to Task Flow. Child items are execution-only containers within their parent context.

---

## Validation Rules

### 1. No Cycles

An item cannot be its own ancestor. Validation uses `is_item_ancestor(potential_ancestor, potential_descendant)`.

**Example Violation:**
```
Item A → Item B → Item C → Item A  // ❌ Cycle detected
```

### 2. Same Section (Same Project)

Parent and child must share the same `section_id`, ensuring they belong to the same project.

**Enforcement:** `items_same_section(parent_id, child_id)` returns `true`

### 3. Depth Limit

```
child.item_depth = parent.item_depth + 1
```

If `child.item_depth > MAX_ITEM_DEPTH`, attachment is rejected.

**Example:**
```
Top-level item (depth 0)
  ↳ Child item (depth 1)
    ↳ Grandchild item (depth 2) ✅
      ↳ Great-grandchild item (depth 3) ❌ Exceeds limit
```

### 4. Type Compatibility

```
canParentContainChild(parentType, childType)
```

Checks `PARENT_CHILD_TYPE_MATRIX[parentType].includes(childType)`.

**Example:**
```
event → task ✅
task → habit ✅
note → task ❌ (note cannot contain children)
```

### 5. Parent Envelope Rule (Optional)

```typescript
PARENT_ENVELOPE_RULES = {
  enforceParentDateBoundaries: false,  // Not enforced by default
  allowChildWithoutDates: true
};
```

When enabled (future), child dates must fall within parent date range.

---

## API Surface

### Composition Operations

#### attachChildItem

```typescript
async function attachChildItem(input: AttachChildItemInput): Promise<{
  success: boolean;
  error?: string;
  item?: RoadmapItem;
}>

interface AttachChildItemInput {
  childItemId: string;
  parentItemId: string;
  userId?: string;
}
```

**Behavior:**
1. Validates no self-reference
2. Validates child doesn't already have a parent
3. Validates same section
4. Validates no cycles
5. Validates depth limit
6. Validates type compatibility
7. Sets `child.parent_item_id = parentItemId`
8. Sets `child.item_depth = parent.item_depth + 1`
9. Recursively updates all descendants' depths

**Example:**
```typescript
const result = await attachChildItem({
  childItemId: 'task-123',
  parentItemId: 'event-456'
});

if (result.success) {
  console.log('Attached!', result.item);
} else {
  console.error('Failed:', result.error);
}
```

#### detachChildItem

```typescript
async function detachChildItem(input: DetachChildItemInput): Promise<{
  success: boolean;
  error?: string;
  item?: RoadmapItem;
}>

interface DetachChildItemInput {
  childItemId: string;
  userId?: string;
}
```

**Behavior:**
1. Sets `child.parent_item_id = null`
2. Sets `child.item_depth = 0`
3. Recursively updates all descendants' depths (resets tree)

---

### Tree Query Operations

#### getRoadmapItemTree

```typescript
async function getRoadmapItemTree(params: {
  masterProjectId?: string;
  trackId?: string;
  itemId?: string;
  includeArchived?: boolean;
  includeChildren?: boolean;
  userId?: string;
}): Promise<RoadmapItemTreeNode[]>
```

**Returns:** Array of tree nodes, each containing an item and its recursive children.

**Example:**
```typescript
const tree = await getRoadmapItemTree({
  masterProjectId: 'proj-1',
  includeChildren: true
});

tree.forEach(node => {
  console.log(node.item.title, `(${node.childCount} direct, ${node.descendantCount} total)`);
});
```

#### getChildrenForItem

```typescript
async function getChildrenForItem(itemId: string): Promise<RoadmapItem[]>
```

Returns direct children only (not recursive).

#### getParentForItem

```typescript
async function getParentForItem(itemId: string): Promise<RoadmapItem | null>
```

Returns the immediate parent or `null` if top-level.

#### getAllDescendants

```typescript
async function getAllDescendants(itemId: string): Promise<RoadmapItem[]>
```

Returns all descendants recursively (children, grandchildren, etc.).

#### getItemPath

```typescript
async function getItemPath(itemId: string): Promise<RoadmapItemPath[]>
```

Returns breadcrumb trail from root to item.

**Example:**
```typescript
const path = await getItemPath('item-123');
// Returns: [
//   { itemId: 'event-1', title: 'Wedding', type: 'event', depth: 0 },
//   { itemId: 'task-5', title: 'Venue Setup', type: 'task', depth: 1 },
//   { itemId: 'item-123', title: 'Table Arrangements', type: 'task', depth: 2 }
// ]
```

#### getRootItem

```typescript
async function getRootItem(itemId: string): Promise<RoadmapItem | null>
```

Returns the top-level (root) item for any item in the hierarchy.

#### getTopLevelItems

```typescript
async function getTopLevelItems(params: {
  masterProjectId?: string;
  trackId?: string;
  includeArchived?: boolean;
}): Promise<RoadmapItem[]>
```

Returns all items with `parent_item_id = null`.

---

## Examples

### Example 1: Wedding Event Container

```typescript
// Create top-level event
const wedding = await createRoadmapItem({
  masterProjectId: 'proj-1',
  trackId: 'track-personal-events',
  type: 'event',
  title: 'Wedding',
  startDate: '2025-06-15',
  endDate: '2025-06-15',
});

// Create child tasks
const venueSetup = await createRoadmapItem({
  masterProjectId: 'proj-1',
  trackId: 'track-personal-events',
  type: 'task',
  title: 'Venue Setup',
  parentItemId: wedding.id  // Attach to wedding
});

const catering = await createRoadmapItem({
  masterProjectId: 'proj-1',
  trackId: 'track-personal-events',
  type: 'task',
  title: 'Catering Coordination',
  parentItemId: wedding.id
});

// Create grandchild tasks
const tableArrangements = await createRoadmapItem({
  masterProjectId: 'proj-1',
  trackId: 'track-personal-events',
  type: 'task',
  title: 'Table Arrangements',
  parentItemId: venueSetup.id  // Child of "Venue Setup"
});

// Timeline shows only "Wedding" (top-level)
// Drilldown reveals: Venue Setup, Catering, and Table Arrangements
```

### Example 2: Personal Trainer Client Container

```typescript
// Create goal as client container
const clientGoal = await createRoadmapItem({
  masterProjectId: 'proj-trainer',
  trackId: 'track-clients',
  type: 'goal',
  title: 'Client: John Smith - Weight Loss Program',
  startDate: '2025-01-01',
  endDate: '2025-06-30',
});

// Attach habits
const workoutHabit = await createRoadmapItem({
  masterProjectId: 'proj-trainer',
  trackId: 'track-clients',
  type: 'habit',
  title: '3x Weekly Workouts',
  parentItemId: clientGoal.id
});

// Attach tasks
const nutritionPlan = await createRoadmapItem({
  masterProjectId: 'proj-trainer',
  trackId: 'track-clients',
  type: 'task',
  title: 'Nutrition Plan Review',
  parentItemId: clientGoal.id
});

// Attach reviews
const monthlyCheckin = await createRoadmapItem({
  masterProjectId: 'proj-trainer',
  trackId: 'track-clients',
  type: 'review',
  title: 'Monthly Progress Check-in',
  parentItemId: clientGoal.id
});
```

### Example 3: Moving Child Between Parents

```typescript
// Initial setup
const eventA = await createRoadmapItem({
  type: 'event',
  title: 'Event A',
  // ...
});

const task1 = await createRoadmapItem({
  type: 'task',
  title: 'Task 1',
  parentItemId: eventA.id
});

// Move task to different parent
const eventB = await createRoadmapItem({
  type: 'event',
  title: 'Event B',
  // ...
});

// Method 1: Detach then attach
await detachChildItem({ childItemId: task1.id });
await attachChildItem({ childItemId: task1.id, parentItemId: eventB.id });

// Method 2: Direct move
await moveItemToNewParent(task1.id, eventB.id);
```

---

## Integration Points

### Timeline Queries

**Before (all items on timeline):**
```typescript
const items = await getRoadmapItemsByProject(masterProjectId);
```

**After (only top-level items on timeline):**
```typescript
const items = await getTimelineEligibleItems(masterProjectId);
// Automatically filters: parentItemId === null
```

**Custom Queries:**
```typescript
// Get all items (including children)
const allItems = await getRoadmapItemsByProject(masterProjectId);

// Get only top-level items
const topLevel = await getTopLevelItems({ masterProjectId });
```

### Mind Mesh Integration

**Automatic Composition Edges:**

When roadmap items have parent-child relationships, Mind Mesh automatically generates:

```typescript
// Auto-generated edge
{
  edgeType: 'composition',
  fromNodeId: parentNode.id,
  toNodeId: childNode.id,
  direction: 'directed',
  autoGenerated: true,
  label: 'contains'
}
```

**Properties:**
- Auto-generated (cannot be deleted, only hidden)
- Directed (parent → child)
- Idempotent (re-running auto-generation doesn't duplicate)

**Query Composition Edges:**
```typescript
const compositionEdges = await getEdgesByType(masterProjectId, 'composition');
```

### Task Flow Sync

**Default Behavior (v1):**
```
TASKFLOW_SYNC_CHILD_ITEMS = false
```

Only top-level items sync to Task Flow. Child items are execution-only.

**Example:**
```typescript
const event = await createRoadmapItem({
  type: 'event',
  title: 'Conference',
  parentItemId: null  // Top-level
});

const task = await createRoadmapItem({
  type: 'task',
  title: 'Book Venue',
  parentItemId: event.id  // Child
});

// Only 'Conference' syncs to Task Flow
// 'Book Venue' does NOT sync (child item)
```

**Future (when enabled):**
```
TASKFLOW_SYNC_CHILD_ITEMS = true
```

Child items will sync if their type is eligible.

### Deadlines & Extensions

**No changes to existing logic.** Deadlines computed per item as before.

**Future Parent Envelope Rule:**
```typescript
PARENT_ENVELOPE_RULES.enforceParentDateBoundaries = true;
```

When enabled, child dates must fall within parent date range. Not enforced in v1.

### People Assignments

**No schema changes.** `roadmap_item_assignees` already supports many-to-many.

**Tree-Level Queries:**
```typescript
async function getAssigneesForItemTree(parentItemId: string): Promise<Person[]> {
  // Returns all unique assignees across parent + descendants
}
```

### Personal Spaces Bridge

**No new linking concepts.** Existing link eligibility remains per-item type.

**Validation:** If a child item is linked to a personal space, the link remains valid even if parent changes.

---

## What is Explicitly NOT Implemented

### No UI Changes

- ❌ No drag-and-drop to nest items
- ❌ No tree view for roadmap
- ❌ No drilldown panels for child items
- ❌ No visual indicators for parent/child relationships
- ❌ No timeline rendering of composition

**Reason:** This is architecture-only. UI implementation is future work.

### No Automation

- ❌ No auto-nesting based on keywords
- ❌ No suggested compositions
- ❌ No AI-powered organization

**Reason:** Focus on manual, intentional composition.

### No Advanced Features

- ❌ No multi-parent support (item can only have one parent)
- ❌ No cross-project composition
- ❌ No composition templates
- ❌ No bulk attach/detach operations

**Reason:** Keep initial implementation simple and safe.

### No Write-Back from Mind Mesh

- ❌ Cannot edit composition from Mind Mesh
- ❌ Cannot attach/detach via Mind Mesh UI
- ❌ Composition edges are read-only reflections

**Reason:** Guardrails remains authoritative. Mind Mesh is visualization only.

---

## Error Messages

```typescript
export const COMPOSITION_ERROR_MESSAGES = {
  CYCLE_DETECTED: 'Cannot attach item: would create a circular relationship',
  MAX_DEPTH_EXCEEDED: 'Cannot attach item: would exceed maximum depth of 2',
  INVALID_TYPE_COMBINATION: (parentType, childType) =>
    `Cannot attach ${childType} to ${parentType}: type combination not allowed`,
  DIFFERENT_SECTION: 'Cannot attach item: parent and child must be in same section',
  DIFFERENT_PROJECT: 'Cannot attach item: parent and child must be in same project',
  PARENT_NOT_FOUND: 'Parent item not found',
  CHILD_NOT_FOUND: 'Child item not found',
  SELF_REFERENCE: 'Cannot attach item to itself',
  ALREADY_HAS_PARENT: 'Child item already has a parent',
  PARENT_ENVELOPE_VIOLATION: (violation) => `Date validation failed: ${violation}`
};
```

---

## Testing Scenarios

### Valid Compositions

✅ Event → Task
✅ Task → Subtask
✅ Goal → Habit
✅ Milestone → Task
✅ Event → Goal (complex container)

### Invalid Compositions

❌ Note → Task (note cannot contain children)
❌ Item → itself (self-reference)
❌ Item A → Item B → Item A (cycle)
❌ Depth 2 item → another item (exceeds MAX_DEPTH)
❌ Cross-project composition (different sections)
❌ Item with existing parent → new parent (must detach first)

---

## Backward Compatibility

### Existing Roadmap Items

All existing items automatically have:
- `parent_item_id = null` (top-level)
- `item_depth = 0`

### Existing Queries

Queries that don't filter by `parent_item_id` will return all items (including children). This is by design for admin/analytics views.

**Timeline queries** automatically filter for `parent_item_id = null` to maintain current behavior.

### Migration Path

1. Existing items remain top-level
2. Users manually attach children as needed
3. No automatic reorganization
4. No data loss or structure changes

---

## Future Extensions

### Planned Enhancements

**UI Features:**
- Visual tree view for roadmap items
- Drag-and-drop to nest items
- Drilldown panels for child items
- Parent-child indicators on timeline
- Bulk attach/detach operations

**Rules:**
- Configurable MAX_ITEM_DEPTH per project
- Custom type compatibility matrices per domain
- Parent envelope enforcement (date boundaries)
- Cross-track composition (with validation)

**Automation:**
- Auto-suggest compositions based on keywords
- Templates for common structures (e.g., "Event Template" with pre-nested tasks)
- Bulk operations (attach multiple children at once)

**Analytics:**
- Composition depth analytics
- Most-used parent types
- Completion cascading (parent completes when all children complete)

---

## Summary

Composable Execution Units enable **items inside items**, creating hierarchical roadmap structures for better organization. The architecture enforces strict validation (cycles, depth, type compatibility, same project) while maintaining backward compatibility and timeline clarity (only top-level items appear on main timeline).

**Key Achievement:** A safe, validated composition system that enables execution-level hierarchies without compromising Guardrails' track-based organizational structure.

**Next Steps:** UI implementation can proceed with confidence that the underlying architecture prevents data corruption and maintains referential integrity across all composition operations.
