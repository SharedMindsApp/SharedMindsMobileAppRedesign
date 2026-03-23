
# Personal Spaces Consumption Model

## Overview

This document defines the architecture for how Personal Spaces (Calendar, Tasks, Habits, Notes, Goals) consume, reference, and derive data from Guardrails without ever becoming a source of truth.

**Core Principle: Guardrails is Authoritative. Personal Spaces are Consumption Layers.**

## Key Principles

### 1. Guardrails is the Source of Truth
- All authoritative data lives in Guardrails (Tracks, Roadmap Items, etc.)
- Personal Spaces never mutate Guardrails data
- No "write-back" logic exists or will exist
- Changes must originate in Guardrails

### 2. Consumption is Explicit and Opt-In
- Nothing auto-appears in Personal Spaces
- Users explicitly link Guardrails entities to Personal Spaces
- All links originate from Guardrails (via Personal Bridge)
- Users control what, when, and how data is consumed

### 3. Consumption ≠ Sync
- Personal Spaces reference or derive data
- They do not "own" the data
- Multiple consumption modes exist (reference, derived, shadowed)
- Consumption is read-only at the architectural level

### 4. User Autonomy
- Each user decides:
  - What appears in their Personal Spaces
  - Where it appears (which space)
  - Whether it's visible, muted, or hidden
  - How it's interpreted (consumption mode)

### 5. Future-Ready Architecture
- Supports future automation, AI, and analytics
- No schema rewrites needed for extensions
- Analytics metadata collected from day one
- Backward compatible with existing systems

---

## Consumption Modes

### Three Consumption Modes

```typescript
type PersonalConsumptionMode =
  | 'reference'   // Read-only mirror of Guardrails data
  | 'derived'     // Local projection with computed metadata
  | 'shadowed';   // User has hidden from their Personal Space
```

### Mode Definitions

#### 1. Reference Mode
**Behavior:** Read-only mirror of Guardrails data

**Use Cases:**
- Calendar events mirroring Guardrails milestones
- Tasks referencing Guardrails roadmap items
- Notes displaying Guardrails documentation

**Rules:**
- Displays Guardrails data as-is
- Visual state may change based on status
- No local edits or computations
- Direct 1:1 relationship with source

**Example:**
```typescript
// Guardrails Roadmap Item
{
  id: 'abc',
  title: 'Launch MVP',
  status: 'in_progress',
  startDate: '2025-01-01',
  endDate: '2025-03-01'
}

// Personal Space (Calendar) - Reference Mode
{
  link: { consumptionMode: 'reference', ... },
  sourceData: <Guardrails Item>,
  derivedState: {
    sourceStatus: 'in_progress',
    deadlineState: 'on_track',
    isCompleted: false,
    isOverdue: false
  }
}
```

#### 2. Derived Mode
**Behavior:** Local projection with computed metadata

**Use Cases:**
- Habit tracking with streaks (computed from Guardrails habit definition)
- Goal progress (computed from Guardrails goal + local tracking)
- Task checklists (local breakdown of Guardrails task)

**Rules:**
- Stores computed metadata locally
- Metadata never overwrites Guardrails data
- Retains link to source entity
- Supports local state (e.g., habit completion dates)

**Example:**
```typescript
// Guardrails Roadmap Item (Habit)
{
  id: 'xyz',
  title: 'Morning Meditation',
  type: 'habit',
  status: 'in_progress',
  metadata: {
    recurrencePattern: { frequency: 'daily' }
  }
}

// Personal Space (Habits) - Derived Mode
{
  link: {
    consumptionMode: 'derived',
    derivedMetadata: {
      currentStreak: 7,
      longestStreak: 14,
      completionRate: 0.85,
      lastCompletedAt: '2025-12-12T08:00:00Z'
    }
  },
  sourceData: <Guardrails Item>,
  derivedState: {
    sourceStatus: 'in_progress',
    currentStreak: 7,
    longestStreak: 14,
    completionRate: 0.85
  }
}
```

#### 3. Shadowed Mode
**Behavior:** User has hidden this from their Personal Space

