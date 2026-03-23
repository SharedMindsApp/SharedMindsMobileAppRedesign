# Context Container + Nested Events Architecture

## Summary

This document describes the implementation of a generic **Context Container + Nested Events architecture** that supports:
- **Trips** (first use case)
- **Projects** (Guardrails)
- **Future contexts** (health, work blocks, education, etc.)

## Core Concepts

### A. Context Container (Macro Event)
- Represents a bounded period of time
- Examples:
  - Trip: Feb 2–9
  - Project phase: Jan–Mar
  - Medical leave: Mar 12–20
- Can be projected to calendars as a **single block**
- Carries NO internal detail by default
- `event_scope = 'container'`
- `parent_context_event_id = null`

### B. Nested Context Events (Micro Events)
- Owned by a container
- Examples:
  - Flight
  - Hotel check-in
  - Meeting
  - Deadline
- Can be selectively projected
- Never auto-leaks when container is shared
- `event_scope = 'item'`
- `parent_context_event_id = <container_id>` (required)

### C. Projection Rules
- Container and nested events have **independent projections**
- Container projection ≠ nested projection
- Linking ≠ sharing
- Default: nothing is visible unless explicitly projected

## Database Changes

### Migration: `20260103000007_add_context_event_nesting.sql`

**New Fields:**
- `event_scope` enum: `'container' | 'item'` (defaults to `'item'` for backward compatibility)
- `parent_context_event_id` uuid (nullable, self-referential FK to `context_events.id`)

**Constraints:**
- Max nesting depth = 1 (container → item only)
- Containers cannot have a parent
- Nested items must have a container parent
- Enforced via database trigger `enforce_nesting_depth`

**Indexes:**
- `idx_context_events_parent` (for efficient nested queries)
- `idx_context_events_scope` (for filtering by scope)
- `idx_context_events_container_items` (for container + nested queries)

## TypeScript Types

### New Types Added

```typescript
// Event scope enum
export type EventScope = 'container' | 'item';

// Container event (extends ContextEvent)
export interface ContainerEvent extends ContextEvent {
  event_scope: 'container';
  parent_context_event_id: null;
}

// Nested event (extends ContextEvent)
export interface NestedEvent extends ContextEvent {
  event_scope: 'item';
  parent_context_event_id: string;  // Required
}

// Context event with nested children
export interface ContextEventWithChildren extends ContextEvent {
  nested_events: NestedEvent[];
}

// Calendar view mode
export type CalendarViewMode = 'personal' | 'shared';

// Container calendar block
export interface ContainerCalendarBlock {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  context_id: string;
  context_name: string;
  context_type: ContextType;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  projection_id: string | null;
  is_own_event: boolean;
  can_edit: boolean;
}

// Nested calendar item
export interface NestedCalendarItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  parent_event_id: string;
  parent_event_title: string;
  context_id: string;
  context_name: string;
  context_type: ContextType;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  projection_id: string | null;
  is_own_event: boolean;
  can_edit: boolean;
}

// Projection permission state
export interface ProjectionPermissionState {
  container_projection: {
    id: string | null;
    status: ProjectionStatus;
    scope: ProjectionScope;
  } | null;
  nested_projections: Array<{
    event_id: string;
    projection_id: string | null;
    status: ProjectionStatus;
    scope: ProjectionScope;
  }>;
}
```

### Updated Types

```typescript
// ContextEvent now includes:
export interface ContextEvent {
  // ... existing fields
  event_scope: EventScope;
  parent_context_event_id: string | null;
}

// CreateContextEventInput now includes:
export interface CreateContextEventInput {
  // ... existing fields
  event_scope?: EventScope;  // Defaults to 'item'
  parent_context_event_id?: string | null;
}
```

## Service Functions

### Container Event Operations

**File:** `src/lib/contextSovereign/contextEventsService.ts`

```typescript
// Create a container event (macro time block)
createContainerEvent(input: CreateContainerEventInput): Promise<ServiceResponse<ContainerEvent>>

// Get container event with nested children
getContainerEventWithChildren(containerEventId: string): Promise<ServiceResponse<ContextEventWithChildren>>

// Get all container events for a context
getContainerEvents(contextId: string, filters?: {...}): Promise<ServiceResponse<ContainerEvent[]>>
```

### Nested Event Operations

**File:** `src/lib/contextSovereign/contextEventsService.ts`

```typescript
// Create a nested event (micro detail inside container)
createNestedEvent(input: CreateNestedEventInput): Promise<ServiceResponse<NestedEvent>>

// Get nested events for a container
getNestedEvents(containerEventId: string): Promise<ServiceResponse<NestedEvent[]>>
```

### Projection Operations

**File:** `src/lib/contextSovereign/containerCalendarService.ts`

