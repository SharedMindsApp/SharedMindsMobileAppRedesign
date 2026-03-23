# Context-Sovereign Calendar & Travel System: Architecture Analysis

**Status**: Analysis Only - No Implementation  
**Date**: 2026-01-02  
**Purpose**: Evaluate compatibility and extension strategy for context-sovereign calendar/travel systems

---

## Executive Summary

This analysis evaluates how context-sovereign calendar and travel systems could be introduced into the existing SharedMinds architecture without breaking functionality. The current system has a **household-sovereign** calendar model with Guardrails projection capabilities. Introducing personal and context-owned calendars requires careful architectural extension, not replacement.

**Key Findings:**
1. Current `calendar_events` table is household-scoped with household-based RLS
2. Multiple entities already behave context-like but lack calendar sovereignty
3. Calendar authority model conflicts with multi-context scenarios
4. Travel trips are partially context-sovereign but lack calendar integration
5. Extension is feasible via parallel tables and adapter layers without breaking changes

---

## 1. Context Identification

### 1.1 Existing Context-Like Entities

#### A. Guardrails Projects (Master Projects)

**What it owns:**
- Tracks (organizational workstreams)
- Roadmap items (tasks, events, milestones, goals)
- Mind Mesh nodes and edges
- Task Flow tasks
- Side projects and offshoot ideas
- Focus sessions
- Project-specific people assignments

**Permission enforcement:**
- Via `project_users` table with roles: owner, editor, viewer
- RLS policies check project membership via `master_project_id`
- Hierarchical: user → domains → master_projects

**Can it emit calendar-like events?**
- ✅ YES - Currently projects roadmap items into `calendar_events` via sync
- ✅ Mechanism exists: `source_type`, `source_entity_id`, `source_project_id` columns
- ⚠️ Limitation: Projects don't "own" calendar events; they project into household calendar
- ⚠️ Issue: Calendar events require `household_id` (foreign key constraint, NOT NULL)

**Context-sovereignty score:** 🟡 **Partial**
- Strong entity ownership
- Clear permission boundaries
- Calendar projection exists but not sovereign
- Cannot create project-only calendar events

---

#### B. Personal Planner (Personal Spaces)

**What it owns:**
- Personal calendar events (via personal calendar service)
- Personal tasks/habits/goals (consumption layer from Guardrails)
- Personal notes
- Personal consumption links to Guardrails entities

**Permission enforcement:**
- User-scoped: `user_id` foreign key
- RLS policies check `auth.uid()`
- No sharing mechanism for personal items
- Personal Spaces are private by default

**Can it emit calendar-like events?**
- ✅ YES - Personal calendar service creates events with `source_type='personal'`
- ⚠️ Limitation: Personal events still require `household_id` (architectural constraint)
- ⚠️ Workaround: System creates default household for each user
- ✅ Integration UI exists for personal → Guardrails (not yet wired)

**Context-sovereignty score:** 🟢 **High**
- Strong privacy boundaries
- User-owned entities
- Calendar integration partially implemented
- **Key constraint:** Must use household calendar table

---

#### C. Shared Spaces (Household Spaces)

**What it owns:**
- Fridge Board widgets (notes, photos, reminders, achievements)
- Fridge Canvas infinite canvas with groups
- Widget layouts (positioning, sizing, z-index)
- Widget groups (visual organization)

**Permission enforcement:**
- Space-scoped: `space_id` foreign key
- Space members via `space_members` table
- RLS checks space membership
- Roles: owner, member
- Visibility: 'private', 'all', 'restricted'

**Can it emit calendar-like events?**
- ❌ NO - Spaces do not create calendar events
- 🟡 Widgets can reference calendar events but don't own them
- 🟡 Calendar widgets display household calendar events
- **Gap:** Spaces cannot create space-specific calendar events

**Context-sovereignty score:** 🔴 **Low**
- Strong entity ownership for widgets
- Clear permission boundaries
- **Missing:** Calendar event ownership
- **Missing:** Time-based event emission

---

#### D. Travel Trips

**What it owns:**
- Trip metadata (name, type, dates, status, visibility)
- Trip collaborators (owner/editor/viewer roles)
- Trip destinations (multiple locations with timezones)
- Trip itinerary items (day-by-day planning with dates/times)
- Trip accommodations (check-in/check-out dates)
- Trip places to visit (wishlist)
- Trip packing lists
- Trip budget and expenses
- Trip road trip stops (optional)

**Permission enforcement:**
- Trip-scoped: `trip_id` foreign key
- Trip collaborators via `trip_collaborators` table
- RLS checks collaborator membership and role
- Roles: owner, editor, viewer
- Visibility: 'personal', 'shared'
- **Strong isolation:** Non-trip data remains private

**Can it emit calendar-like events?**
- ❌ NO - Trips do not create calendar events
- 🟡 Itinerary items have dates/times but stored in `trip_itinerary_items`
- 🟡 Accommodations have dates but stored in `trip_accommodations`
- **Gap:** No calendar projection mechanism
- **Gap:** No integration with household calendar
- **Future intent:** "Calendar Integration - Sync itinerary to planner calendar" (documented as future enhancement)

**Context-sovereignty score:** 🟢 **High**
- Fully self-contained context
- Strong permission model
- Multi-user collaboration support
- **Missing:** Calendar event emission
- **Missing:** Calendar authority

---

#### E. Households (Legacy)

**What it owns:**
- **Calendar events** (THE ONLY ENTITY THAT OWNS CALENDAR EVENTS)
- Household members (roles: member, admin, owner, professional)
- Meal library and meal plans
- Diet profiles
- Household habits and habit completions
- Household goals
- Fridge board items
- Household insights

**Permission enforcement:**
- Household-scoped: `household_id` foreign key
- Household members via `household_members` table
- RLS checks household membership
- Role-based permissions (admin, owner can delete events)
- **Default:** Every user gets a household on signup