**Use Cases:**
- User doesn't want to see completed items
- Temporarily hiding irrelevant Guardrails items
- User prefers managing this elsewhere

**Rules:**
- Link remains active but hidden
- No queries return shadowed items
- Easily reversible
- Does not affect Guardrails or other users

**Example:**
```typescript
{
  link: {
    consumptionMode: 'shadowed',
    visibilityState: 'hidden'
  },
  // Not returned in consumption queries
}
```

### Default Modes by Space

| Personal Space | Default Mode | Reason |
|----------------|--------------|--------|
| Calendar | `reference` | Direct display of events/milestones |
| Tasks | `reference` | Mirror Guardrails task status |
| Habits | `derived` | Requires local tracking (streaks) |
| Goals | `derived` | Requires progress tracking |
| Notes | `reference` | Read-only content display |

---

## Personal Space Interpretation Rules

### How Each Space Interprets Guardrails Data

#### Calendar
**Purpose:** Display time-based Guardrails entities

**Eligible Sources:**
- Roadmap Items: `event`, `milestone`, `task`, `goal`
- Tracks: Not eligible

**Consumption Modes:** `reference`, `shadowed`

**Derived Fields:**
- `startDate`, `endDate` (from source)
- `allDay` (from metadata or derived)
- `location` (from metadata)
- `visualColor` (computed from status/type)

**Read-Only Fields:**
- `title`, `description`, `status`, `startDate`, `endDate`

**Behavior:**
- Items appear as calendar entries
- Visual color changes based on status
- Completed items can be auto-hidden
- Overdue items show warning indicator

**Example Query:**
```typescript
const calendarItems = await getConsumedItemsForCalendar(userId);
// Returns array of calendar-ready items with derived visual states
```

---

#### Tasks
**Purpose:** Display actionable Guardrails items

**Eligible Sources:**
- Roadmap Items: `task`, `milestone`
- Tracks: Not eligible

**Consumption Modes:** `reference`, `derived`, `shadowed`

**Derived Fields:**
- `priority` (from metadata or computed)
- `checklist` (from metadata)
- `estimatedDuration` (from metadata)

**Read-Only Fields:**
- `title`, `description`, `status`, `endDate`

**Behavior:**
- Items appear as actionable tasks
- Status mirrors Guardrails status
- Can derive local checklists
- Deadline state computed from Guardrails dates

**Example Query:**
```typescript
const taskItems = await getConsumedItemsForTasks(userId);
const overdueTasks = getOverdueItems(taskItems);
```

---

#### Habits
**Purpose:** Track recurring Guardrails habits with local completion data

**Eligible Sources:**
- Roadmap Items: `habit`
- Tracks: Not eligible

**Consumption Modes:** `derived`, `shadowed`

**Derived Fields (Computed Locally):**
- `currentStreak` (days in a row)
- `longestStreak` (best streak ever)
- `completionRate` (percentage completed)
- `lastCompletedAt` (timestamp)
- `recurrencePattern` (from source metadata)

**Read-Only Fields:**
- `title`, `description`, `status`

**Behavior:**
- Guardrails defines the habit (what, when)
- Personal Space tracks completions (derived)
- Streaks computed locally
- Source status remains authoritative

**Important:** Habit completions are stored in `derivedMetadata`, NOT in Guardrails.

**Example Query:**
```typescript
const habitItems = await getConsumedItemsForHabits(userId);
// Each item includes currentStreak, completionRate, etc.
```

---

#### Goals
**Purpose:** Track progress toward Guardrails-defined goals

**Eligible Sources:**
- Roadmap Items: `goal`
- Tracks: Yes (track as goal)

**Consumption Modes:** `reference`, `derived`, `shadowed`

**Derived Fields (Computed Locally):**
- `targetValue` (from source)
- `currentValue` (tracked locally)
- `unit` (from source metadata)
- `progressPercentage` (computed)

**Read-Only Fields:**
- `title`, `description`, `status`, `startDate`, `endDate`

**Behavior:**
- Guardrails defines target and timeline
- Personal Space tracks current progress
- Progress never writes back to Guardrails
- Visual progress bars computed from local state

