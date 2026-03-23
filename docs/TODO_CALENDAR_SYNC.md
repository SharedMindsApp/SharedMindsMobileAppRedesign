# Todo-Calendar Sync Integration

**Document Purpose**: Documentation of the bidirectional sync between personal todos and calendar events.

**Last Updated**: February 2025  
**Status**: Implementation Complete

---

## Overview

The To-Do widget now integrates seamlessly with the personal calendar, allowing users to:
- Schedule todos on their calendar
- Keep todos and calendar events in sync
- View scheduled todos in both the todo list and calendar
- Navigate between todos and calendar

---

## Architecture

### Database Schema

**Migration**: `supabase/migrations/20260220000004_add_todo_calendar_sync.sql`

**Changes**:
- Added `calendar_event_id` column to `personal_todos` (nullable UUID, references `calendar_events.id`)
- Added indexes for efficient lookups
- Foreign key constraint with `ON DELETE SET NULL` (if calendar event is deleted, todo remains but link is removed)

### Service Layer

**File**: `src/lib/todoCalendarSync.ts`

**Core Functions**:
- `scheduleTodoOnCalendar()`: Creates calendar event and links to todo
- `unscheduleTodoFromCalendar()`: Deletes calendar event and unlinks from todo
- `syncTodoToCalendar()`: Updates calendar event when todo changes
- `syncTodoCompletionToCalendar()`: Syncs completion status (placeholder for future)
- `getTodosForCalendarEvent()`: Gets todos linked to a calendar event
- `isTodoScheduled()`: Checks if todo is scheduled

### Widget Integration

**File**: `src/components/fridge-canvas/widgets/TodoCanvasWidget.tsx`

**Features**:
- Schedule button on each todo (shows "Schedule" or "Scheduled")
- Visual indicator for scheduled todos (blue calendar icon)
- "View Calendar" button in widget header
- Automatic sync when todo is completed
- Navigation to calendar widget

---

## How It Works

### 1. Scheduling a Todo

**User Flow**:
1. User clicks "Schedule" button on a todo
2. System creates a calendar event:
   - Title: Todo title
   - Description: Todo description (if available)
   - Start time: Today at 2 PM (or uses `due_date` if set)
   - End time: 1 hour later
   - Event type: `'task'`
   - Source: `'personal'` with `sourceEntityId` = todo.id
3. System links todo to calendar event via `calendar_event_id`
4. Button changes to "Scheduled" with filled calendar icon

**Technical Flow**:
```typescript
scheduleTodoOnCalendar(todo, startAt, endAt, allDay)
  → createPersonalCalendarEvent(userId, eventInput)
  → Insert into calendar_events (user_id, title, start_at, end_at, event_type='task')
  → Update personal_todos SET calendar_event_id = event.id
  → Return updated todo + eventId
```

### 2. Syncing Todo Changes

**When Todo is Updated**:
- Title changes → Calendar event title updated
- Description changes → Calendar event description updated
- Due date changes → Calendar event start time updated
- Completion status → Calendar event remains (can be enhanced later)

**Technical Flow**:
```typescript
syncTodoToCalendar(todo)
  → Check if todo.calendar_event_id exists
  → Verify calendar event still exists
  → Update calendar event with todo changes
  → If event deleted, unlink from todo
```

### 3. Unschedule Todo

**User Flow**:
1. User clicks "Scheduled" button on a scheduled todo
2. System deletes the calendar event
3. System unlinks todo (sets `calendar_event_id` to NULL)
4. Button changes back to "Schedule"

**Technical Flow**:
```typescript
unscheduleTodoFromCalendar(todo)
  → deletePersonalCalendarEvent(eventId, userId)
  → Update personal_todos SET calendar_event_id = NULL
  → Return updated todo
```

### 4. Visual Indicators

**Scheduled Todos**:
- Calendar icon is filled (blue)
- Button text: "Scheduled"
- Hover: "Remove from calendar"

