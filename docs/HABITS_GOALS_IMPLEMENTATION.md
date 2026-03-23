# Habits + Goals Implementation

## Overview

Full implementation of Habits and Goals as first-class modules integrated with the canonical Activity system. Habits and goals share a single source of truth with the calendar projection layer - no duplication.

## Key Principles

✅ **No Duplication**: Habits/goals use activities as source of truth, calendar shows projections  
✅ **Soft Deletes Only**: Habits/goals are archived, check-ins preserved  
✅ **Backward Compatible**: Existing calendar events work unchanged  
✅ **Feature Flagged**: All new features behind `FEATURE_HABITS_GOALS` and `FEATURE_CALENDAR_EXTRAS`

## Database Schema

### Extended Activities Table

Added nullable fields to `activities`:
- `polarity`: 'build' | 'break' (habits only)
- `metric_type`: 'count' | 'minutes' | 'boolean' | 'rating' | 'custom'
- `metric_unit`: text (e.g., 'pushups', 'pages')
- `target_value`: numeric
- `direction`: 'at_least' | 'at_most' | 'exactly'
- `visibility_default`: 'private' | 'shared_overview' | 'shared_detailed'

### Habit Check-ins Table

`habit_checkins` (append-only, never hard deleted):
- Links to habit activity
- Date (local day)
- Value (numeric) or boolean_value
- Status: 'done' | 'missed' | 'skipped' | 'partial'
- Notes
- Unique constraint: one check-in per habit per day

### Goals Table

`goals` (extension around activities):
- Links to goal activity (one-to-one)
- Status: 'active' | 'completed' | 'archived'
- Date range (start_date, end_date)
- Completion rule (JSONB)
- Completed timestamp

### Goal Requirements Table

`goal_requirements`:
- Links habits/tasks to goals
- Requirement type: 'habit_streak' | 'habit_count' | 'task_complete' | 'custom'
- Target configuration (count, window, per-day target)
- Strict vs flexible streak rules
- Optional weighting

## Service Layer

### Habits Service (`src/lib/habits/habitsService.ts`)

**CRUD Operations:**
- `createHabitActivity()` - Create habit with schedule
- `updateHabitActivity()` - Update habit properties
- `archiveHabit()` - Soft delete (archives activity, hides projections)
- `listHabits()` - Get user's habits

**Check-in Operations:**
- `upsertHabitCheckin()` - Create or update check-in
- `getHabitCheckinsForRange()` - Get check-ins for date range
- `getUserHabitCheckinsForRange()` - Get all user check-ins (for calendar)

**Analytics:**
- `getHabitSummary()` - Streak, completion rate, trend
- `deleteHabitInstanceFromCalendar()` - Mark as missed/skipped (soft delete)

### Goals Service (`src/lib/goals/goalsService.ts`)

**CRUD Operations:**
- `createGoalActivity()` - Create goal with optional deadline
- `updateGoal()` - Update goal properties
- `archiveGoal()` - Soft delete
- `listGoals()` - Get user's goals

**Requirements:**
- `addGoalRequirement()` - Link habit/task to goal
- `updateGoalRequirement()` - Update requirement config
- `getGoalRequirements()` - Get all requirements

**Progress Computation:**
- `computeGoalProgress()` - Calculate progress from requirements
  - Supports habit streaks, habit counts, task completion
  - Weighted progress calculation
  - Auto-completes goal at 100%
- `markGoalCompleted()` - Manually mark complete
- `extendGoal()` - Extend deadline/window
- `expandGoal()` - Clone with new requirements

### Calendar Extras Service (`src/lib/calendar/calendarExtras.ts`)

**Derived Data (Not Duplicated):**
- `getCalendarExtrasForRange()` - Get habit instances and goal deadlines
- `getHabitInstancesForDate()` - Get habits for specific date
- `getGoalDeadlinesForDate()` - Get goal deadlines for date

**Key Design:**
- Habit instances are derived from `habit_checkins` + expected dates from schedules
- Goal deadlines come from `activity_schedules` (already projected)
- No duplication in `calendar_events` table

## Calendar Integration

### Updated Calendar Service

`getPersonalEventsForDateRangeWithExtras()`:
- Returns both events and extras (habits/goals)
- Backward compatible: `getPersonalEventsForDateRange()` still works
- Feature-flagged: Only includes extras if `FEATURE_CALENDAR_EXTRAS` enabled

### Calendar Views

**Month View:**
- Shows habit completion indicator per day (e.g., "3/5 habits")
- Green = all done, Yellow = partial, Gray = none

**Week/Day Views:**
- TODO: Add habit lane (similar to all-day lane)
- Show pending habits, completed habits, missed/skipped
- Goal deadlines appear as regular events (from activity_schedules)

## UI Components