**Example Query:**
```typescript
const goalItems = await getConsumedItemsForGoals(userId);
// Includes progressPercentage, currentValue, etc.
```

---

#### Notes
**Purpose:** Display Guardrails documentation and notes

**Eligible Sources:**
- Roadmap Items: `note`, `document`, `review`
- Tracks: Not eligible

**Consumption Modes:** `reference`, `derived`, `shadowed`

**Derived Fields (Computed Locally):**
- `wordCount` (computed from description)
- `lastEditedAt` (timestamp)
- `tags` (local organization)

**Read-Only Fields:**
- `title`, `description`

**Behavior:**
- Pure read-only display
- No local editing of source content
- Can add local tags/annotations
- Source content remains in Guardrails

**Example Query:**
```typescript
const noteItems = await getConsumedItemsForNotes(userId);
// Read-only notes with computed metadata
```

---

## Eligibility Matrix

### Roadmap Item Types → Personal Spaces

| Roadmap Item Type | Calendar | Tasks | Habits | Goals | Notes |
|-------------------|----------|-------|--------|-------|-------|
| `task` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `event` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `milestone` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `goal` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `habit` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `note` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `document` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `review` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `photo` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `grocery_list` | ❌ | ❌ | ❌ | ❌ | ❌ |

### Tracks → Personal Spaces

| Source Type | Calendar | Tasks | Habits | Goals | Notes |
|-------------|----------|-------|--------|-------|-------|
| Track | ❌ | ❌ | ❌ | ✅ | ❌ |

*Goals is the only space that can consume entire Tracks as goal entities.*

---

## Visibility & Filtering Layer

### Visibility States

```typescript
type PersonalVisibilityState =
  | 'visible'     // Normal display
  | 'hidden'      // User has hidden
  | 'muted'       // Temporarily suppressed
  | 'pinned';     // User has prioritized
```

### Visibility Rules

**Visible:**
- Default state
- Item appears in consumption queries
- Normal sorting and display

**Hidden:**
- User-initiated hide
- Does not appear in consumption queries
- Link remains active
- Easily reversible

**Muted:**
- Temporarily suppressed
- Similar to hidden but implies temporary
- Useful for "snooze" functionality
- Does not appear in default queries

**Pinned:**
- User has prioritized
- Appears at top of lists
- Higher visual prominence
- Included in consumption queries

### Visibility APIs

```typescript
// Hide a link
await hideLink(linkId);

// Show a link
await showLink(linkId);

// Mute a link
await muteLink(linkId);

// Pin a link
await pinLink(linkId);

// Bulk hide all completed
await hideAllCompletedForSpace(userId, 'tasks');

// Unhide all for a space
await unhideAllForSpace(userId, 'tasks');
```

### Filtering

```typescript
interface VisibilityFilter {
  includeVisible?: boolean;    // default: true
  includeHidden?: boolean;     // default: false
  includeMuted?: boolean;      // default: false
  includePinned?: boolean;     // default: true
}

const visibleLinks = filterLinksByVisibility(links, {
  includeVisible: true,
  includePinned: true,
  includeHidden: false,
  includeMuted: false
});
```

---

## Status & Deadline Propagation (Read-Only)

### How Status Affects Personal Spaces

**Status Flow: Guardrails → Personal Space Visual State**

| Guardrails Status | Visual State in Personal Space |
|-------------------|-------------------------------|
| `not_started` | Gray, low priority display |
| `in_progress` | Blue, active indicator |
| `completed` | Green, checkmark, auto-hide option |
| `blocked` | Red, alert indicator |
| `cancelled` | Strikethrough, auto-hide |
| `archived` | Hidden by default |

### Deadline State Computation

```typescript
type DeadlineState = 'on_track' | 'due_soon' | 'overdue' | 'none';

function computeDeadlineState(item: RoadmapItem): DeadlineState {
  const deadline = item.endDate || item.startDate;
  if (!deadline) return 'none';

  const daysUntil = calculateDaysUntil(deadline);

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 7) return 'due_soon';
  return 'on_track';
}
```