**Can it emit calendar-like events?**
- ✅ YES - **THE ONLY ENTITY THAT CAN**
- `calendar_events` table requires `household_id NOT NULL`
- Household members can view all household events
- Any household member can create events
- Creators and admins can update/delete

**Context-sovereignty score:** 🟢 **Full (Current Model)**
- Complete calendar ownership
- Clear permission boundaries
- Established RLS policies
- **Limitation:** Hardcoded as only calendar owner

---

### 1.2 Summary: Context Sovereignty Matrix

| Entity | Entity Ownership | Permission Model | Calendar Emission | Context-Sovereign? |
|--------|------------------|------------------|-------------------|-------------------|
| **Guardrails Projects** | ✅ Strong | ✅ project_users | 🟡 Projects into household | 🟡 Partial |
| **Personal Planner** | ✅ Strong | ✅ user-scoped | 🟡 Via household | 🟡 Partial |
| **Shared Spaces** | ✅ Strong | ✅ space_members | ❌ None | 🔴 Low |
| **Travel Trips** | ✅ Strong | ✅ trip_collaborators | ❌ None | 🔴 Low (no calendar) |
| **Households** | ✅ Strong | ✅ household_members | ✅ Full | 🟢 Full |

**Key Insight:** All contexts have strong entity ownership and permission models. Calendar sovereignty is the missing piece.

---

## 2. Calendar Compatibility Analysis

### 2.1 Current Calendar System Assumptions

#### Assumption 1: Every calendar event belongs to exactly one household

**Implementation:**
```sql
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ... other fields
);
```

**Conflicts with:**
- ✅ Personal calendars (workaround: use default household)
- ❌ Context-owned events (projects, spaces, trips have no household)
- ❌ Cross-household events (no mechanism for multi-household events)
- ❌ System-wide events (admin announcements, global events)

**Migration path:**
- Make `household_id` nullable
- Add `context_type` and `context_id` columns
- Introduce adapter layer to map contexts to permissions

---

#### Assumption 2: Calendar authority is declared in `CALENDAR_AUTHORITY_AND_SYNC.md`

**Quote:** 
> "`calendar_events` is the **single source of truth** for all time-based data in the system."

> "Prime Rule: If it has a date or time, it references calendar_events. Other systems PROJECT INTO the calendar, they do not own time."

**Current implementation:**
- Guardrails roadmap items → sync to `calendar_events`
- Personal calendar service → creates `source_type='personal'` events
- Household calendar → directly creates events
- **Reality:** Only household calendar truly "owns" events

**Conflicts with:**
- ❌ Context-owned events (contexts want to own their calendar events)
- ❌ Trip itinerary items (stored separately, no calendar projection)
- ❌ Project-only events (require household association)
- ✅ Projection model (this works for read-only consumption)

**Migration path:**
- Redefine authority: contexts own events, `calendar_events` is projection layer
- Introduce `context_events` as source of truth per context
- Make `calendar_events` a unified view/query layer
- Maintain backward compatibility via views

---

#### Assumption 3: Permission visibility based on household membership

**RLS Policy:**
```sql
CREATE POLICY "Household members can view calendar events"
  ON calendar_events FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );
```

**Conflicts with:**
- ❌ Project collaborators (project_users table, different membership)
- ❌ Trip collaborators (trip_collaborators table, different membership)
- ❌ Space members (space_members table, different membership)
- ❌ Cross-context events (no unified membership check)

**Migration path:**
- Create unified permission check function
- Check context-specific membership tables
- Allow multiple permission paths (OR logic)
- Maintain household path for backward compatibility

---

#### Assumption 4: `source_type` column tracks event origin

**Current values:**
```sql
source_type IN ('roadmap_event', 'task', 'mindmesh_event', 'personal')
```

**Purpose:** Track which Guardrails entity created the event

**Conflicts with:**
- 🟡 Limited to Guardrails + personal
- ❌ No `trip_event` source type
- ❌ No `space_event` source type
- ❌ No `context_owned` distinction

**Migration path:**
- Extend enum with new source types
- Add `context_type` parallel column
- Deprecate `source_type` in favor of `context_type` + `context_id`

---

#### Assumption 5: Sync is unidirectional (Guardrails → Calendar)

**Documentation:**
> "Roadmap → Task Flow (one-way only)"
> "Personal Spaces never mutate Guardrails data"

**Current flow:**
```
Guardrails Roadmap Item → calendar_events (via sync service)
Personal Calendar Service → calendar_events (direct creation)
```

**Conflicts with:**
- ❌ Context-owned events (contexts should create events directly)
- ❌ Bi-directional sync (trip changes should update calendar)
- ✅ Read-only consumption (this model works fine)

**Migration path:**
- Allow contexts to create events directly in their own context
- Projection layer subscribes to context events
- Calendar view aggregates across contexts (query-time)
- Maintain sync service for backward compatibility

---

### 2.2 Permissioned Visibility Conflicts

#### Scenario 1: User is in Project A and Project B

**Current problem:**
- Both projects create roadmap events
- Both project events to household calendar
- User sees all events in household calendar
- **No distinction:** Which project does this event belong to?
- **No filtering:** User cannot view "only Project A events"

**Context-sovereign solution:**
- Project A events exist in Project A calendar context
- Project B events exist in Project B calendar context
- User calendar view aggregates: Project A + Project B + Personal + Household
- User can toggle visibility per context

---

#### Scenario 2: User in Trip with non-household members

**Current problem:**
- Trips use `trip_collaborators` (independent of households)
- Trip collaborators may not share a household
- **Blocker:** `calendar_events` requires `household_id`
- **Workaround required:** Which household should trip events use?

**Context-sovereign solution:**
- Trip owns its calendar events (no household required)
- Trip collaborators see trip events via `trip_id` permission
- Trip events projected to personal calendar if user opts in
- No household coupling