**Unscheduled Todos**:
- Calendar icon is outline (gray)
- Button text: "Schedule"
- Hover: "Schedule on calendar"

---

## User Experience

### Scenario 1: Schedule a Todo

1. User creates todo: "Write in journal"
2. Clicks "Schedule" button
3. Todo appears on calendar at 2 PM today
4. Button shows "Scheduled" with blue icon
5. User can click to view calendar or unschedule

### Scenario 2: Update Scheduled Todo

1. User changes todo title: "Write in journal" → "Write morning journal entry"
2. Calendar event title automatically updates
3. Both systems stay in sync

### Scenario 3: Complete Scheduled Todo

1. User marks scheduled todo as complete
2. Todo shows as completed in list
3. Calendar event remains (can be enhanced to mark as completed)
4. User can still see it in calendar history

### Scenario 4: Navigate to Calendar

1. User clicks "View Calendar" button in todo widget header
2. Navigates to calendar widget
3. Can see all scheduled todos as calendar events
4. Can edit events (which syncs back to todos)

---

## Technical Details

### Calendar Event Creation

**Event Properties**:
- `user_id`: Current user's ID (personal calendar)
- `household_id`: NULL (personal events)
- `title`: Todo title
- `description`: Todo description (if available)
- `start_at`: Default 2 PM today, or uses `due_date`
- `end_at`: 1 hour after start
- `all_day`: false
- `event_type`: `'task'`
- `source_type`: NULL (personal event)
- `source_entity_id`: Todo ID (for linking back)

### Data Integrity

**Constraints**:
- `calendar_event_id` is nullable (todos can exist without calendar events)
- Foreign key ensures valid calendar event references
- `ON DELETE SET NULL` prevents orphaned references
- RLS policies ensure users can only link to their own calendar events

### Error Handling

**Graceful Degradation**:
- If calendar event creation fails, todo is not created (rollback)
- If calendar event is deleted externally, todo automatically unlinks
- If sync fails, error is logged but doesn't break todo functionality
- All operations are optional (todos work fine without calendar)

---

## Future Enhancements

### Potential Additions

1. **Time Picker**: Allow users to choose specific time when scheduling
2. **Recurring Todos**: Schedule recurring todos as recurring calendar events
3. **Completion Sync**: Mark calendar event as completed when todo is completed
4. **Calendar → Todo**: Create todos from calendar events
5. **Smart Scheduling**: Suggest optimal times based on existing calendar events
6. **Notifications**: Remind users of scheduled todos via calendar notifications

### Example: Time Picker

```typescript
// Future enhancement
const handleScheduleWithTime = async (todo: PersonalTodo) => {
  const time = await showTimePicker();
  await scheduleTodoOnCalendar(todo, time.start, time.end);
};
```

---

## Benefits

### For Users

1. **Time Management**: See todos in context of their schedule
2. **Planning**: Block time for important tasks
3. **Visibility**: Todos appear where they're most useful (calendar)
4. **Flexibility**: Easy to schedule/unschedule as needed

### For the App

1. **Integration**: Todos and calendar work together seamlessly
2. **Context**: Users see tasks in time context
3. **ADHD-Friendly**: Reduces need to remember when to do things
4. **Unified Experience**: One system, multiple views

---

## Testing Checklist

- [ ] Schedule todo creates calendar event
- [ ] Scheduled todo shows "Scheduled" button
- [ ] Unschedule removes calendar event
- [ ] Todo updates sync to calendar
- [ ] Calendar event deletion unlinks todo
- [ ] "View Calendar" navigates correctly
- [ ] Scheduled todos visible in calendar widget
- [ ] Multiple todos can be scheduled
- [ ] Error handling works gracefully

---

## Related Documentation

- **Todo Widget Architecture**: `docs/TODO_WIDGET_ARCHITECTURE.md`
- **Calendar Architecture**: `docs/CALENDAR_ARCHITECTURE.md`
- **Personal Calendar Service**: `src/lib/personalSpaces/calendarService.ts`

---

**End of Document**