**Visual Indicators:**
- `overdue`: Red badge, alert icon
- `due_soon`: Yellow badge, clock icon
- `on_track`: No special indicator
- `none`: No deadline tracking

### Derived State Structure

```typescript
interface PersonalDerivedState {
  sourceStatus: RoadmapItemStatus;      // Mirror from Guardrails
  deadlineState: DeadlineState;         // Computed locally
  lastSyncedAt: string;                 // Timestamp
  isCompleted: boolean;                 // Computed flag
  isOverdue: boolean;                   // Computed flag
}
```

**Key Point:** Derived state is computed, not synced. Changes to Guardrails status are reflected on next query.

---

## Data Flow Diagrams

### Reference Mode Flow

```
┌─────────────────────┐
│ Guardrails          │
│ Roadmap Item        │
│ (Source of Truth)   │
└──────────┬──────────┘
           │
           │ User creates link
           ▼
┌─────────────────────────────┐
│ guardrails_personal_links   │
│ - consumption_mode:         │
│   'reference'               │
│ - visibility_state:         │
│   'visible'                 │
└──────────┬──────────────────┘
           │
           │ Consumption Query
           ▼
┌─────────────────────────────┐
│ Personal Space              │
│ (Calendar/Tasks/Notes)      │
│                             │
│ Displays:                   │
│ - Title (read-only)         │
│ - Description (read-only)   │
│ - Status (visual indicator) │
│ - Dates (read-only)         │
└─────────────────────────────┘
           │
           │ No write-back
           ▼
     User views only
```

### Derived Mode Flow

```
┌─────────────────────┐
│ Guardrails          │
│ Roadmap Item (Habit)│
│ (Source of Truth)   │
└──────────┬──────────┘
           │
           │ User creates link
           ▼
┌──────────────────────────────┐
│ guardrails_personal_links    │
│ - consumption_mode: 'derived'│
│ - derived_metadata:          │
│   {                          │
│     currentStreak: 0,        │
│     completionRate: 0        │
│   }                          │
└──────────┬───────────────────┘
           │
           │ Consumption Query
           ▼
┌──────────────────────────────┐
│ Personal Space (Habits)      │
│                              │
│ Displays:                    │
│ - Title (from Guardrails)    │
│ - Current Streak (local)     │
│ - Completion Rate (local)    │
│                              │
│ User marks complete ───────┐ │
└──────────────────────────┬─┘ │
           │               │   │
           │               │   │ Updates derived_metadata
           │               ▼   │
           │        ┌──────────┴──────┐
           │        │ Local State Only│
           │        │ No Guardrails   │
           │        │ Mutation        │
           │        └─────────────────┘
           │
           │ Source data unchanged
           ▼
┌─────────────────────┐
│ Guardrails          │
│ (Unchanged)         │
└─────────────────────┘
```

### Shadowed Mode Flow

```
┌─────────────────────┐
│ Guardrails          │
│ Roadmap Item        │
└──────────┬──────────┘
           │
           │ User hides item
           ▼
┌──────────────────────────────┐
│ guardrails_personal_links    │
│ - consumption_mode:          │
│   'shadowed'                 │
│ - visibility_state: 'hidden' │
└──────────┬───────────────────┘
           │
           │ Consumption Query
           ▼
     Not Returned
           │
           │ User can unhide anytime
           ▼
┌─────────────────────┐
│ User's Personal     │
│ Space (Empty for    │
│ this item)          │
└─────────────────────┘
```

---

## Consumption Query APIs

### Space-Specific Queries

```typescript
// Get all consumed items for a space
const calendarItems = await getConsumedItemsForCalendar(userId);
const taskItems = await getConsumedItemsForTasks(userId);
const habitItems = await getConsumedItemsForHabits(userId);
const goalItems = await getConsumedItemsForGoals(userId);
const noteItems = await getConsumedItemsForNotes(userId);

// Generic query
const items = await getConsumedItemsForSpace(userId, 'calendar');
```

### Filtered Queries

