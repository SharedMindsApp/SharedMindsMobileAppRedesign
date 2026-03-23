# Calendar Authority & Sync Settings

**Status**: Foundation work only (no syncing logic implemented yet)
**Created**: 2025-12-17
**Purpose**: Establish canonical calendar authority and user-controlled sync settings

---

## Why calendar_events is Canonical

`calendar_events` is the **single source of truth** for all time-based data in the system.

### Authority Hierarchy

```
calendar_events (CANONICAL TIME AUTHORITY)
    ↓
    ├─ Roadmap items with dates reference calendar_events
    ├─ Tasks with dates reference calendar_events
    ├─ Mind Mesh events reference calendar_events
    └─ Personal Spaces time blocks reference calendar_events
```

### Rationale

1. **Single Source of Truth**: One canonical calendar prevents conflicting time data
2. **Clear Ownership**: calendar_events owns time; other systems project into it
3. **Consistent Time Logic**: All date/time calculations reference the same authority
4. **Predictable Updates**: Changes to calendar_events cascade to dependent systems
5. **Clear Boundaries**: Other systems can read time but don't own it

**Prime Rule**: If it has a date or time, it references calendar_events. Other systems PROJECT INTO the calendar, they do not own time.

---

## Why Sync is User-Controlled

Users have **explicit control** over what flows between Guardrails and Personal Spaces through `calendar_sync_settings`.

### User Agency Principles

1. **Explicit Over Implicit**: Users choose what syncs, nothing happens automatically by default beyond safe defaults
2. **Granular Control**: Per-feature toggles (roadmap events, tasks with dates, mind mesh events)
3. **Directional Preferences**: Control what goes where (Guardrails → Personal Spaces vs. Personal Spaces → Guardrails)
4. **Confirmation Gates**: Optional confirmation required before syncing personal content to work contexts

### Default Settings Philosophy

```typescript
// Guardrails → Personal Spaces (default: enabled)
sync_guardrails_to_personal: true
sync_roadmap_events: true
sync_tasks_with_dates: true
sync_mindmesh_events: true

// Personal Spaces → Guardrails (default: disabled)
sync_personal_to_guardrails: false
require_confirmation_for_personal_sync: true
```

**Why These Defaults?**
- Guardrails is work-focused, structured, and benefits from appearing in personal views
- Personal Spaces is private, unstructured, and should stay compartmentalized by default
- Users can override any setting through explicit UI controls (future prompt)

---

## Why Personal Spaces Defaults to Private

Personal Spaces is the user's **private thinking space** and should not feed back into structured work systems by default.

### Privacy-First Design

1. **Safe by Default**: Personal content stays personal unless user explicitly shares it
2. **Cognitive Separation**: Work (Guardrails) and personal life remain distinct by default
3. **User Control**: If a user wants personal events in Guardrails, they must opt in
4. **Context Boundaries**: Prevents accidental exposure of personal information in work contexts

### Example Use Case

- User creates personal calendar event "Doctor appointment"
- By default, this stays in Personal Spaces only
- Does NOT appear in Guardrails roadmaps or task lists
- User can opt in to sync if they want work planning to consider personal time

---

## Why Guardrails Defaults to Syncing Outward

Guardrails is the **structured work planning system** and benefits from appearing in personal calendar views by default.

### Outward Flow Rationale

1. **Work Visibility**: Users need to see work commitments in their personal calendar
2. **Time Blocking**: Work tasks appearing in calendar enables effective time management
3. **Context Switching**: Seeing work items in personal view helps with transitions
4. **Holistic Planning**: Personal calendar becomes a unified view of all commitments

### Example Use Case

- User creates roadmap task "Deploy v2.0 to production" with due date
- By default, this appears in Personal Spaces calendar
- User sees work deadline alongside personal appointments
- Can choose to disable this per Guardrails project if needed (future prompt)

---

## Sync ≠ Visibility ≠ Sharing

**These are three distinct concepts** with different boundaries and permissions:

### Sync (What We're Building)

- **Definition**: Bidirectional or unidirectional data flow between systems
- **User Control**: Controlled by `calendar_sync_settings` table
- **Scope**: Between Guardrails and Personal Spaces only
- **Implementation**: Foundation in place, sync logic not implemented yet

### Visibility (Existing System)

