# Unified Canonical Activity System Implementation

## Overview

A unified activity system has been implemented that ensures habits, goals, tasks, and other activity-based widgets share a single source of truth with the calendar. Calendar events are projections only - activities are the canonical source.

## Key Principles

✅ **No Data Duplication**: Activities are owned by widgets, calendar events are projections  
✅ **Soft Deletes Only**: Activities are archived, calendar projections are hidden  
✅ **Backward Compatible**: Existing calendar events work as-is  
✅ **Additive Changes**: No breaking migrations or schema changes  

## Database Schema

### Tables Created

1. **`activities`** - Canonical source of truth
   - `id`, `type`, `title`, `description`
   - `owner_id` (user who owns the activity)
   - `status` (active, completed, archived, inactive)
   - `metadata` (flexible JSONB for type-specific data)
   - `archived_at` (soft delete timestamp)

2. **`activity_schedules`** - Scheduling information
   - `activity_id` (FK to activities)
   - `schedule_type` (single, recurring, deadline, time_block)
   - `start_at`, `end_at`
   - `recurrence_rule` (RRULE format for recurring)
   - `timezone`, `metadata`

3. **`calendar_events`** - Extended (additive only)
   - `activity_id` (nullable FK to activities)
   - `projection_state` (active, hidden, removed)

### Enums Created

- `activity_type`: habit, goal, task, meeting, meal, reminder, time_block, appointment, milestone, travel_segment, event
- `activity_status`: active, completed, archived, inactive
- `schedule_type`: single, recurring, deadline, time_block
- `projection_state`: active, hidden, removed

## Service Layer

### Core Services (`src/lib/activities/`)

1. **`activityService.ts`** - CRUD operations
   - `createActivity()` - Create new activity
   - `getActivity()` - Get activity by ID
   - `getUserActivities()` - Get user's activities
   - `updateActivity()` - Update activity
   - `archiveActivity()` - Soft delete (archive)

2. **`activityCalendarProjection.ts`** - Calendar projection
   - `projectActivityToCalendar()` - Create/update calendar projection
   - `projectActivitySchedulesToCalendar()` - Project all schedules
   - `hideActivityProjections()` - Hide from calendar (soft delete)
   - `restoreActivityProjections()` - Restore hidden projections

3. **Adapters** - Bridge existing systems
   - `habitActivityAdapter.ts` - Habit → Activity integration
   - `goalActivityAdapter.ts` - Goal → Activity integration

## Usage Examples

### Creating a Habit Activity

```typescript
import { createHabitActivity } from '@/lib/activities';

const { activityId, scheduleId } = await createHabitActivity(userId, {
  title: 'Morning Meditation',
  description: '10 minutes daily',
  startDate: '2026-01-01T00:00:00Z',
  repeatType: 'daily',
});

// Activity is automatically projected to calendar
```

### Creating a Goal Activity

```typescript
import { createGoalActivity } from '@/lib/activities';

const { activityId, scheduleId } = await createGoalActivity(userId, {
  title: 'Complete Project',
  description: 'Finish by end of Q1',
  targetDate: '2026-03-31T00:00:00Z',
  category: 'work',
  progress: 0,
});

// Deadline is automatically projected to calendar
```

### Deleting from Calendar (Soft Delete)

```typescript
import { deletePersonalCalendarEvent } from '@/lib/personalSpaces/calendarService';

// If event is linked to activity, it hides the projection
// If event is standalone, it deletes normally
await deletePersonalCalendarEvent(userId, eventId);
```

### Archiving an Activity

```typescript
import { archiveHabitActivity } from '@/lib/activities';

// Hides calendar projections and archives activity
// History is preserved
await archiveHabitActivity(userId, activityId);
```

## Calendar Service Updates

### Reading Events

The calendar service now automatically filters out hidden/removed projections:

```typescript
// Only returns active projections
const events = await getPersonalEventsForDateRange(userId, startDate, endDate);
```

### Deleting Events

The calendar service checks if an event is linked to an activity:

- **Activity-linked**: Hides projection (soft delete)
- **Standalone**: Deletes normally (hard delete)

## Migration Strategy

### Phase 1: Foundation (✅ Complete)
- Database schema created
- Service layer implemented
- Calendar service updated
- Adapters created

### Phase 2: Integration (Next Steps)
1. Update habit tracker widgets to use `createHabitActivity()`
2. Update goal widgets to use `createGoalActivity()`
3. Migrate existing habits/goals to activities (optional, gradual)

### Phase 3: Full Migration (Future)
1. All widgets use activity system
2. Calendar only shows projections
3. Analytics and insights based on activities

## Backward Compatibility

✅ **Existing calendar events work unchanged**
- `activity_id` is nullable
- `projection_state` defaults to 'active'
- Old events without `activity_id` behave normally

✅ **No breaking changes**
- All changes are additive
- Existing queries continue to work
- Widgets can migrate gradually

## Permissions

Activities respect existing permission systems:
- RLS policies enforce ownership
- Calendar respects `PermissionFlags`
- Projections inherit activity permissions

## Soft Delete Semantics

### Calendar Delete
- **Activity-linked event**: `projection_state = 'hidden'`
- **Standalone event**: Hard delete (removed from database)

### Widget Delete
- **Activity**: `status = 'archived'`, `archived_at = now()`
- **Calendar projections**: `projection_state = 'hidden'`
- **History preserved**: All data remains for analytics

## Benefits

1. **Single Source of Truth**: Activities are canonical, calendar is projection
2. **No Duplication**: One activity, multiple calendar views
3. **History Preserved**: Soft deletes maintain data for analytics
4. **Unified System**: Habits, goals, tasks all use same foundation
5. **Future Ready**: Foundation for streaks, insights, analytics

## Files Created

- `supabase/migrations/20260103000012_create_unified_activity_system.sql`
- `src/lib/activities/activityTypes.ts`
- `src/lib/activities/activityService.ts`
- `src/lib/activities/activityCalendarProjection.ts`
- `src/lib/activities/habitActivityAdapter.ts`
- `src/lib/activities/goalActivityAdapter.ts`
- `src/lib/activities/index.ts`

## Files Modified

- `src/lib/personalSpaces/calendarService.ts` - Updated to handle projections and soft deletes

## Next Steps

1. Update habit tracker UI to use `createHabitActivity()`
2. Update goal widgets to use `createGoalActivity()`
3. Add task activity adapter
4. Implement recurring schedule instance generation (RRULE parsing)
5. Add analytics queries based on activities