```typescript
// Get only Guardrails roadmap items
const roadmapItems = await getGuardrailsItemsInCalendar(userId);

// Get pinned items
const pinned = await getPinnedLinksForSpace(userId, 'tasks');

// Get hidden items
const hidden = await getHiddenLinksForSpace(userId, 'habits');

// Get visible items (default)
const visible = await getVisibleLinksForSpace(userId, 'goals');
```

### Status-Based Queries

```typescript
const items = await getConsumedItemsForTasks(userId);

// Filter by status
const grouped = groupConsumedItemsByStatus(items);
// { not_started: [], in_progress: [], completed: [], blocked: [], other: [] }

// Get overdue items
const overdue = getOverdueItems(items);

// Get due soon
const dueSoon = getDueSoonItems(items);

// Get completed
const completed = getCompletedItems(items);
```

### Validity Checks

```typescript
// Get invalid links (source no longer exists)
const invalid = await getInvalidLinks(userId);

// Get stale links (not queried in 30+ days)
const stale = await getStaleLinks(userId, 30);

// Get orphaned links (never queried)
const orphaned = await getOrphanedLinks(userId);
```

---

## Analytics & Future Automation

### Analytics Metadata (Collected Automatically)

**Per Link:**
- `last_consumed_at`: Timestamp of last consumption query
- `consumption_count`: Number of times queried
- `consumption_mode`: How user interprets this link
- `visibility_state`: Current visibility preference
- `derived_metadata`: Space-specific local state

**Use Cases:**
- Identify stale links (never or rarely used)
- Detect orphaned links (created but never queried)
- Measure engagement per space
- Prioritize future automation

### Consumption Analytics API

```typescript
const analytics = await getConsumptionAnalytics(userId);

interface ConsumptionAnalytics {
  totalLinks: number;
  activeLinks: number;
  linksBySpace: Record<PersonalSpaceType, number>;
  linksByMode: Record<PersonalConsumptionMode, number>;
  linksByVisibility: Record<PersonalVisibilityState, number>;
  staleLinks: number;
  orphanedLinks: number;
  averageConsumptionCount: number;
}
```

**Example Output:**
```json
{
  "totalLinks": 47,
  "activeLinks": 42,
  "linksBySpace": {
    "calendar": 12,
    "tasks": 18,
    "habits": 5,
    "goals": 4,
    "notes": 3
  },
  "linksByMode": {
    "reference": 30,
    "derived": 10,
    "shadowed": 2
  },
  "linksByVisibility": {
    "visible": 35,
    "hidden": 4,
    "muted": 1,
    "pinned": 2
  },
  "staleLinks": 3,
  "orphanedLinks": 1,
  "averageConsumptionCount": 12.4
}
```

### Future Automation (NOT IMPLEMENTED)

The architecture supports future features such as:

**Auto-Hide Completed:**
- Automatically hide completed items after 7 days
- User can disable per space
- Uses `visibility_state` without affecting Guardrails

**Smart Suggestions:**
- "You haven't viewed this habit in 30 days. Hide it?"
- Uses `last_consumed_at` and `consumption_count`

**AI Prioritization:**
- Use analytics to suggest what to pin/mute
- Based on usage patterns and deadline states

**Stale Link Cleanup:**
- Notify user of orphaned or stale links
- Suggest revoking unused links

**Important:** None of these are implemented. Architecture is ready for them.

---

## Database Schema

### Table: `guardrails_personal_links`

**Existing Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `master_project_id` (uuid, references master_projects)
- `source_type` (enum: track, roadmap_item)
- `source_id` (uuid)
- `target_space_type` (enum: calendar, tasks, habits, notes, goals)
- `target_entity_id` (uuid, nullable)
- `is_active` (boolean)
- `created_at` (timestamptz)
- `revoked_at` (timestamptz, nullable)

**New Consumption Columns:**
- `consumption_mode` (enum: reference, derived, shadowed)
- `visibility_state` (enum: visible, hidden, muted, pinned)
- `derived_metadata` (jsonb, default: {})
- `last_consumed_at` (timestamptz, nullable)
- `consumption_count` (integer, default: 0)