- **Definition**: What you can see based on permissions and context
- **User Control**: Controlled by RLS policies, project membership, household membership
- **Scope**: Within a single system (e.g., who sees what in Guardrails)
- **Implementation**: Already implemented via RLS and permission systems

### Sharing (Existing System)

- **Definition**: Explicitly publishing content to shared spaces or collaborators
- **User Control**: Controlled by explicit user actions (share buttons, invites)
- **Scope**: Publishing personal or project content to specific audiences
- **Implementation**: Already implemented via shared spaces, invitations, collaboration

### Why This Matters

```
❌ BAD: "I want to sync my calendar with my team"
   → Confusion between sync (data flow) and sharing (collaboration)

✅ GOOD: "I want Guardrails tasks to appear in my Personal Spaces calendar"
   → Clear understanding: sync from Guardrails to Personal Spaces

✅ GOOD: "I want to share this task with my team"
   → Clear understanding: sharing (collaboration), not sync
```

**Key Principle**: Sync is about **data flow between YOUR systems**. Sharing is about **publishing to OTHER PEOPLE**. Visibility is about **what you can see based on permissions**.

---

## Implementation Status

### ✅ PROMPT 1: Foundation (Completed)

1. **Database Schema**: `calendar_sync_settings` table with user preferences
2. **Service Layer**: `calendarSyncSettings.ts` with read-only access
3. **Integration Points**: Wired into Daily Alignment, Guardrails, and Mind Mesh
4. **Documentation**: Calendar authority principles established

### ✅ PROMPT 2: Guardrails → Calendar Sync (Completed)

1. **Database Schema**: Added source attribution columns to `calendar_events`
   - `source_type`: 'roadmap_event', 'task', 'mindmesh_event'
   - `source_entity_id`: ID of Guardrails entity
   - `source_project_id`: Foreign key to master_projects
   - `source_track_id`: Foreign key to guardrails_tracks
   - Unique constraint ensures idempotency (one calendar event per source)

2. **Sync Service**: `guardrails/guardrailsCalendarSync.ts`
   - `syncRoadmapEventToCalendar()`: Syncs roadmap events (type='event')
   - `syncTaskToCalendar()`: Syncs tasks with dates (dueAt/scheduledAt)
   - `syncMindMeshEventToCalendar()`: Syncs integrated Mind Mesh containers
   - `deleteCalendarEventForSource()`: Removes calendar events when source deleted
   - Respects user's calendar_sync_settings
   - Returns explicit results: synced, skipped, or failed
   - Idempotent and deterministic

