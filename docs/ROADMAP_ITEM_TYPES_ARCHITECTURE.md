# Roadmap Item Types Architecture

## Overview

This document describes the unified Roadmap Item Type system for Guardrails. The architecture extends the base roadmap functionality to support multiple item types with type-specific behavior, validation, and metadata while maintaining backward compatibility and integration with existing systems (Tracks, Mind Mesh, Deadlines, Task Flow).

## Core Principles

1. **Single Table, Multiple Types** - One `roadmap_items` table with a `type` discriminator
2. **Type-Specific Metadata** - Flexible JSONB field for type-specific data without separate tables
3. **Service-Layer Validation** - All type rules enforced in TypeScript, not database constraints
4. **Timeline Eligibility** - Only certain types appear on the Infinite Roadmap timeline
5. **Mind Mesh Auto-Generation** - Every roadmap item automatically creates connections
6. **Deadline Compatibility** - Respects existing deadline system, only applicable types use it
7. **No UI Changes** - Pure architecture work, UI-agnostic

## Roadmap Item Types

### Type Catalog

```typescript
type RoadmapItemType =
  | 'task'           // Actionable work item (default)
  | 'event'          // Time-bound occurrence
  | 'note'           // Documentation/reference
  | 'document'       // External file/link reference
  | 'milestone'      // Significant achievement marker
  | 'goal'           // Measurable objective
  | 'photo'          // Visual content
  | 'grocery_list'   // Shopping/inventory list
  | 'habit'          // Recurring behavior pattern
  | 'review'         // Retrospective feedback
```

### Type Characteristics Matrix

| Type | Requires Dates | Allows Deadlines | Timeline | Default Status | Use Case |
|------|---------------|------------------|----------|----------------|----------|
| task | No | Yes | Yes | not_started | Work items, todos |
| event | **Yes** | Yes | Yes | not_started | Meetings, releases |
| milestone | **Yes** | Yes | Yes | not_started | Major achievements |
| goal | No | Yes | Yes | not_started | OKRs, targets |
| note | No | No | No | not_started | Documentation |
| document | No | No | No | not_started | Reference links |
| photo | No | No | No | not_started | Visual references |
| grocery_list | No | No | No | not_started | Shopping lists |
| habit | No | No | Yes* | not_started | Daily routines |
| review | No | No | No | completed | Retrospectives |

*Habit appears on timeline for tracking but doesn't use deadlines

## Data Model

### Base RoadmapItem

```typescript
interface RoadmapItem {
  id: string;
  masterProjectId: string;
  trackId: string;
  type: RoadmapItemType;
  title: string;
  description?: string;
  startDate?: string;        // Nullable (required only for event/milestone)
  endDate?: string | null;   // Nullable
  status: RoadmapItemStatus;
  metadata: Record<string, any>;  // Type-specific JSONB
  createdAt: string;
  updatedAt: string;
}
```

### Type-Specific Metadata

#### Task
```typescript
interface TaskMetadata {
  checklist?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
```

#### Event
```typescript
interface EventMetadata {
  location?: string;
  timeStart?: string;    // HH:MM format
  timeEnd?: string;
  allDay?: boolean;
}
```

#### Goal
```typescript
interface GoalMetadata {
  targetValue?: number;
  currentValue?: number;
  unit?: string;
}
```

#### Habit
```typescript
interface HabitMetadata {
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days?: number[];  // Day numbers (1-7 for weekly, 1-31 for monthly)
  };
}
```

#### Grocery List
```typescript
interface GroceryListMetadata {
  items?: Array<{
    id: string;
    name: string;
    checked: boolean;
    category?: string;
  }>;
}
```

#### Photo
```typescript
interface PhotoMetadata {
  assetUrl?: string;
  caption?: string;
}
```

#### Review
```typescript
interface ReviewMetadata {
  rating?: number;      // 0-5
  feedback?: string;
}
```

#### Document
```typescript
interface DocumentMetadata {
  url?: string;
  documentType?: 'link' | 'reference' | 'attachment';
}
```

## Validation Rules

### Type-Level Rules

```typescript
interface RoadmapItemTypeRules {
  requiresDates: boolean;          // Must have start_date
  allowsDeadlines: boolean;        // Can use deadline system
  canAppearInTimeline: boolean;    // Shows on Infinite Roadmap
  defaultStatus: RoadmapItemStatus;
  allowedStatuses: RoadmapItemStatus[];
}
```