---

#### Scenario 3: Shared track across multiple projects

**Current problem:**
- Shared track exists in Project A and Project B
- Track creates roadmap event (synced to calendar)
- **Question:** Which project does the calendar event belong to?
- **Current:** Uses `source_project_id` (first project? primary project?)

**Context-sovereign solution:**
- Track owns calendar event (track calendar context)
- Projects consuming track see track events in their project view
- Event visibility based on track access, not project access
- Multiple projects can view same track event

---

### 2.3 Summary: Calendar Assumptions vs. Context Requirements

| Current Assumption | Context-Sovereign Requirement | Conflict Level |
|-------------------|------------------------------|----------------|
| Events require household_id | Events owned by contexts (optional household) | 🔴 **High** |
| Household-based RLS | Context-specific RLS | 🔴 **High** |
| Single authority (household) | Multiple authorities (contexts) | 🔴 **High** |
| Projection model (Guardrails→Calendar) | Ownership model (Context owns events) | 🟡 **Medium** |
| Source attribution only | Full context sovereignty | 🟡 **Medium** |
| Unidirectional sync | Bi-directional or direct ownership | 🟡 **Medium** |

**Verdict:** High-level architectural mismatch. Extension possible but requires careful design.

---

## 3. Non-Breaking Extension Strategy

### 3.1 Parallel Table Approach

#### Option A: Context Calendar Events Table

**Create new table alongside existing `calendar_events`:**

```sql
CREATE TABLE context_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context ownership
  context_type text NOT NULL CHECK (context_type IN ('project', 'trip', 'space', 'user')),
  context_id uuid NOT NULL,
  
  -- Event data (same as calendar_events)
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text DEFAULT '',
  color text DEFAULT 'blue',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_event_times CHECK (end_at >= start_at),
  CONSTRAINT valid_context UNIQUE (context_type, context_id, id)
);
```

**Permission checking function:**

```sql
CREATE OR REPLACE FUNCTION user_can_view_context_event(
  event_context_type text,
  event_context_id uuid,
  user_id uuid
) RETURNS boolean AS $$
BEGIN
  CASE event_context_type
    WHEN 'project' THEN
      RETURN EXISTS (
        SELECT 1 FROM project_users
        WHERE master_project_id = event_context_id
        AND user_id = user_id
      );
    WHEN 'trip' THEN
      RETURN EXISTS (
        SELECT 1 FROM trip_collaborators
        WHERE trip_id = event_context_id
        AND user_id = user_id
      );
    WHEN 'space' THEN
      RETURN EXISTS (
        SELECT 1 FROM space_members
        WHERE space_id = event_context_id
        AND user_id = user_id
      );
    WHEN 'user' THEN
      RETURN event_context_id = user_id;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**RLS Policy:**

```sql
CREATE POLICY "Users can view context events they have access to"
  ON context_calendar_events FOR SELECT
  USING (
    user_can_view_context_event(context_type, context_id, auth.uid())
  );
```

**Benefits:**
- ✅ Zero impact on existing `calendar_events` table
- ✅ No migration of existing data required
- ✅ New contexts use new table
- ✅ Clear separation of concerns
- ✅ Can run in parallel indefinitely

**Drawbacks:**
- ⚠️ Two calendar tables (complexity for queries)
- ⚠️ Need unified calendar view (query-time aggregation)
- ⚠️ Existing code uses `calendar_events` (needs adapter)

---

#### Option B: Make `household_id` Nullable with Context Columns

**Alter existing `calendar_events` table:**

```sql
-- Step 1: Add context columns
ALTER TABLE calendar_events
ADD COLUMN context_type text,
ADD COLUMN context_id uuid,
ADD CONSTRAINT calendar_events_context_check
  CHECK (
    (household_id IS NOT NULL AND context_type IS NULL AND context_id IS NULL)
    OR
    (household_id IS NULL AND context_type IS NOT NULL AND context_id IS NOT NULL)
  );

-- Step 2: Backfill existing records
UPDATE calendar_events
SET context_type = 'household', context_id = household_id
WHERE context_type IS NULL;

-- Step 3: Make household_id nullable (scary)
ALTER TABLE calendar_events ALTER COLUMN household_id DROP NOT NULL;

-- Step 4: Update RLS policies
CREATE OR REPLACE FUNCTION user_can_view_calendar_event(event_id uuid)
RETURNS boolean AS $$
DECLARE
  event_context_type text;
  event_context_id uuid;
  event_household_id uuid;