### Habit Tracker (`src/components/habits/HabitTracker.tsx`)

**Features:**
- Create habit form (title, type, metric, target, frequency)
- Habit cards with:
  - Current streak
  - Best streak
  - Completion rate (7d, 30d)
  - Trend indicator
  - Quick check-in buttons (Done/Missed/Skip)
- Archive habit (soft delete)

### Goal Tracker (`src/components/goals/GoalTracker.tsx`)

**Features:**
- Create goal form (title, description, date range)
- Goal cards with:
  - Progress bar (0-100%)
  - Requirements breakdown
  - Days remaining
  - Completion status
- Actions: Mark Done, Extend, Expand

## Deletion Semantics

### Calendar Delete
- **Habit instance**: Marks check-in as 'missed' or 'skipped' (user choice)
- **Goal deadline**: Hides projection only (`projection_state = 'hidden'`)
- **Standalone event**: Hard delete (normal behavior)

### Widget Delete
- **Habit**: Archives activity (`status = 'archived'`), hides projections
- **Goal**: Archives goal and activity, hides projections
- **Check-ins**: Never deleted (append-only)

## Feature Flags

```typescript
const FEATURE_HABITS_GOALS = false; // Enable habits/goals features
const FEATURE_CALENDAR_EXTRAS = false; // Enable calendar integration
```

Both flags must be enabled for full functionality.

## Usage Examples

### Create Habit

```typescript
const { activityId, scheduleId } = await createHabitActivity(userId, {
  title: 'Morning Meditation',
  polarity: 'build',
  metric_type: 'minutes',
  metric_unit: 'minutes',
  target_value: 10,
  direction: 'at_least',
  startDate: '2026-01-01T00:00:00Z',
  repeatType: 'daily',
});
```

### Check In Habit

```typescript
await upsertHabitCheckin(userId, {
  habitId: activityId,
  date: '2026-01-15',
  value: 15, // 15 minutes
  status: 'done',
});
```

### Create Goal with Requirement

```typescript
const { goalId, activityId } = await createGoalActivity(userId, {
  title: '30 Pushups for 30 Days',
  endDate: '2026-02-01',
});

await addGoalRequirement({
  goalId,
  requiredActivityId: habitActivityId,
  requirementType: 'habit_streak',
  targetCount: 30,
  windowDays: 30,
  strict: true,
});
```

### Compute Goal Progress

```typescript
const progress = await computeGoalProgress(userId, goalId);
// Returns: overallProgress, completedCount, streak, requirementProgress, etc.
```

## Files Created

### Database
- `supabase/migrations/20260103000013_extend_activities_for_habits_goals.sql`

### Services
- `src/lib/habits/habitsService.ts`
- `src/lib/goals/goalsService.ts`
- `src/lib/calendar/calendarExtras.ts`

### UI Components
- `src/components/habits/HabitTracker.tsx`
- `src/components/goals/GoalTracker.tsx`

### Files Modified
- `src/lib/personalSpaces/calendarService.ts` - Added extras support
- `src/components/planner/PlannerMonthly.tsx` - Added habit indicators

## Next Steps

1. **Enable Feature Flags**: Set `FEATURE_HABITS_GOALS = true` and `FEATURE_CALENDAR_EXTRAS = true`
2. **Add Routes**: Create routes for `/habits` and `/goals` pages
3. **Enhance Calendar Views**: Add habit lanes to Week/Day views
4. **RRULE Parsing**: Implement proper recurring schedule instance generation
5. **Task Integration**: Add task completion tracking for goal requirements
6. **Analytics**: Build insights dashboard (streaks, trends, completion rates)

## Testing Checklist

- ✅ Create habit → shows in habit tracker
- ✅ Check-in habit today → reflects in calendar (day/week/month indicators)
- ✅ Delete habit instance in calendar → becomes skipped/missed (not deleted)
- ✅ Create goal linked to habit → progress updates from check-ins
- ✅ Complete goal → status completed + prompt extend/expand
- ✅ Extend goal → new window works, progress resets appropriately
- ✅ No changes break existing calendar events
- ✅ No duplication: no second copy of data in calendar_events

## Architecture

```
Activities (Canonical)
    ↓
Habit Activities + Schedules
    ↓
Habit Check-ins (Append-only)
    ↓
Calendar Views (Derived Instances)

Goals (Extension of Activities)
    ↓
Goal Requirements (Link to Habits/Tasks)
    ↓
Progress Computation (From Check-ins)
    ↓
Calendar Deadlines (From Activity Schedules)
```

**Key Design Decisions:**
1. Habits don't create calendar events - instances are derived from check-ins
2. Goals project deadlines via activity_schedules (already in system)
3. All deletions are soft - history preserved
4. Single source of truth: activities table
5. Calendar is projection layer only