**Enforcement Points:**
- `createRoadmapItem()` - Validates before insert
- `updateRoadmapItem()` - Validates before update
- Service layer throws descriptive errors

### Creation Validation

```typescript
validateFullRoadmapItem(input: CreateRoadmapItemInput) {
  // Check type-level rules
  if (rules.requiresDates && !input.startDate) {
    throw new Error(`Item type '${input.type}' requires a start date`);
  }

  // Check status validity
  if (!rules.allowedStatuses.includes(input.status)) {
    throw new Error(`Status '${input.status}' not allowed for type '${input.type}'`);
  }

  // Validate metadata structure
  validateMetadataForType(input.type, input.metadata);
}
```

### Track Compatibility

**Rules:**
- Roadmap items can ONLY attach to tracks where `includeInRoadmap = true`
- Offshoot Ideas (`category='offshoot_idea'`) can NEVER have roadmap items
- Enforced in `createRoadmapItem()` and `updateRoadmapItem()`

**Example Error:**
```
Cannot create roadmap item for track 'Research Ideas' - track is not included in roadmap.
Category: offshoot_idea. Offshoot ideas never appear in the roadmap.
```

## Timeline & Deadline Integration

### Timeline Eligibility

**Timeline-Eligible Types:**
- task
- event (requires dates)
- milestone (requires dates)
- goal
- habit

**Content-Only Types:**
- note
- document
- photo
- grocery_list
- review

### Deadline System Compatibility

**Deadline-Enabled Types:**
- task
- event
- milestone
- goal

These types integrate with the existing deadline extension system:
- `roadmap_item_deadline_extensions` table (unchanged)
- `effectiveDeadline` calculation (reused)
- Deadline state tracking (`on_track`, `due_soon`, `overdue`)

**No-Deadline Types:**
All other types ignore deadline logic entirely.

### Default Behavior

```typescript
// Timeline warning for content-only types
if (!canTypeAppearInTimeline(type) && (startDate || endDate)) {
  console.warn(`Item type '${type}' is content-only and will not appear on timeline`);
}
```

## Mind Mesh Integration

### Automatic Connection Generation

Every roadmap item automatically generates a Mind Mesh connection:

```typescript
createRoadmapItemConnection(roadmapItemId, trackId, masterProjectId) {
  // Auto-generate connection: Track → Roadmap Item
  supabase.from('mindmesh_connections').insert({
    master_project_id: masterProjectId,
    source_type: 'track',
    source_id: trackId,
    target_type: 'roadmap_item',
    target_id: roadmapItemId,
    relationship: 'references',
    auto_generated: true,
  });
}
```

**Connection Properties:**
- Source: Track
- Target: RoadmapItem
- Relationship: `references`
- Auto-generated: `true`

### Type Information in Graph

When querying Mind Mesh nodes:
- RoadmapItem type is part of the node data
- Future UI can filter/style by type
- No schema changes needed

## Task Flow Compatibility (Foundation)

### Structural Alignment

**Current State:**
- `RoadmapItem` with `type='task'`
- Shared status model
- Shared ID space

**Future Integration (NOT IMPLEMENTED):**
```typescript
// Conceptual only - for future development
interface TaskFlowEntry {
  id: string;  // Same ID as roadmap_item.id
  roadmapItemId: string;
  column: 'todo' | 'in_progress' | 'done';
  position: number;
}
```

**No Sync Logic Yet:**
- Status changes don't auto-update Task Flow
- Moving in Task Flow doesn't update Roadmap
- Manual alignment required

## Service Layer Architecture

### Core Services

#### roadmapService.ts

**Responsibilities:**
- CRUD operations for roadmap items
- Track validation
- Auto-generate Mind Mesh connections
- Enforce type rules

**Key Functions:**
```typescript
createRoadmapItem(input: CreateRoadmapItemInput): Promise<RoadmapItem>
updateRoadmapItem(id: string, input: UpdateRoadmapItemInput): Promise<RoadmapItem>
getRoadmapItemsByTrack(trackId: string): Promise<RoadmapItem[]>
getRoadmapItemsByProject(projectId: string): Promise<RoadmapItem[]>
getRoadmapItemsByType(projectId: string, type: RoadmapItemType): Promise<RoadmapItem[]>
isTimelineEligible(type: RoadmapItemType): boolean
```

#### roadmapItemValidation.ts