BEGIN
  SELECT context_type, context_id, household_id
  INTO event_context_type, event_context_id, event_household_id
  FROM calendar_events WHERE id = event_id;
  
  -- Legacy household path
  IF event_household_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = event_household_id
      AND user_id = auth.uid()
      AND status = 'accepted'
    );
  END IF;
  
  -- Context path
  RETURN user_can_view_context_event(event_context_type, event_context_id, auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Benefits:**
- ✅ Single calendar table (simpler queries)
- ✅ Unified view (no aggregation needed)
- ✅ Backward compatible (household path preserved)
- ✅ Context extension without breaking changes

**Drawbacks:**
- 🔴 **High risk:** Altering NOT NULL constraint on production table
- 🔴 **Migration complexity:** Backfilling data, testing RLS
- ⚠️ Existing code assumes `household_id` exists
- ⚠️ Need careful rollout with feature flags

---

#### Option C: Adapter Layer with Virtual Projection

**Keep both tables, create unified view:**

```sql
-- Context events table (new)
CREATE TABLE context_calendar_events (
  id uuid PRIMARY KEY,
  context_type text NOT NULL,
  context_id uuid NOT NULL,
  -- ... event fields
);

-- Unified view (query-time aggregation)
CREATE OR REPLACE VIEW unified_calendar_events AS
SELECT 
  id,
  'household' AS context_type,
  household_id AS context_id,
  created_by,
  title,
  description,
  start_at,
  end_at,
  all_day,
  location,
  color,
  created_at,
  updated_at
FROM calendar_events
WHERE household_id IN (
  SELECT household_id FROM household_members
  WHERE user_id = auth.uid() AND status = 'accepted'
)

UNION ALL

SELECT
  id,
  context_type,
  context_id,
  created_by,
  title,
  description,
  start_at,
  end_at,
  all_day,
  location,
  color,
  created_at,
  updated_at
FROM context_calendar_events
WHERE user_can_view_context_event(context_type, context_id, auth.uid());
```

**Service layer adapter:**

```typescript
// Unified calendar service
export async function getUserCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UnifiedCalendarEvent[]> {
  // Query unified view
  const { data, error } = await supabase
    .from('unified_calendar_events')
    .select('*')
    .gte('start_at', startDate.toISOString())
    .lte('start_at', endDate.toISOString())
    .order('start_at', { ascending: true });
  
  if (error) throw error;
  return data;
}
```

**Benefits:**
- ✅ Zero risk to existing table
- ✅ Gradual migration path
- ✅ Existing code unchanged (uses `calendar_events`)
- ✅ New code uses unified view
- ✅ Can deprecate legacy table over time

**Drawbacks:**
- ⚠️ View performance (UNION ALL can be slow)
- ⚠️ Two codepaths (old vs. new)
- ⚠️ Complexity in maintaining parallel systems

---

### 3.2 Recommended Strategy: **Hybrid Approach**

**Phase 1: Parallel Table (Low Risk)**
1. Create `context_calendar_events` table
2. Implement context-specific RLS
3. Build context calendar services (trips, projects, spaces)
4. Feature flag: opt-in contexts create events in new table
5. Existing household calendar unchanged

**Phase 2: Adapter Layer**
1. Create `unified_calendar_events` view
2. Build unified calendar query service
3. Update UI to use unified service (feature flag)
4. Monitor performance and fix issues
5. Gradual rollout to users

**Phase 3: Migration (Future)**
1. Backfill `context_events` from `calendar_events`
2. Add `context_type='household'` to existing events
3. Deprecate direct `calendar_events` usage
4. All new events go to `context_calendar_events`
5. **DO NOT remove** `calendar_events` (keep for read-only legacy)

**Phase 4: Consolidation (Optional, Far Future)**
1. Make `household_id` nullable in `calendar_events`
2. Merge tables if performance requires
3. **Point of no return:** Cannot easily undo after this

---

### 3.3 Feature Flag Strategy

**Flag 1: `enable_context_calendars`**
- Controls whether contexts can create their own events
- Default: `false` (use household calendar)
- When `true`: Trips, Projects, Spaces use `context_calendar_events`

**Flag 2: `enable_unified_calendar_view`**
- Controls whether UI shows aggregated calendar
- Default: `false` (show household calendar only)
- When `true`: UI queries `unified_calendar_events` view

**Flag 3: `enable_personal_calendar`**
- Controls whether users have separate personal calendar
- Default: `false` (use default household)
- When `true`: Personal events use `context_type='user'`

**Rollout sequence:**
1. Deploy schema changes (new table, view, functions)
2. Enable `enable_context_calendars` for internal testing
3. Enable `enable_unified_calendar_view` for internal users
4. Monitor performance, fix issues
5. Gradual rollout: 1% → 5% → 25% → 50% → 100%

---

### 3.4 Backward Compatibility Guarantees

**Existing functionality MUST continue to work:**

✅ **Household calendar events**
- Create, read, update, delete events
- Assign members to events
- Filter by color, member, date range
- Drag-and-drop in Week/Day views
- Four calendar views (Month, Week, Day, Agenda)

✅ **Guardrails → Calendar sync**
- Roadmap events sync to calendar
- Tasks with dates sync to calendar
- Mind Mesh events sync to calendar
- Sync settings control behavior
- `source_type` attribution preserved

✅ **Personal calendar authoring**
- Create personal events (via default household)
- Personal events tagged with `source_type='personal'`
- Integration UI (pending execution)

✅ **Calendar widgets**
- Icon, Mini, Full modes
- Display upcoming events
- Navigate to full calendar

**How to guarantee:**
- Keep existing table and service functions
- Add new table/view as parallel option
- Feature flags control which path is used
- Extensive testing before rollout
- Rollback plan: disable feature flags

---

## 4. Travel Planner Placement Analysis

### 4.1 Current Travel Trip Architecture

**Tables:**
- `trips` (trip metadata, dates, status, visibility)
- `trip_collaborators` (owner/editor/viewer roles)
- `trip_destinations` (multiple locations with timezones)
- `trip_itinerary_items` (day-by-day planning with dates/times)
- `trip_accommodations` (check-in/check-out dates)
- `trip_places_to_visit` (wishlist with priorities)
- `trip_packing_lists` + `trip_packing_items`
- `trip_budget_categories` + `trip_expenses`
- `trip_road_trip_stops` (optional routing)

**Current state:**
- ✅ Fully self-contained context
- ✅ Strong permission model (RLS via `trip_id`)
- ✅ Multi-user collaboration (roles: owner, editor, viewer)
- ✅ Privacy-first (opt-in sharing)
- ❌ No calendar integration
- ❌ Itinerary items stored separately (not in `calendar_events`)
- ❌ No projection into personal/household calendar

---

### 4.2 Do Trips Already Behave Like a Context?

**Context definition:**
- **Entity ownership:** ✅ YES - Trips own itinerary, accommodations, budget, packing
- **Permission boundaries:** ✅ YES - `trip_collaborators` with roles
- **Isolation:** ✅ YES - Non-trip data remains private
- **Multi-user:** ✅ YES - Supports multiple collaborators
- **Visibility control:** ✅ YES - `visibility` field (personal, shared)

**Missing for first-class context:**
- ❌ Calendar event ownership (itinerary items not in calendar)
- ❌ Calendar projection mechanism
- ❌ Integration with unified calendar view
- ❌ Event visibility control (per-user opt-in to project to personal calendar)

**Verdict:** 🟢 **Trips ARE a context**, just missing calendar sovereignty.

---

### 4.3 What is Missing to Make Trips First-Class?

#### Missing 1: Calendar Event Ownership

**Current:** Itinerary items in `trip_itinerary_items` table
**Needed:** Itinerary items project to calendar (or stored in context calendar)

**Options:**

**Option A:** Project itinerary items to `context_calendar_events`
```typescript
// When itinerary item created
async function createItineraryItem(input: CreateItineraryItemInput) {
  // Create in trip table
  const item = await travelService.createItineraryItem(input);
  
  // Project to context calendar
  await createContextCalendarEvent({
    context_type: 'trip',
    context_id: item.trip_id,
    title: item.title,
    description: item.description,
    start_at: combineDateTime(item.date, item.start_time),
    end_at: calculateEndTime(item.date, item.start_time, item.duration_minutes),
    location: item.location,
    metadata: { source_type: 'trip_itinerary', source_id: item.id }
  });
  
  return item;
}
```

**Option B:** Store itinerary items directly as context calendar events
```typescript
// Itinerary item IS a calendar event
async function createItineraryItem(input: CreateItineraryItemInput) {
  const event = await createContextCalendarEvent({
    context_type: 'trip',
    context_id: input.trip_id,
    title: input.title,
    description: input.description,
    start_at: combineDateTime(input.date, input.start_time),
    end_at: calculateEndTime(input.date, input.start_time, input.duration_minutes),
    location: input.location,
    metadata: {
      category: input.category, // travel, activity, food, reservation, milestone
      cost: input.cost,
      booking_reference: input.booking_reference,
      assigned_travelers: input.assigned_travelers
    }
  });
  
  return event;
}
```

**Recommendation:** **Option A** (projection)
- Keeps trip-specific data in trip tables
- Projection to calendar is optional
- Easier migration path
- No risk to existing trip data

---

#### Missing 2: Personal Calendar Projection Opt-In

**Current:** Trip itinerary visible only in trip view  
**Needed:** Users opt-in to see trip events in personal calendar

**Implementation:**

```sql
CREATE TABLE trip_calendar_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  visibility_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trip_id)
);
```

**Service function:**

```typescript
export async function enableTripCalendarProjection(
  userId: string,
  tripId: string
): Promise<void> {
  await supabase.from('trip_calendar_projections').insert({
    user_id: userId,
    trip_id: tripId,
    enabled: true
  });
}

export async function getUserProjectedTripEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  // Get trips user has enabled
  const { data: projections } = await supabase
    .from('trip_calendar_projections')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('enabled', true);
  
  if (!projections?.length) return [];
  
  const tripIds = projections.map(p => p.trip_id);
  
  // Query context calendar events for these trips
  const { data: events } = await supabase
    .from('context_calendar_events')
    .select('*')
    .eq('context_type', 'trip')
    .in('context_id', tripIds)
    .gte('start_at', startDate.toISOString())
    .lte('start_at', endDate.toISOString());
  
  return events || [];
}
```

**UI workflow:**
1. User views trip dashboard
2. "Add to Personal Calendar" toggle
3. When enabled, trip events appear in unified calendar view
4. When disabled, trip events only visible in trip view
5. Per-trip control (not global)

---

#### Missing 3: Accommodation Date Projection

**Current:** Accommodations have check-in/check-out dates but not in calendar  
**Needed:** Option to project accommodations as all-day calendar events

**Implementation:**

```typescript
export async function projectAccommodationToCalendar(
  accommodation: TripAccommodation
): Promise<void> {
  await createContextCalendarEvent({
    context_type: 'trip',
    context_id: accommodation.trip_id,
    title: `📍 ${accommodation.name}`,
    description: `${accommodation.accommodation_type}\n${accommodation.address}`,
    start_at: accommodation.check_in,
    end_at: accommodation.check_out,
    all_day: true,
    location: accommodation.address,
    color: 'purple',
    metadata: {
      source_type: 'trip_accommodation',
      source_id: accommodation.id,
      booking_reference: accommodation.booking_reference,
      cost: accommodation.cost
    }
  });
}
```

**Benefit:**
- Users see "where they're staying" in calendar view
- All-day events span multiple days
- Visual distinction (emoji, color)

---

### 4.4 How Collaboration Currently Works

**Current collaboration model:**

1. **Trip Collaborators Table:**
```sql
CREATE TABLE trip_collaborators (
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);
```

2. **RLS Policies:**
```sql
-- Users can view trips they're collaborators on
CREATE POLICY "Collaborators can view trip"
  ON trips FOR SELECT
  USING (
    id IN (
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid()
    )
  );

-- Owners and editors can update trip
CREATE POLICY "Owners and editors can update trip"
  ON trips FOR UPDATE
  USING (
    id IN (
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );
```

3. **Permissions:**
- **Owner:** Full control (delete trip, manage collaborators)
- **Editor:** Add/edit itinerary, accommodations, packing lists
- **Viewer:** Read-only access (useful for family members, tour guides)

4. **Privacy:**
- Trips are **opt-in shared** (created as `visibility='personal'`)
- Owner explicitly adds collaborators
- Non-trip planner data remains private

**What works well:**
- ✅ Clear role-based permissions
- ✅ RLS enforcement at database level
- ✅ No accidental data exposure
- ✅ Scales to multiple collaborators

**Integration with context calendar:**
- ✅ Permission model ready for calendar events
- ✅ RLS can extend to context calendar events
- ✅ No changes needed to collaboration model

---

### 4.5 Summary: Travel Trip Readiness

| Aspect | Status | Notes |
|--------|--------|-------|
| **Entity ownership** | ✅ Ready | Strong ownership model |
| **Permission model** | ✅ Ready | RLS with role-based access |
| **Collaboration** | ✅ Ready | Multi-user with owner/editor/viewer |
| **Calendar ownership** | ❌ Missing | Itinerary items not in calendar |
| **Calendar projection** | ❌ Missing | No opt-in mechanism |
| **Personal calendar integration** | ❌ Missing | No unified view |
| **Context-sovereign** | 🟡 **80% ready** | Just needs calendar integration |

**To make first-class:**
1. Project itinerary items to `context_calendar_events`
2. Add `trip_calendar_projections` table
3. Include trip events in unified calendar view
4. Implement accommodation date projection (optional)
5. Update UI to show "Add to Personal Calendar" toggle

**Estimated effort:** Medium (backend) + Medium (UI)

---

## 5. Risk & Migration Notes

### 5.1 Parts That MUST Be Migrated Later

#### A. Existing Guardrails → Calendar Sync

**Current state:**
- Guardrails syncs roadmap events to `calendar_events` (household table)
- Uses `source_type`, `source_entity_id`, `source_project_id` columns
- Sync service: `guardrailsCalendarSync.ts`

**Migration requirement:**
- **Phase 1:** Keep existing sync (household table)
- **Phase 2:** Parallel sync to `context_calendar_events` (project context)
- **Phase 3:** Deprecate household sync, use project context only
- **Phase 4:** Remove household sync code (far future)

**Risk level:** 🟡 **Medium**
- Existing sync must continue working
- Users depend on Guardrails events in household calendar
- Cannot break without user communication

---

#### B. Personal Calendar Events

**Current state:**
- Personal calendar service creates events in `calendar_events` (household table)
- Uses default household for each user
- `source_type='personal'`

**Migration requirement:**
- **Phase 1:** Continue using household table
- **Phase 2:** Create events in `context_calendar_events` with `context_type='user'`
- **Phase 3:** Migrate existing personal events to new table
- **Phase 4:** Deprecate household path for personal events

**Risk level:** 🟢 **Low**
- Personal events are user-scoped (no collaboration)
- Easy to migrate without breaking other users
- Can test with single users

---

#### C. Household Calendar Events

**Current state:**
- Household members create events directly in `calendar_events`
- No source attribution (`source_type=NULL`)
- Shared across household members

**Migration requirement:**
- **Will NOT migrate** (permanent legacy support)
- Household calendar continues using `calendar_events` table
- Unified view aggregates household + context events
- **Reason:** Household calendars are core feature, too risky to migrate

**Risk level:** 🔴 **High (if attempted)**
- Households have many users
- Breaking household calendar would impact all users
- Not worth the risk
- **Decision:** Keep household calendar as-is forever

---

### 5.2 Parts That Can Remain Permanently

#### A. Household Calendar (`calendar_events` table)

**Rationale:**
- Core feature since early architecture
- Many users depend on it
- Well-tested RLS policies
- No reason to migrate (works fine)
- Unified view can aggregate across tables

**Decision:** ✅ **Permanent**

---

#### B. Guardrails Roadmap Items with Dates

**Current:** Roadmap items have `start_date` and `end_date` columns

**Question:** Should roadmap items store dates or only reference calendar?

**Answer:** **Keep dates in roadmap items**
- Roadmap items are authoritative for work planning
- Calendar events are projection for time management
- Dates are semantic part of roadmap item (not just time blocking)
- Calendar sync can read from roadmap dates

**Decision:** ✅ **Permanent**

---

#### C. Trip Itinerary Items Table

**Current:** `trip_itinerary_items` stores trip-specific data (category, cost, booking ref)

**Question:** Should itinerary items be calendar events only?

**Answer:** **Keep itinerary table, project to calendar**
- Itinerary items have trip-specific fields
- Calendar events are time-based view
- Projection allows opt-in calendar integration
- Maintains trip data integrity

**Decision:** ✅ **Permanent (with projection)**

---

### 5.3 "Point of No Return" Decisions

#### Decision 1: Make `household_id` Nullable

**Trigger:** Altering `calendar_events.household_id` to allow NULL

**Impact:**
- 🔴 **HIGH RISK:** Production schema change
- 🔴 Existing code assumes `household_id` exists
- 🔴 RLS policies must be rewritten
- 🔴 Extensive testing required
- ⚠️ Very difficult to roll back

**Point of no return:** Once deployed to production

**Mitigation:**
- Only do this if parallel table approach fails
- Extensive staging testing (weeks/months)
- Gradual rollout with feature flags
- Rollback plan: restore from backup (lose new data)

**Recommendation:** ⚠️ **Avoid if possible**

---

#### Decision 2: Deprecate `calendar_events` Table

**Trigger:** Moving all calendar events to `context_calendar_events`

**Impact:**
- 🔴 **IRREVERSIBLE:** Existing code breaks
- 🔴 All queries must be rewritten
- 🔴 Legacy integrations break
- 🔴 Cannot easily restore

**Point of no return:** Once `calendar_events` is dropped

**Mitigation:**
- Never drop `calendar_events` (keep as legacy read-only)
- Use database views for backward compatibility
- Maintain adapter layer indefinitely
- Version API endpoints (v1 uses old, v2 uses new)

**Recommendation:** ⚠️ **Never do this**

---

#### Decision 3: Merge Household Calendar into Context System

**Trigger:** Making households just another context type

**Impact:**
- 🟡 **Medium risk:** Behavioral changes
- 🟡 Household members expect shared calendar
- 🟡 Permission model changes
- ✅ Reversible: Can restore household special case

**Point of no return:** When household events moved to context table

**Mitigation:**
- Feature flag: `households_as_contexts`
- Test with small households first
- Keep escape hatch (revert to dedicated table)
- Communication to users about changes

**Recommendation:** 🟢 **Safe to attempt (with flags)**

---

### 5.4 Migration Risk Matrix

| Migration | Risk Level | Reversibility | Timeline | Dependencies |
|-----------|-----------|---------------|----------|--------------|
| Create `context_calendar_events` | 🟢 Low | ✅ Reversible | Weeks | None |
| Add projection for trips | 🟢 Low | ✅ Reversible | Weeks | Context table |
| Add projection for projects | 🟢 Low | ✅ Reversible | Weeks | Context table |
| Build unified calendar view | 🟡 Medium | ✅ Reversible | Months | Context table, projections |
| Migrate personal events | 🟡 Medium | ✅ Reversible | Months | Unified view |
| Make `household_id` nullable | 🔴 High | ⚠️ Difficult | Months | Testing, staging |
| Deprecate `calendar_events` | 🔴 Critical | ❌ Irreversible | Years | Everything above |

---

### 5.5 Recommended Migration Phases

#### Phase 0: Foundation (No Risk)
- **Duration:** 2-4 weeks
- **Tasks:**
  - Create `context_calendar_events` table
  - Implement context RLS function
  - Create empty unified view (just household events)
  - Deploy to production (no behavior change)
- **Risk:** 🟢 None (additive only)
- **Rollback:** Delete table (no users affected)

---

#### Phase 1: Trip Calendar Integration (Low Risk)
- **Duration:** 4-6 weeks
- **Tasks:**
  - Build trip itinerary → context calendar projection
  - Add `trip_calendar_projections` table
  - Update unified view to include trip events
  - Feature flag: `enable_trip_calendar_projection`
  - Test with internal users
- **Risk:** 🟢 Low (trips are new feature)
- **Rollback:** Disable feature flag

---

#### Phase 2: Project Calendar Sovereignty (Medium Risk)
- **Duration:** 2-3 months
- **Tasks:**
  - Create project calendar events in context table
  - Parallel Guardrails sync (household + project)
  - Update unified view to include project events
  - Feature flag: `enable_project_calendar_sovereignty`
  - Gradual rollout (1% → 5% → 25% → 50% → 100%)
- **Risk:** 🟡 Medium (affects existing Guardrails users)
- **Rollback:** Disable feature flag, revert to household sync

---

#### Phase 3: Personal Calendar Sovereignty (Medium Risk)
- **Duration:** 2-3 months
- **Tasks:**
  - Personal calendar events use `context_type='user'`
  - Migrate existing personal events from household table
  - Deprecate household path for personal events
  - Feature flag: `enable_personal_calendar_sovereignty`
  - Test extensively (personal data is sensitive)
- **Risk:** 🟡 Medium (user data migration)
- **Rollback:** Restore from backup, disable feature flag

---

#### Phase 4: Unified Calendar Default (Medium Risk)
- **Duration:** 2-3 months
- **Tasks:**
  - Make unified calendar view default for all users
  - Update all UI to use unified service
  - Monitor performance (UNION ALL queries)
  - Optimize queries if needed
  - Feature flag: `unified_calendar_default` (enabled by default)
- **Risk:** 🟡 Medium (performance, user experience)
- **Rollback:** Disable feature flag, revert UI

---

#### Phase 5: Optional Consolidation (High Risk, Optional)
- **Duration:** 6-12 months
- **Tasks:**
  - Make `household_id` nullable in `calendar_events`
  - Backfill `context_type` and `context_id` for all events
  - Deprecate household-specific code paths
  - Merge tables (optional)
- **Risk:** 🔴 High (production schema change)
- **Rollback:** Very difficult (restore from backup)
- **Recommendation:** ⚠️ **Only if performance requires**

---

### 5.6 Assumptions That Must Hold

#### Assumption 1: Context permission models remain stable

**Current:** Projects use `project_users`, Trips use `trip_collaborators`, Spaces use `space_members`

**Required:** These tables and permission models must not change

**Risk if broken:** All context calendar RLS breaks

**Mitigation:** Document permission contract, add schema tests

---

#### Assumption 2: `calendar_events` RLS remains household-scoped

**Current:** RLS checks `household_id` for permissions

**Required:** Household calendar RLS must not change

**Risk if broken:** Household calendar access breaks

**Mitigation:** Never modify existing RLS policies, add new policies only

---

#### Assumption 3: Unified view query performance acceptable

**Current:** UNION ALL across multiple tables

**Required:** Query time under 500ms for typical user (50-200 events)

**Risk if broken:** Calendar view becomes unusably slow

**Mitigation:** Benchmark early, add indexes, consider materialized view if needed

---

#### Assumption 4: No cross-context event sharing

**Current:** Event belongs to exactly one context

**Required:** This remains true (no event shared across contexts)

**Risk if broken:** Permission model becomes complex, potential data exposure

**Mitigation:** Document "one context per event" rule, enforce at API layer

---

### 5.7 Monitoring and Rollback Plan

#### Key Metrics to Monitor

**Performance metrics:**
- Unified calendar view query time (p50, p95, p99)
- Context calendar RLS check time
- Database connection pool usage
- Index hit rate on new tables

**Functional metrics:**
- Calendar event creation success rate
- Permission denial rate (should be low)
- Feature flag adoption rate
- User-reported calendar issues

**Rollback triggers:**
- Query time p95 > 2 seconds
- Permission errors > 1%
- User complaints spike
- Database CPU > 80% sustained

#### Rollback Procedure

**Phase 1-4 rollback (Low risk):**
1. Disable feature flag immediately
2. Verify rollback successful (users see old behavior)
3. No data loss (new table isolated)
4. Investigate issue, fix, re-enable

**Phase 5 rollback (High risk):**
1. Emergency: Restore database from backup (lose recent data)
2. Re-enable old code paths
3. Communicate to users about data loss
4. Long investigation and fix required

---

## 6. Conclusion

### 6.1 Summary of Findings

1. **Context-like entities exist** but lack calendar sovereignty
   - Guardrails Projects, Travel Trips, Shared Spaces have strong ownership and permissions
   - Calendar events currently household-scoped only

2. **Calendar assumptions conflict** with context requirements
   - `household_id NOT NULL` constraint blocks context ownership
   - RLS policies hardcoded for household membership
   - Single authority model vs. multi-context reality

3. **Non-breaking extension is feasible** via parallel tables
   - Create `context_calendar_events` alongside existing table
   - Unified view aggregates across contexts
   - Feature flags enable gradual rollout
   - Household calendar remains unchanged

4. **Travel trips are 80% ready** for first-class context status
   - Strong permission model in place
   - Just needs calendar projection layer
   - Collaboration works well
   - Low-risk integration path

5. **Migration is multi-phase** with clear risk levels
   - Phase 0-1: Low risk (additive only)
   - Phase 2-4: Medium risk (existing features affected)
   - Phase 5: High risk (optional, only if needed)

---

### 6.2 Critical Recommendations

#### ✅ DO

1. **Create parallel `context_calendar_events` table**
   - Zero risk to existing system
   - Clear extension path
   - Can coexist indefinitely

2. **Build unified calendar view early**
   - Test performance with small dataset
   - Optimize before user rollout
   - Consider materialized view if needed

3. **Start with trips as pilot context**
   - Trips are new feature (low risk)
   - Strong permission model already exists
   - Clear user value (trip calendar integration)

4. **Use feature flags for all phases**
   - Enable gradual rollout
   - Easy rollback
   - Monitor metrics per cohort

5. **Keep household calendar unchanged**
   - Core feature with many users
   - Well-tested and stable
   - No reason to risk it

---

#### ⚠️ DO WITH CAUTION

1. **Migrate personal calendar events**
   - User data is sensitive
   - Test extensively before rollout
   - Have backup and rollback plan

2. **Change Guardrails sync behavior**
   - Users depend on events in household calendar
   - Run parallel sync during transition
   - Communicate changes clearly

3. **Make `household_id` nullable**
   - High-risk schema change
   - Only if parallel table approach fails
   - Extensive staging testing required

---

#### ❌ DO NOT

1. **Drop `calendar_events` table**
   - Irreversible
   - Breaks all existing code
   - No benefit (parallel table works fine)

2. **Change household calendar RLS**
   - High risk of breaking access
   - Many users depend on it
   - Leave it alone

3. **Rush Phase 5 consolidation**
   - Not needed for functionality
   - Only worthwhile if performance issues
   - High risk, low reward

---

### 6.3 Open Questions for Implementation

1. **Query performance at scale:**
   - Will UNION ALL across 2+ tables be fast enough?
   - Need materialized view for active users?
   - How to handle users with 1000+ events?

2. **Context visibility preferences:**
   - Should users control visibility per context?
   - "Show Project A events, hide Project B events"?
   - Global preferences vs. per-calendar preferences?

3. **Cross-context event conflicts:**
   - User has trip and project event at same time
   - How to show conflicts in unified view?
   - Visual distinction by context type?

4. **Event editing across contexts:**
   - User sees trip event in personal calendar
   - Can they edit it? (permission delegation)
   - Changes propagate to trip context?

5. **Context deletion and event cleanup:**
   - User deletes trip
   - What happens to projected calendar events?
   - Cascade delete or mark as orphaned?

---

### 6.4 Next Steps (Not Implementation)

This is an analysis document. Implementation would require:

1. **Detailed design review** with team
2. **Performance benchmarking** of proposed queries
3. **Security review** of context RLS functions
4. **UI/UX design** for unified calendar view
5. **Migration strategy approval** from stakeholders
6. **Timeline and resource planning**
7. **Testing strategy** for each phase
8. **Monitoring and alerting** setup

**This analysis is complete.** Implementation is a separate effort.

---

## Appendix: Reference Documentation

### Documents Reviewed
- `CALENDAR_AUTHORITY_AND_SYNC.md` - Calendar authority model
- `HOUSEHOLD_CALENDAR_SYSTEM.md` - Household calendar implementation
- `TRAVEL_SYSTEM_README.md` - Travel trip architecture
- `GUARDRAILS_UNIFIED_ARCHITECTURE.md` - Guardrails architecture
- `CURRENT_STATE_ARCHITECTURE.md` - Overall system architecture
- `HOUSEHOLD_DASHBOARD_ARCHITECTURE.md` - Household features
- `PERSONAL_SPACES_CONSUMPTION_MODEL.md` - Personal spaces design
- `COLLABORATION_SURFACES_ARCHITECTURE.md` - Collaboration model

### Database Tables Examined
- `calendar_events` - Household calendar (NOT NULL household_id)
- `calendar_event_members` - Event member assignments
- `calendar_sync_settings` - User sync preferences
- `master_projects` - Guardrails projects
- `project_users` - Project membership and roles
- `trips` - Travel trip metadata
- `trip_collaborators` - Trip membership and roles
- `trip_itinerary_items` - Trip day-by-day planning
- `trip_accommodations` - Trip lodging with dates
- `spaces` - Shared spaces
- `space_members` - Space membership
- `households` - Household profiles
- `household_members` - Household membership

### Migration Files Reviewed
- `20251210220839_create_household_calendar_system.sql`
- `20251217204816_add_calendar_source_attribution.sql`
- `20251217203615_20251217190000_create_calendar_sync_settings.sql`

---

**Analysis completed:** 2026-01-02  
**Prepared for:** Architecture review (analysis phase only)  
**Status:** ✅ Complete - Ready for design phase

