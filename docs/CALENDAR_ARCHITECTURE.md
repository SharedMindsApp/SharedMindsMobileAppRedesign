# SharedMinds Calendar Architecture

**Last Updated:** 2025-01-XX  
**Status:** Production  
**Purpose:** Comprehensive documentation of calendar systems, data flows, and integration patterns across SharedMinds

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Source of Truth](#source-of-truth)
3. [Calendar Systems Overview](#calendar-systems-overview)
4. [Personal Calendar (Planner + Personal Spaces)](#personal-calendar-planner--personal-spaces)
5. [Household Calendar (Spaces)](#household-calendar-spaces)
6. [Guardrails Calendar Integration](#guardrails-calendar-integration)
7. [Context-Based Calendar Projections](#context-based-calendar-projections)
8. [Shared Spaces Calendar](#shared-spaces-calendar)
9. [Permission System](#permission-system)
10. [UI Components & Views](#ui-components--views)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Integration Points](#integration-points)

---

## Executive Summary

SharedMinds implements a **multi-calendar architecture** with a single source of truth (`calendar_events` table) that serves multiple contexts:

- **Personal Calendar**: Used by both Planner and Personal Spaces, unified view
- **Household Calendar**: Shared family/household calendar in Spaces
- **Guardrails Calendar**: Project events that can optionally sync to personal calendar
- **Context Projections**: Trips, Projects, and other contexts can project events to calendars
- **Shared Spaces Calendar**: Permission-controlled calendar sharing within spaces

**Key Principle**: `calendar_events` is the **canonical time authority**. All systems project INTO the calendar; they do not own time independently.

---

## Source of Truth

### Database Table: `calendar_events`

**Location**: `supabase/migrations/*_create_calendar_events.sql`

**Schema**:
```sql
calendar_events (
  id: uuid (PK)
  household_id: uuid (FK → households) -- REQUIRED, NOT NULL
  created_by: uuid (FK → auth.users)
  title: text
  description: text
  start_at: timestamptz
  end_at: timestamptz
  all_day: boolean
  location: text
  color: text (enum: 'blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink')
  event_type: text (enum: 'event', 'meeting', 'appointment', 'time_block', 'goal', 'habit', 'meal', 'task', 'reminder', 'travel_segment', 'milestone')
  
  -- Source tracking (for Guardrails sync)
  source_type: text ('personal' | 'guardrails' | 'context')
  source_entity_id: uuid (nullable)
  source_project_id: uuid (nullable)
  
  -- Projection state (for activity-derived events)
  projection_state: text ('active' | 'hidden' | null)
  activity_id: uuid (nullable)
  
  created_at: timestamptz
  updated_at: timestamptz
)
```

**Related Tables**:
- `calendar_event_members`: Links events to household members
- `calendar_projections`: Manages context event projections (trips, projects)
- `calendar_sync_settings`: User preferences for Guardrails ↔ Personal sync

**Authority Hierarchy**:
```
calendar_events (CANONICAL TIME AUTHORITY)
    ↓
    ├─ Personal Calendar (Planner + Personal Spaces)
    ├─ Household Calendar (Spaces)
    ├─ Guardrails Projections (optional sync)
    └─ Context Projections (trips, projects)
```

---

## Calendar Systems Overview

### System Map

```
┌─────────────────────────────────────────────────────────────┐
│                    calendar_events                        │
│                  (Source of Truth)                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Personal   │   │  Household   │   │  Guardrails  │
│   Calendar   │   │   Calendar   │   │  (Projected)  │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Planner    │   │    Spaces    │   │  Projects    │
│   (Daily/    │   │   (Widget)   │   │  (Optional)  │
│  Weekly/     │   │              │   │              │
│  Monthly)    │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Calendar Types

| Calendar Type | Scope | Data Source | UI Location |
|--------------|-------|-------------|-------------|
| **Personal** | User | `calendar_events` (user_id) + projections | Planner, Personal Spaces |
| **Household** | Household | `calendar_events` (household_id) | Spaces (Calendar Widget) |
| **Guardrails** | Project | Projected from `roadmap_items` | Guardrails (optional sync) |
| **Context** | Context (Trip/Project) | `context_events` → projections | Personal Calendar (if accepted) |
| **Shared Space** | Space | `calendar_events` (household_id) + permissions | Shared Spaces |

---

## Personal Calendar (Planner + Personal Spaces)

### Overview

The **Personal Calendar** is a unified calendar system used by both:
- **Planner** (Daily, Weekly, Monthly views)
- **Personal Spaces** (Personal Calendar page)

**Key Principle**: One calendar, one mental model, shared across both contexts.

### Service Layer

**File**: `src/lib/personalSpaces/calendarService.ts`

**Core Functions**:
- `getPersonalCalendarEvents(userId)`: Fetch all personal events
- `getPersonalEventsForDateRange(userId, startDate, endDate)`: Fetch events for date range
- `createPersonalCalendarEvent(userId, input)`: Create new event
- `updatePersonalCalendarEvent(userId, eventId, input)`: Update event
- `deletePersonalCalendarEvent(userId, eventId)`: Delete event

**Data Flow**:
```
1. Fetch calendar_events WHERE user_id = userId
2. Filter by projection_state (active or null)
3. If CONTEXT_CALENDAR_ENABLED:
   - Fetch accepted calendar_projections
   - Merge context_events into result
4. Return unified PersonalCalendarEvent[]
```

### Data Model

**Type**: `PersonalCalendarEvent`

```typescript
interface PersonalCalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  sourceType: 'personal' | 'guardrails' | 'context';
  sourceEntityId: string | null;
  sourceProjectId: string | null;
  
  // Context projection metadata (if sourceType === 'context')
  contextId?: string;
  contextName?: string;
  contextType?: 'trip' | 'project' | 'personal' | 'shared_space';
  projectionId?: string;
  event_scope?: 'container' | 'item';
  parent_context_event_id?: string | null;
  
  // Permissions (from projection metadata)
  permissions?: CalendarProjectionPermissions;
  
  // Derived instances (habits, goals)
  is_derived_instance?: boolean;
  derived_type?: 'habit_instance' | 'task_instance' | 'goal_marker';
}
```

### Planner Integration

**Files**:
- `src/components/planner/PlannerDailyV2.tsx`
- `src/components/planner/PlannerWeekly.tsx`
- `src/components/planner/PlannerMonthly.tsx`

**How It Works**:
1. Planner views call `getPersonalEventsForDateRange()` with date range
2. Events are filtered by permissions (service layer enforcement)
3. Events are displayed in timeline/day/week/month views
4. Users can create/edit events directly from Planner

**Example (PlannerMonthly)**:
```typescript
const result = await getPersonalEventsForDateRangeWithExtras(
  user.id, 
  startDate, 
  endDate
);
const personalEvents = result.events;
// Apply permission filtering
const visibleEvents = personalEvents
  .map(event => enforceVisibility(event, event.permissions))
  .filter((e): e is PersonalCalendarEvent => e !== null);
```

### Personal Spaces Integration

**File**: `src/components/personal-spaces/PersonalCalendarPage.tsx`

**How It Works**:
1. Personal Calendar page calls `getPersonalCalendarEvents(userId)`
2. Displays events in list view (upcoming/past)
3. Shows pending projections (if `CONTEXT_CALENDAR_ENABLED`)
4. Users can accept/decline context projections
5. Full CRUD operations for personal events

### Calendar Extras (Habits/Goals)

**File**: `src/lib/calendar/calendarExtras.ts`

**Feature Flag**: `FEATURE_CALENDAR_EXTRAS`

When enabled, personal calendar includes:
- **Habit Instances**: Derived from activity schedules
- **Goal Deadlines**: Derived from goal target dates

These appear as `is_derived_instance: true` events in the calendar.

---

## Household Calendar (Spaces)

### Overview

The **Household Calendar** is a shared family/household calendar displayed in Spaces via the Calendar Widget.

### Service Layer

**File**: `src/lib/calendar.ts`

**Core Functions**:
- `getHouseholdEvents(householdId, startDate?, endDate?, filters?)`: Fetch household events
- `getUpcomingEvents(householdId, limit)`: Fetch upcoming events
- `getEventsByDateRange(householdId, startDate, endDate)`: Fetch events for range
- `createEvent(eventData)`: Create household event
- `updateEvent(eventId, updates)`: Update event
- `deleteEvent(eventId)`: Delete event

**Data Flow**:
```
1. Query calendar_events WHERE household_id = householdId
2. Join with calendar_event_members for member info
3. Apply filters (memberIds, colors, myEventsOnly)
4. Return CalendarEventWithMembers[]
```

### Data Model

**Type**: `CalendarEventWithMembers`

```typescript
interface CalendarEventWithMembers extends CalendarEvent {
  members: CalendarEventMember[];
  member_profiles?: {
    id: string;
    full_name: string;
    email: string;
  }[];
}
```

### Spaces Integration

**File**: `src/components/shared/CalendarWidgetCore.tsx`

**How It Works**:
1. Calendar Widget receives `householdId` prop
2. Calls `getHouseholdEvents()` or `getEventsByDateRange()`
3. Displays events in widget view (month/week/agenda/day)
4. Users can create/edit events (if permissions allow)
5. Events are scoped to household (all household members can see)

**Widget Modes**:
- `mode: 'fridge'`: Embedded widget in Spaces
- `mode: 'mobile'`: Mobile app view (now uses `CalendarMobileView`)
- Default: Desktop widget view

**View Modes**:
- `icon`: Icon-only display
- `mini`: Compact calendar grid
- `large`: Full calendar with month/week/day views
- `xlarge`: Expanded calendar view

---

## Guardrails Calendar Integration

### Overview

**Guardrails** (project management system) can optionally sync project events to the personal calendar.

**Key Principle**: One-way sync only (Guardrails → Calendar). Guardrails is the source of truth.

### Service Layer

**File**: `src/lib/guardrails/guardrailsCalendarSync.ts`

**Core Functions**:
- `syncRoadmapEventToCalendar(userId, item)`: Sync roadmap event
- `syncTaskToCalendar(userId, task)`: Sync task with dates
- `syncMindMeshEventToCalendar(userId, container)`: Sync Mind Mesh event (future)

### Sync Settings

**File**: `src/lib/calendarSyncSettings.ts`

**User Preferences**:
```typescript
interface CalendarSyncSettings {
  userId: string;
  
  // Guardrails → Personal Spaces (default: enabled)
  syncGuardrailsToPersonal: boolean;
  syncRoadmapEvents: boolean;
  syncTasksWithDates: boolean;
  syncMindMeshEvents: boolean;
  
  // Personal Spaces → Guardrails (default: disabled)
  syncPersonalToGuardrails: boolean;
  requireConfirmationForPersonalSync: boolean;
}
```

### Sync Rules

**What Gets Synced**:

1. **Roadmap Events** (`roadmap_items.type = 'event'`):
   - Only if `syncRoadmapEvents = true`
   - Creates `calendar_events` with `source_type='guardrails'`
   - Tracks via `source_entity_id` and `source_project_id`

2. **Tasks with Dates** (`roadmap_items.type = 'task'` + dates):
   - Only if `syncTasksWithDates = true`
   - Uses `dueAt` or `scheduledAt` as start time
   - Creates `calendar_events` with `source_type='guardrails'`

3. **Mind Mesh Events** (future):
   - Only if `syncMindMeshEvents = true`
   - Syncs Mind Mesh containers with dates

**Sync Behavior**:
- **Idempotent**: One calendar event per Guardrails entity
- **Deterministic**: No inference, no auto-repair
- **Respects Settings**: Checks `calendar_sync_settings` before syncing
- **Non-blocking**: Sync failures don't block Guardrails mutations

### Data Flow

```
Guardrails Entity (roadmap_item, task, etc.)
    ↓
Check calendar_sync_settings
    ↓ (if enabled)
Create/Update calendar_events
    ↓
source_type = 'guardrails'
source_entity_id = roadmap_item.id
source_project_id = master_project.id
    ↓
Appears in Personal Calendar (via getPersonalCalendarEvents)
```

### UI Integration

**Guardrails Sync Panel**:
- Users can toggle sync settings per project
- Read-only indicators show synced events
- Master/child toggle pattern for project-level control

**Personal Calendar**:
- Synced events appear with `sourceType: 'guardrails'`
- Badge shows "Linked to Guardrails"
- Users can view but editing happens in Guardrails

---

## Context-Based Calendar Projections

### Overview

**Contexts** (Trips, Projects, Shared Spaces) can project events to personal calendars via the `calendar_projections` system.

**Key Principle**: Opt-in only. Events are invisible until projection is accepted.

### Architecture

**Tables**:
- `context_events`: Events owned by contexts (trips, projects)
- `calendar_projections`: Manages visibility and permissions

**Service Layer**:
- `src/lib/contextSovereign/contextEventsService.ts`: Context event CRUD
- `src/lib/contextSovereign/containerCalendarService.ts`: Container event projections
- `src/lib/contextSovereign/projectionsService.ts`: Projection management

### Projection Model

**Type**: `CalendarProjection`

```typescript
interface CalendarProjection {
  id: string;
  event_id: string; // FK → context_events
  target_user_id: string; // Who can see this
  target_space_id: string | null; // Shared space (if applicable)
  
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  
  // Permissions (permission-sovereign model)
  can_edit: boolean; // Can target user edit?
  detail_level: 'overview' | 'detailed'; // How much detail?
  nested_scope: 'container' | 'container+items'; // Include nested events?
  scope: 'full' | 'title' | 'date_only'; // Legacy scope field
  
  created_by: string;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
}
```

### Permission-Sovereign Model

**Key Principle**: Permissions come ONLY from projection metadata. Calendar views do NOT define permissions.

**Permission Flags**:
```typescript
interface CalendarProjectionPermissions {
  can_view: boolean; // If projection is accepted
  can_edit: boolean; // Owner always true, others from projection
  can_manage: boolean; // Only owner
  detail_level: 'overview' | 'detailed';
  scope: 'this_only' | 'include_children';
}
```

**Service Layer Enforcement**:
1. Filter by `can_view`: Events with `can_view: false` are filtered out
2. Filter nested events by `scope`: If `scope === 'this_only'`, hide nested events
3. Strip detail by `detail_level`: If `detail_level === 'overview'`, hide description/location
4. Block mutations by `can_edit`: Service layer checks before allowing updates

### Data Flow

```
Context Event (trip, project, etc.)
    ↓
Create calendar_projection (status: 'pending')
    ↓
User sees pending projection in Personal Calendar
    ↓
User accepts projection (status: 'accepted')
    ↓
Event appears in Personal Calendar (via getPersonalCalendarEvents)
    ↓
If CONTEXT_CALENDAR_ENABLED:
  - fetchAcceptedProjections() merges context_events
  - Returns PersonalCalendarEvent with sourceType: 'context'
```

### Feature Flag

**File**: `src/lib/personalSpaces/calendarService.ts`

```typescript
const CONTEXT_CALENDAR_ENABLED = false; // Currently disabled
```

When `false`: Personal calendar shows only `calendar_events` (existing behavior)  
When `true`: Personal calendar includes accepted context projections

---

## Shared Spaces Calendar

### Overview

**Shared Spaces** can have calendar widgets that display household calendar events with permission-based access control.

### Permission Model

**File**: `src/lib/permissions/adapters/calendarEventAdapter.ts`

**How It Works**:
1. Calendar events are shared via `calendar_projections`
2. `target_space_id` indicates shared space target
3. Permissions are managed via `CalendarEventAdapter`
4. Uses unified `SharingDrawer` UI component

**Permission Flags**:
- `can_view`: Can see event in shared space
- `can_edit`: Can edit event (if owner or projection allows)
- `detail_level`: How much detail is visible
- `scope`: Whether nested events are included

### Data Flow

```
Calendar Event (household_id)
    ↓
Create calendar_projection
    ↓
target_space_id = space.id
target_user_id = null (for space-wide)
    ↓
Shared Space Calendar Widget
    ↓
Query calendar_projections WHERE target_space_id = space.id
    ↓
Filter by status = 'accepted'
    ↓
Display events with permission-based detail level
```

### UI Integration

**Shared Spaces Calendar Widget**:
- Uses same `CalendarWidgetCore` component
- Receives `householdId` from space
- Events filtered by space permissions
- Users can create events (if space permissions allow)

---

## Permission System

### Unified Permissions

**File**: `src/lib/permissions/types.ts`

**Canonical Types**:
```typescript
type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer';
type PermissionAccess = 'view' | 'comment' | 'edit' | 'manage';
type DetailLevel = 'overview' | 'detailed';
type ShareScope = 'this_only' | 'include_children';
```

**Permission Flags**:
```typescript
interface PermissionFlags {
  can_view: boolean;
  can_comment: boolean;
  can_edit: boolean;
  can_manage: boolean;
  detail_level: DetailLevel;
  scope: ShareScope;
}
```

### Calendar-Specific Permissions

**Calendar Projection Permissions**:
- Re-exported as `CalendarProjectionPermissions = PermissionFlags`
- Enforced at service layer (not UI)
- Computed from `calendar_projections` metadata

**Permission Computation**:
```typescript
function computePermissions(
  projection: CalendarProjection,
  event: ContextEvent,
  userId: string
): CalendarProjectionPermissions {
  // If not accepted, no access
  if (projection.status !== 'accepted') {
    return { can_view: false, ... };
  }
  
  // Owner always has full permissions
  const isOwner = event.created_by === userId;
  
  return {
    can_view: true,
    can_edit: isOwner || (projection.can_edit ?? false),
    can_manage: isOwner,
    detail_level: projection.detail_level || 'overview',
    scope: projection.nested_scope === 'container+items' 
      ? 'include_children' 
      : 'this_only',
  };
}
```

### Sharing UI

**File**: `src/components/sharing/SharingDrawer.tsx`

**Universal Sharing Drawer**:
- Works via adapters (`CalendarEventAdapter`)
- Tabs: Access | Visibility | Invites
- Search to add people, groups, spaces
- Permission controls (view/edit/detail level)

---

## UI Components & Views

### Component Hierarchy

```
Calendar Systems
├── Personal Calendar
│   ├── Planner Views
│   │   ├── PlannerDailyV2.tsx
│   │   ├── PlannerWeekly.tsx
│   │   └── PlannerMonthly.tsx
│   └── Personal Spaces
│       └── PersonalCalendarPage.tsx
│
├── Household Calendar
│   └── CalendarWidgetCore.tsx
│       ├── Month View
│       ├── Week View
│       ├── Day View
│       └── Agenda View
│
├── Mobile Calendar
│   └── CalendarMobileView.tsx
│       ├── Day View (Mobile)
│       └── Agenda View (Mobile)
│
└── Event Modals
    ├── EventModal.tsx (Full page)
    ├── EventModalCompact.tsx (Compact)
    └── EventDetailModal.tsx (View only)
```

### Component Details

#### 1. CalendarWidgetCore

**File**: `src/components/shared/CalendarWidgetCore.tsx`

**Purpose**: Desktop/widget calendar view for Spaces

**Props**:
```typescript
interface CalendarWidgetCoreProps {
  mode: 'fridge' | 'mobile' | default;
  householdId?: string;
  viewMode?: 'icon' | 'mini' | 'large' | 'xlarge';
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onNewEvent?: () => void;
}
```

**Data Source**: `getHouseholdEvents()` or `getEventsByDateRange()`

**Views**:
- Month: Grid calendar with event dots
- Week: Week timeline view
- Day: Day timeline view
- Agenda: Chronological list

#### 2. CalendarMobileView

**File**: `src/components/calendar/CalendarMobileView.tsx`

**Purpose**: Mobile-first calendar app experience

**Props**:
```typescript
interface CalendarMobileViewProps {
  householdId?: string;
}
```

**Features**:
- App-style sticky header
- Swipe gestures (left/right to navigate)
- Day View (primary): Vertical timeline
- Agenda View: Chronological list
- Month picker (bottom sheet)
- Bottom sheets for event creation

**Data Source**: `getHouseholdEvents()` or `getEventsByDateRange()`

#### 3. Planner Views

**Files**:
- `src/components/planner/PlannerDailyV2.tsx`
- `src/components/planner/PlannerWeekly.tsx`
- `src/components/planner/PlannerMonthly.tsx`

**Purpose**: Planner calendar integration

**Data Source**: `getPersonalEventsForDateRange()` or `getPersonalEventsForDateRangeWithExtras()`

**Features**:
- Daily: Hour-by-hour timeline
- Weekly: Week grid with events
- Monthly: Month grid with events
- Permission filtering (service layer)
- Calendar extras (habits/goals) if enabled

#### 4. PersonalCalendarPage

**File**: `src/components/personal-spaces/PersonalCalendarPage.tsx`

**Purpose**: Personal Spaces calendar page

**Data Source**: `getPersonalCalendarEvents()`

**Features**:
- List view (upcoming/past events)
- Pending projections (if `CONTEXT_CALENDAR_ENABLED`)
- Accept/decline projections
- Full CRUD for personal events
- Event badges (personal/guardrails/context)

#### 5. Event Modals

**Files**:
- `src/components/calendar/EventModal.tsx`: Full-page modal
- `src/components/calendar/EventModalCompact.tsx`: Compact modal
- `src/components/calendar/EventDetailModal.tsx`: View-only modal

**Purpose**: Create/edit/view calendar events

**Features**:
- Form inputs (title, description, dates, times)
- Member assignment
- Color selection
- Location
- All-day toggle

---

## Data Flow Diagrams

### Personal Calendar Flow

```
User Action (Planner/Personal Spaces)
    ↓
getPersonalCalendarEvents(userId)
    ↓
Query calendar_events WHERE user_id = userId
    ↓
Filter by projection_state (active or null)
    ↓
If CONTEXT_CALENDAR_ENABLED:
  Query calendar_projections WHERE target_user_id = userId AND status = 'accepted'
  Join context_events
  Merge with calendar_events
    ↓
Apply permission filtering (service layer)
    ↓
Return PersonalCalendarEvent[]
    ↓
Display in UI (Planner/Personal Spaces)
```

### Household Calendar Flow

```
User Action (Spaces Widget)
    ↓
getHouseholdEvents(householdId, startDate?, endDate?)
    ↓
Query calendar_events WHERE household_id = householdId
    ↓
Join calendar_event_members for member info
    ↓
Apply filters (memberIds, colors, myEventsOnly)
    ↓
Return CalendarEventWithMembers[]
    ↓
Display in CalendarWidgetCore
```

### Guardrails Sync Flow

```
Guardrails Entity Created/Updated
    ↓
Check calendar_sync_settings
    ↓
If sync enabled:
  syncRoadmapEventToCalendar() or syncTaskToCalendar()
    ↓
Check if calendar event exists (by source_entity_id)
    ↓
If exists: Update calendar_events
If not: Create calendar_events
    ↓
Set source_type = 'guardrails'
Set source_entity_id = roadmap_item.id
Set source_project_id = master_project.id
    ↓
Event appears in Personal Calendar (via getPersonalCalendarEvents)
```

### Context Projection Flow

```
Context Event Created (Trip/Project)
    ↓
Create calendar_projection (status: 'pending')
    ↓
User sees pending projection in Personal Calendar
    ↓
User accepts projection
    ↓
Update calendar_projection (status: 'accepted')
    ↓
If CONTEXT_CALENDAR_ENABLED:
  fetchAcceptedProjections() includes this event
    ↓
Event appears in Personal Calendar (via getPersonalCalendarEvents)
    ↓
Event has sourceType: 'context' and projection metadata
```

---

## Integration Points

### 1. Planner ↔ Personal Calendar

**Integration**: Direct service call

**Flow**:
- Planner views call `getPersonalEventsForDateRange()`
- Same service used by Personal Spaces
- Unified data model (`PersonalCalendarEvent`)

**Key Point**: Planner and Personal Spaces share the same calendar data source.

### 2. Spaces ↔ Household Calendar

**Integration**: Widget component

**Flow**:
- Spaces embed `CalendarWidgetCore` widget
- Widget receives `householdId` prop
- Calls `getHouseholdEvents()` or `getEventsByDateRange()`

**Key Point**: Household calendar is scoped to household, not user.

### 3. Guardrails ↔ Personal Calendar

**Integration**: Optional sync service

**Flow**:
- Guardrails entities trigger sync (if settings enabled)
- `guardrailsCalendarSync.ts` creates/updates `calendar_events`
- Events appear in Personal Calendar with `sourceType: 'guardrails'`

**Key Point**: One-way sync only. Guardrails is source of truth.

### 4. Contexts ↔ Personal Calendar

**Integration**: Projection system

**Flow**:
- Context events create `calendar_projections` (pending)
- Users accept/decline projections
- Accepted projections appear in Personal Calendar (if feature enabled)

**Key Point**: Opt-in only. Nothing auto-appears.

### 5. Shared Spaces ↔ Calendar

**Integration**: Permission-based sharing

**Flow**:
- Calendar events shared via `calendar_projections`
- `target_space_id` indicates shared space
- Permissions control visibility and editability

**Key Point**: Permission-sovereign model. Permissions come from projections.

---

## Summary

### Key Principles

1. **Single Source of Truth**: `calendar_events` is the canonical time authority
2. **Projection Model**: Other systems project INTO the calendar, they don't own time
3. **Unified Personal Calendar**: Planner and Personal Spaces share the same calendar
4. **Permission-Sovereign**: Permissions come from projections, not calendar types
5. **Opt-In Only**: Context projections require explicit acceptance
6. **User Control**: Sync settings control Guardrails ↔ Personal flow

### Calendar Types Summary

| Type | Scope | Source | UI | Permissions |
|------|-------|--------|----|-----------| 
| Personal | User | `calendar_events` (user_id) | Planner, Personal Spaces | User-owned (full) |
| Household | Household | `calendar_events` (household_id) | Spaces Widget | Household members |
| Guardrails | Project | Projected from `roadmap_items` | Personal Calendar (if synced) | Sync settings |
| Context | Context | `context_events` → projections | Personal Calendar (if accepted) | Projection metadata |
| Shared Space | Space | `calendar_events` + projections | Shared Spaces Widget | Projection permissions |

### Service Files Reference

- `src/lib/calendar.ts`: Household calendar service
- `src/lib/personalSpaces/calendarService.ts`: Personal calendar service
- `src/lib/guardrails/guardrailsCalendarSync.ts`: Guardrails sync service
- `src/lib/contextSovereign/contextEventsService.ts`: Context events service
- `src/lib/contextSovereign/containerCalendarService.ts`: Container projections
- `src/lib/contextSovereign/projectionsService.ts`: Projection management
- `src/lib/permissions/adapters/calendarEventAdapter.ts`: Calendar sharing adapter
- `src/lib/calendarSyncSettings.ts`: Sync settings service

---

**End of Document**