**Responsibilities:**
- Type-specific validation
- Metadata structure validation
- Status compatibility checks
- Date requirement enforcement

**Key Functions:**
```typescript
validateFullRoadmapItem(input): RoadmapItemValidationResult
validateMetadataForType(type, metadata): RoadmapItemValidationResult
getDefaultStatusForType(type): RoadmapItemStatus
canTypeAppearInTimeline(type): boolean
typeAllowsDeadlines(type): boolean
typeRequiresDates(type): boolean
isStatusValidForType(status, type): boolean
```

### Validation Error Handling

```typescript
interface ValidationError {
  field: string;
  message: string;
}

interface RoadmapItemValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Example usage
const validation = validateFullRoadmapItem(input);
if (!validation.valid) {
  throw new Error(
    `Validation failed:\n${validation.errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}`
  );
}
```

## Database Schema

### roadmap_items Table

```sql
CREATE TABLE roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid REFERENCES master_projects(id),
  track_id uuid REFERENCES guardrails_tracks_v2(id),

  type roadmap_item_type DEFAULT 'task',
  title text NOT NULL,
  description text,

  start_date date,          -- Nullable
  end_date date,            -- Nullable

  status roadmap_item_status DEFAULT 'not_started',
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_date_range CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND (end_date IS NULL OR end_date >= start_date))
  )
);
```

### Type Enum

```sql
CREATE TYPE roadmap_item_type AS ENUM (
  'task',
  'event',
  'note',
  'document',
  'milestone',
  'goal',
  'photo',
  'grocery_list',
  'habit',
  'review'
);
```

### Status Enum (Extended)

```sql
CREATE TYPE roadmap_item_status AS ENUM (
  'not_started',
  'pending',
  'in_progress',
  'blocked',
  'on_hold',      -- NEW
  'completed',
  'archived',     -- NEW
  'cancelled'
);
```

### Indexes

```sql
CREATE INDEX idx_roadmap_items_type ON roadmap_items(type);
CREATE INDEX idx_roadmap_items_track_id ON roadmap_items(track_id);
CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_items_dates ON roadmap_items(start_date, end_date);
```

## Migration Strategy

### Phase 1: Schema Extension (COMPLETED)

```sql
-- Add type column with default
ALTER TABLE roadmap_items ADD COLUMN type roadmap_item_type DEFAULT 'task';

-- Add metadata column
ALTER TABLE roadmap_items ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Make dates nullable
ALTER TABLE roadmap_items
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Update constraint
ALTER TABLE roadmap_items
  ADD CONSTRAINT valid_date_range CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND (end_date IS NULL OR end_date >= start_date))
  );
```

### Phase 2: Type System & Validation

- Type definitions in `coreTypes.ts`
- Validation rules in `roadmapItemValidation.ts`
- Service integration in `roadmapService.ts`

### Phase 3: Mind Mesh Auto-Generation

- Already implemented in `createRoadmapItem()`
- No schema changes needed

## Usage Examples

### Creating Different Item Types

#### Task
```typescript
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'task',
  title: 'Implement login flow',
  startDate: '2024-01-15',
  endDate: '2024-01-20',
  metadata: {
    priority: 'high',
    checklist: [
      { id: '1', text: 'Design UI', completed: true },
      { id: '2', text: 'Write tests', completed: false },
    ],
  },
});
```

#### Event
```typescript
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'event',
  title: 'Product Launch',
  startDate: '2024-03-01',  // Required
  metadata: {
    location: 'Virtual',
    timeStart: '14:00',
    timeEnd: '16:00',
    allDay: false,
  },
});
```

#### Goal
```typescript
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'goal',
  title: 'Reach 1000 users',
  endDate: '2024-12-31',
  metadata: {
    targetValue: 1000,
    currentValue: 250,
    unit: 'users',
  },
});
```

#### Note (Content-Only)
```typescript
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'note',
  title: 'Architecture Decision Record',
  description: 'We chose PostgreSQL for...',
  // No dates - content only
});
```

### Type-Specific Queries

```typescript
// Get all timeline-eligible items
const timelineItems = items.filter(item =>
  canTypeAppearInTimeline(item.type)
);

// Get all tasks with deadlines
const deadlineTasks = items.filter(item =>
  item.type === 'task' && item.endDate
);

// Get all events in date range
const events = await getRoadmapItemsByType(projectId, 'event');
const upcomingEvents = events.filter(e =>
  new Date(e.startDate) > new Date()
);
```