```typescript
// Project a container event to a calendar
projectContainerToCalendar(
  containerEventId: string,
  targetUserId: string,
  targetSpaceId: string | null,
  scope: ProjectionScope,
  createdBy: string
): Promise<ServiceResponse<void>>

// Project a nested event to a calendar (personal only)
projectNestedEventToCalendar(
  nestedEventId: string,
  targetUserId: string,
  scope: ProjectionScope,
  createdBy: string
): Promise<ServiceResponse<void>>
```

### Calendar View Functions

**File:** `src/lib/contextSovereign/containerCalendarService.ts`

```typescript
// Get calendar view for a specific mode
getCalendarView(
  userId: string,
  mode: CalendarViewMode,  // 'personal' | 'shared'
  filters?: {...}
): Promise<ServiceResponse<{
  containers: ContainerCalendarBlock[];
  nested_items: NestedCalendarItem[];
}>>

// Get projection permission state for container and nested events
getProjectionPermissionState(
  containerEventId: string,
  targetUserId: string
): Promise<ServiceResponse<ProjectionPermissionState>>
```

## Calendar Behavior Rules

### Personal Calendar
- **May show:**
  - Container blocks (e.g., "Trip to Amsterdam")
  - Nested items (if user has access)
- **User explicitly opts into:**
  - Container visibility
  - Nested visibility
- **Implementation:**
  - Filters projections where `target_space_id IS NULL`
  - Shows both `event_scope = 'container'` and `event_scope = 'item'`

### Shared Calendar
- **May show:**
  - Container blocks ONLY
- **MUST NEVER show:**
  - Nested events
  - Internal itinerary
  - Sensitive details
- **Implementation:**
  - Filters projections where `target_space_id IS NOT NULL`
  - Shows only `event_scope = 'container'`
  - Nested items are automatically filtered out

**Shared calendar answers:**
> "Is this person busy?"

**Not:**
> "What exactly are they doing?"

## Trip-Specific Application

### Example: Trip to Amsterdam

**Container Event:**
- `title`: "Trip to Amsterdam"
- `start_at`: "2026-02-02T00:00:00Z"
- `end_at`: "2026-02-09T23:59:59Z"
- `event_scope`: `'container'`
- `parent_context_event_id`: `null`

**Nested Events:**
- Flight (Feb 2, 10:00 AM)
- Hotel check-in (Feb 2, 3:00 PM)
- Museum visit (Feb 5, 2:00 PM)

**Projection Behavior:**
- Share container to Shared Space → shows single block
- Share nested items → only to Personal calendar of permitted users
- Nested items never appear in shared calendars

## Backward Compatibility

### Existing Events
- All existing `context_events` default to:
  - `event_scope = 'item'`
  - `parent_context_event_id = null`
- Existing queries continue to work
- No breaking changes to existing API

### Existing Services
- `createContextEvent()` still works (defaults to `'item'` scope)
- `getContextEvents()` returns all events (containers and items)
- Existing projection logic unchanged

### Migration Safety
- Additive changes only
- No destructive modifications
- Default values ensure backward compatibility
- RLS policies remain unchanged

## Safety & Constraints

✅ **Additive changes only**
✅ **Backward compatible**
✅ **No breaking migrations**
✅ **No auto-sharing**
✅ **No new calendar tables**
✅ **Respects existing RLS**
✅ **Default behavior unchanged unless explicitly used**

## Files Modified/Created

### Database
- `supabase/migrations/20260103000007_add_context_event_nesting.sql` (NEW)

### TypeScript Types
- `src/lib/contextSovereign/types.ts` (UPDATED)

### Services
- `src/lib/contextSovereign/contextEventsService.ts` (UPDATED)
- `src/lib/contextSovereign/containerCalendarService.ts` (NEW)
- `src/lib/personalSpaces/calendarService.ts` (UPDATED - filters by event_scope)

## Verification Checklist

- [x] Personal calendar still works
- [x] Shared calendar still works
- [x] Guardrails roadmap remains isolated
- [x] Trips now support container + nested logic
- [x] Existing events remain functional
- [x] No breaking changes
- [x] RLS policies intact
- [x] Backward compatibility maintained

## Next Steps (Future)

1. **UI Implementation:**
   - Container event creation UI
   - Nested event creation UI
   - Projection management UI
   - Calendar view with container/nested distinction

2. **Trip Integration:**
   - Auto-create container event when trip is created
   - Map itinerary items to nested events
   - Projection UI for trips

3. **Guardrails Integration:**
   - Map roadmap items to nested events
   - Project milestones as containers

4. **Permission Refinement:**
   - Implement `can_edit` checks in calendar views
   - Context permission checks for projections