3. **Execution Wiring**:
   - **Roadmap Service**: Syncs events on create/update/delete
   - **Task Flow**: Handled via roadmap service (tasks are roadmap items)
   - **Mind Mesh**: Integration point documented, post-execution hook pattern
   - All sync operations are non-blocking (failures don't block Guardrails mutations)
   - Explicit logging for all sync attempts

4. **Sync Behavior**:
   - Only syncs when user settings allow
   - Roadmap events: Only type='event' items
   - Tasks: Only if dueAt or scheduledAt exists
   - Mind Mesh: Only integrated containers with dates
   - Creates calendar events on first sync
   - Updates existing calendar events on subsequent syncs
   - Deletes calendar events when Guardrails entity deleted

### ✅ PROMPT 3: Calendar Sync Controls UI (Completed)

1. **React Hook**: `useCalendarSyncSettings()`
   - Loads calendar_sync_settings from database
   - Auto-creates settings with defaults on first use
   - Provides updateSetting() function for immediate persistence
   - Exposes isLoading, error, and refetch states

2. **Guardrails Sync Panel**: `GuardrailsCalendarSyncPanel.tsx`
   - Located in Guardrails left navigation (More Options section)
   - Master switch: "Sync Guardrails to Personal Calendar"
   - Child toggles: Roadmap Events, Tasks with Dates, Mind Mesh Events
   - Child toggles disabled when master switch OFF
   - Immediate persistence (no Save button)

3. **Personal Spaces Sync Panel**: Created but not yet integrated
   - Master switch: "Allow Personal Calendar to Sync into Guardrails"
   - Privacy warning with lock icon
   - Confirmation toggle appears when master switch ON

4. **Read-Only Status Indicators**:
   - **Daily Alignment**: Shows "Calendar synced from Guardrails" or "Calendar sync disabled"
   - **Mind Mesh**: Shows "Integrated events sync to calendar" or "Calendar sync disabled"
   - Both indicators are read-only (no actions, just visibility)

### ✅ PROMPT 4: Personal Spaces Calendar Authoring (Completed)

1. **Personal Calendar Service Layer**: `personalSpaces/calendarService.ts`
   - Full CRUD operations on calendar_events
   - Creates events with source_type='personal', source_entity_id=null, source_project_id=null
   - Functions: createPersonalCalendarEvent, updatePersonalCalendarEvent, deletePersonalCalendarEvent
   - Query functions: getPersonalCalendarEvents, getPersonalCalendarEvent, getPersonalEventsForDateRange
   - No Guardrails entities created by default

2. **Personal Calendar Page**: `PersonalCalendarPage.tsx`
   - Full event authoring surface
   - Displays upcoming and past events
   - Clear badges: "Personal" vs "Linked to Guardrails"
   - Edit/delete functionality with confirmation
   - Accessible from Settings page via /calendar/personal route

3. **Event Creation/Edit Modal**: `PersonalEventModal.tsx`
   - Form fields: title (required), description, start date/time, end date/time, all-day toggle
   - Checks sync_personal_to_guardrails setting
   - If enabled, shows integration prompt: "Should this affect your work projects?"
   - Radio options:
     - "Personal only" (default)
     - "Add to Guardrails as Roadmap Event"
     - "Add to Guardrails as Task"
   - Integration UI only shown for new events (not edits)
   - Shows "Linked to Guardrails" badge for already-integrated events
   - Shows info message that integrated events update work calendar

4. **Integration Flow** (UI Complete, Execution Placeholder):
   - Integration UI implemented and respects settings
   - Selection persists in form state
   - Console logging indicates selected integration type
   - Yellow banner shows "Guardrails integration is not yet implemented"
   - Events save as personal-only regardless of selection
   - Ready for future MindMesh V2 integration logic

5. **Navigation & Access**:
   - Route: /calendar/personal (AuthGuard protected)
   - Settings page link: "Personal Calendar - Manage your personal events and time commitments"
   - Back navigation to Settings

6. **Privacy Guarantees**:
   - All events created as personal by default
   - No automatic Guardrails integration
   - Integration only shown when sync_personal_to_guardrails = true
   - Default radio selection is "Personal only"
   - No inference or auto-promotion

### ❌ Not Implemented Yet (Future Prompts)

- Onboarding flow for sync preferences
- Personal Spaces → Guardrails sync execution logic (UI complete, awaiting MindMesh V2 integration)
- Confirmation dialogs for personal sync actions
- Per-project sync overrides
- Conflict resolution
- Calendar event sharing logic
- MindMesh V2 integration for personal → Guardrails promotion
- Unlink/detach functionality for integrated events

### 🎯 Success Criteria

**PROMPT 1 & 2: Foundation & Sync Logic**
- [x] calendar_events established as canonical authority
- [x] User-controlled sync settings data model created
- [x] Sync service layer functional
- [x] Roadmap events sync to calendar
- [x] Tasks with dates sync to calendar
- [x] Mind Mesh integration point documented
- [x] Idempotent behavior (no duplicates)
- [x] Privacy defaults respected
- [x] Non-blocking sync (failures don't block mutations)

**PROMPT 3: UI Controls**
- [x] useCalendarSyncSettings hook created
- [x] Guardrails sync panel implemented
- [x] Read-only indicators added to Daily Alignment and Mind Mesh
- [x] Immediate persistence (no Save button)
- [x] Master/child toggle pattern implemented

**PROMPT 4: Personal Calendar Authoring**
- [x] Personal calendar service layer created
- [x] Personal calendar page with full CRUD
- [x] Event creation/edit modal with integration UI
- [x] Privacy-first defaults (personal-only by default)
- [x] Integration UI respects sync settings
- [x] Clear badges for personal vs integrated events
- [x] Navigation and routing complete
- [x] No automatic Guardrails integration
- [x] Integration selection UI complete (execution pending)
- [x] Build passes

---

## Guardrails → Calendar Flow (PROMPT 2)

### What Gets Synced

**Roadmap Events** (type='event'):
```
roadmap_items.type = 'event'
└─→ calendar_events (if sync_roadmap_events = true)
    - title, description
    - start_date → start_at (all-day)
    - end_date → end_at (all-day)
    - Tracked via source_type='roadmap_event'
```

**Tasks with Dates** (type='task'):
```
roadmap_items.type = 'task' + dates
└─→ calendar_events (if sync_tasks_with_dates = true)
    - title, description
    - dueAt/scheduledAt → start_at
    - Tracked via source_type='task'
```

**Mind Mesh Integrated Events**:
```
mindmesh_containers + project_id + dates
└─→ calendar_events (if sync_mindmesh_events = true)
    - title, description
    - start_date → start_at (all-day)
    - end_date → end_at (all-day)
    - Tracked via source_type='mindmesh_event'
```

### Sync Decisions

Every sync attempt follows this flow:

1. **Check user settings**: Is sync enabled?
2. **Check entity type**: Does it meet sync criteria?
3. **Check for existing event**: Idempotency check
4. **Create or update**: Atomic operation
5. **Log result**: synced, skipped, or failed

### Example Scenarios

**Scenario 1: User creates roadmap event**
```
User creates: "Product Launch" (type=event, dates=2025-03-01 to 2025-03-05)
Settings: sync_guardrails_to_personal=true, sync_roadmap_events=true
Result: ✅ Calendar event created
```

**Scenario 2: User creates roadmap task without dates**
```
User creates: "Write documentation" (type=task, no dates)
Settings: sync_guardrails_to_personal=true, sync_tasks_with_dates=true
Result: ⏭️ Skipped (reason: "Task has no dueAt or scheduledAt")
```

**Scenario 3: User has sync disabled**
```
User creates: "Team Meeting" (type=event, dates=2025-02-15)
Settings: sync_guardrails_to_personal=false
Result: ⏭️ Skipped (reason: "sync_guardrails_to_personal is disabled")
```

**Scenario 4: User deletes roadmap event**
```
User deletes: roadmap_items.id = 'abc123'
Calendar: calendar_events WHERE source_entity_id='abc123' deleted
Result: ✅ Calendar event removed
```

### Important Notes

1. **Calendar reflects Guardrails commitments**
   - Guardrails is source of truth
   - Calendar events mirror Guardrails data
   - Deleting calendar event does NOT delete Guardrails item

2. **Sync is non-blocking**
   - Guardrails mutations ALWAYS succeed
   - Calendar sync runs after successful Guardrails operation
   - Sync failures are logged but don't throw errors

3. **Idempotency guaranteed**
   - Unique constraint on (source_type, source_entity_id)
   - Multiple sync attempts update same calendar event
   - No duplicate calendar events ever created

---

## Future Prompts

Future work will build on this implementation:

1. **PROMPT 3 (Suggested)**: UI controls for calendar sync settings
   - Settings page for sync preferences
   - Toggle controls for each sync direction
   - Preview of what will sync
   - Sync status indicators

2. **PROMPT 4 (Suggested)**: Personal Spaces calendar projection
   - Display calendar events in Personal Spaces views
   - Filter by source (Guardrails vs manual)
   - Visual distinction for synced items
   - Respect visibility settings

3. **PROMPT 5 (Suggested)**: Personal Spaces → Guardrails sync
   - Require explicit user confirmation by default
   - Allow users to import personal events as time blocks
   - Respect privacy preferences
   - Show import history

---

## System Invariants

**These principles MUST be maintained across all future prompts:**

1. `calendar_events` is the ONLY canonical time authority
2. Sync settings are per-user and stored in `calendar_sync_settings`
3. Default: Guardrails → Personal Spaces (enabled), Personal Spaces → Guardrails (disabled)
4. Personal content requires explicit opt-in before feeding work systems
5. Sync ≠ Visibility ≠ Sharing (distinct concepts with different boundaries)
6. Users can override any default through explicit UI controls
7. No automatic behavior without user consent

---

**Implementation Status**:
- ✅ PROMPT 1: Foundation complete
- ✅ PROMPT 2: Guardrails → Calendar sync complete
- ✅ PROMPT 3: Calendar sync controls UI complete
- ✅ PROMPT 4: Personal calendar authoring complete (integration execution pending)
- ⏳ PROMPT 5+: Personal → Guardrails integration execution via MindMesh V2