## Validation Examples

### Success Cases

```typescript
// Task without dates (valid)
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'task',
  title: 'Review PR',
});

// Goal with dates (valid)
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'goal',
  title: 'Launch MVP',
  endDate: '2024-06-01',
});
```

### Error Cases

```typescript
// Event without dates (INVALID)
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'event',
  title: 'Team Meeting',
  // Missing startDate - throws error
});
// Error: Item type 'event' requires a start date

// Review with wrong status (INVALID)
await createRoadmapItem({
  masterProjectId,
  trackId,
  type: 'review',
  title: 'Q1 Retrospective',
  status: 'in_progress',  // Review only allows 'completed'
});
// Error: Status 'in_progress' is not allowed for item type 'review'

// Offshoot track (INVALID)
await createRoadmapItem({
  masterProjectId,
  trackId: offshootTrackId,  // category='offshoot_idea'
  type: 'task',
  title: 'Some task',
});
// Error: Cannot create roadmap items for offshoot idea tracks
```

## Benefits

### 1. Extensibility
- Easy to add new types (just extend enum + rules)
- No schema migrations for new types
- JSONB metadata supports any structure

### 2. Type Safety
- TypeScript interfaces for every type
- Compile-time validation
- Auto-completion in IDE

### 3. Backward Compatibility
- Existing items default to `type='task'`
- All existing queries continue to work
- No breaking changes

### 4. Clean Validation
- Centralized rules in one place
- Clear error messages
- Service-layer enforcement

### 5. Mind Mesh Ready
- Auto-generates connections
- Type information available for visualization
- No extra work needed

### 6. Future-Proof
- Task Flow integration ready
- Analytics-friendly structure
- Metadata supports any future needs

## Future Enhancements (Not Implemented)

### Planned Extensions

1. **Task Flow Sync**
   - Auto-update Task Flow when status changes
   - Bi-directional sync
   - Conflict resolution

2. **Type-Specific UI Components**
   - Custom renderers per type
   - Type-aware editing modals
   - Visual differentiation

3. **Habit Automation**
   - Recurrence engine
   - Streak tracking
   - Notification system

4. **Goal Progress Tracking**
   - Auto-calculate progress %
   - Milestone checkpoints
   - Visual progress bars

5. **Analytics by Type**
   - Completion rates per type
   - Time-to-completion metrics
   - Type usage patterns

6. **Bulk Operations**
   - Convert types
   - Batch metadata updates
   - Type-specific filters

## Testing Checklist

- [x] Create task without dates (valid)
- [x] Create event without dates (invalid - throws error)
- [x] Create milestone with dates (valid)
- [x] Create note without dates (valid)
- [x] Update task status to all allowed statuses
- [x] Update review to non-completed status (invalid)
- [x] Assign item to track with includeInRoadmap=false (invalid)
- [x] Assign item to offshoot track (invalid)
- [x] Timeline filters content-only types correctly
- [x] Mind Mesh connection auto-generated on creation
- [x] Metadata validation catches invalid structures
- [x] Default status applied correctly per type
- [x] Build passes with zero errors

## Related Documentation

- [GUARDRAILS_UNIFIED_ARCHITECTURE.md](./GUARDRAILS_UNIFIED_ARCHITECTURE.md) - Overall system design
- [INFINITE_ROADMAP_IMPLEMENTATION.md](./INFINITE_ROADMAP_IMPLEMENTATION.md) - Timeline rendering
- [Roadmap Service](./src/lib/guardrails/roadmapService.ts) - Implementation
- [Validation Service](./src/lib/guardrails/roadmapItemValidation.ts) - Validation logic
- [Core Types](./src/lib/guardrails/coreTypes.ts) - Type definitions

## Summary

The Roadmap Item Types architecture provides a **flexible, extensible, type-safe system** for managing different kinds of roadmap content. It maintains **backward compatibility**, integrates seamlessly with **Mind Mesh and Deadlines**, and lays the **foundation for Task Flow integration** - all without requiring UI changes or complex migrations.

Key achievements:
- 10 distinct item types with clear use cases
- Type-specific metadata via JSONB
- Comprehensive validation at service layer
- Timeline eligibility by type
- Auto-generated Mind Mesh connections
- Clean, maintainable codebase
- Zero breaking changes