**Indexes:**
- `idx_gpl_visibility` (user_id, visibility_state) WHERE is_active
- `idx_gpl_consumption_mode` (consumption_mode, target_space_type) WHERE is_active
- `idx_gpl_last_consumed` (last_consumed_at DESC) WHERE is_active

**Migration:** `supabase/migrations/20251212_add_personal_spaces_consumption_model.sql`

---

## Service Layer Files

### Type System
**File:** `src/lib/personalSpaces/consumptionTypes.ts`
- Defines all consumption types
- Consumption modes, visibility states
- Derived state interfaces per space
- Query and analytics types

### Consumption Service
**File:** `src/lib/personalSpaces/consumptionService.ts`
- Core CRUD operations for personal links
- Consumption tracking functions
- Analytics computation
- Deadline state computation

### Interpretation Rules
**File:** `src/lib/personalSpaces/interpretationRules.ts`
- Defines consumption rules per space
- Eligibility matrix
- Derived state computation per space
- Default modes and supported modes

### Visibility Service
**File:** `src/lib/personalSpaces/visibilityService.ts`
- Visibility state management
- Hide/show/mute/pin operations
- Bulk visibility updates
- Visibility filtering

### Consumption Queries
**File:** `src/lib/personalSpaces/consumptionQueries.ts`
- High-level query APIs per space
- Status-based filtering
- Validity checks
- Grouped queries

---

## What This Does NOT Do

### No UI
- This is pure architecture
- No UI components created
- No UI changes to existing views
- UI implementation is future work

### No Sync Engines
- No background sync jobs
- No automatic propagation
- No polling or webhooks
- Consumption is query-based, on-demand

### No Automation
- No auto-hide logic running
- No smart suggestions active
- No AI prioritization
- Architecture is ready, but not active

### No Notifications
- No alerts when Guardrails changes
- No reminders for overdue items
- No push notifications
- Future feature, not current scope

### No Bidirectional Edits
- Personal Spaces cannot edit Guardrails
- No write-back, ever
- Derived metadata stays local
- Guardrails remains sole owner

### No New Permissions
- Uses existing project permissions
- No new RLS policies for consumption
- Inherits from existing access control

---

## Integration Points

### Compatible Systems

✅ **Guardrails Roadmap:** Primary source for consumption
✅ **Guardrails Tracks:** Can be consumed by Goals space
✅ **Personal Bridge:** Links created via existing bridge
✅ **Project Permissions:** Consumption respects project access
✅ **Task Flow:** Independent system, no conflicts

### Independent From

- Task Flow sync (separate concern)
- Mind Mesh connections (different graph)
- Focus Mode (different workflow)
- Regulation Engine (different rules)

---

## Success Criteria

✅ **Guardrails remains authoritative**
- No write-back logic exists
- All changes originate in Guardrails
- Personal Spaces are read-only at architectural level

✅ **Personal Spaces consume data safely**
- Three consumption modes implemented
- Interpretation rules defined per space
- Derived metadata stored separately

✅ **Users have full autonomy**
- Visibility controls per link
- Consumption mode per link
- No forced behavior

✅ **No sync complexity introduced**
- Query-based, on-demand consumption
- No background jobs
- No event-driven propagation

✅ **Architecture is future-proof**
- Analytics metadata collected
- Extensible for automation
- No schema rewrites needed

✅ **No UI changes**
- Pure architecture
- UI is future work

✅ **Build passes**
- Zero compilation errors
- Type-safe implementation
- Backward compatible

---

## Summary

The Personal Spaces Consumption Model establishes a clear, safe, and extensible architecture for how Personal Spaces consume Guardrails data. By introducing consumption modes (reference, derived, shadowed), visibility controls, and space-specific interpretation rules, the system enables users to bring Guardrails data into their personal workflows without compromising the single source of truth.

**Core Achievement:** Personal Spaces can now safely consume, reference, and derive from Guardrails while maintaining zero write-back capability and full user autonomy.

**Next Steps:** UI implementation can proceed with confidence that the underlying architecture enforces safe consumption patterns.
