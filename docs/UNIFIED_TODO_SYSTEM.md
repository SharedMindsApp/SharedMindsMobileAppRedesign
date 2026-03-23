# Unified To-Do System

## Overview
A comprehensive to-do list system that automatically syncs with Personal Spaces and allows optional sharing to Shared Spaces.

## Key Features

### 1. Automatic Personal Space Integration
- All tasks are automatically created in your Personal Space
- Tasks persist across sessions and sync in real-time
- No manual setup required

### 2. Optional Sharing to Spaces
- **Opt-in model**: Tasks remain private by default
- Share individual tasks to specific Shared Spaces
- Unshare tasks at any time
- Shared tasks visible to all space members
- Original creator maintains full control

### 3. Task Management
- **Quick Add**: Create tasks with just a title
- **Detailed Tasks**: Add descriptions, due dates, priority levels
- **Priority Levels**: Low, Medium, High
- **Categories**: Optional task categorization
- **Completion Tracking**: Check off completed tasks
- **Filters**: View all, active, or completed tasks only

### 4. Multiple Access Points

#### Planner Section (`/planner/planning/todos`)
Full-featured interface with:
- Expanded task details
- Priority and due date management
- Bulk operations (clear completed)
- Advanced filtering

#### Personal Spaces Canvas
Widget-based interface with:
- Quick task creation
- Compact view of active tasks
- Drag-and-drop positioning
- Customizable widget sizes (icon, mini, large, xlarge)

## Database Schema

### personal_todos
- Core table for all tasks
- Linked to user's Personal Space (household_id)
- Contains title, description, priority, due_date
- Tracks completion status and timestamps

### todo_space_shares
- Junction table for sharing tasks
- Links tasks to Shared Spaces
- Tracks who shared and when
- Automatic cleanup when task deleted

## Usage Examples

### Creating a Task
```typescript
// In planner or widget
await todosService.createTodo({
  householdId: personalSpaceId,
  title: 'Complete project report',
  description: 'Finish Q1 analysis',
  dueDate: '2026-01-15',
  priority: 'high'
});
```

### Sharing a Task
```typescript
// User chooses to share from UI
await todosService.shareToSpace(taskId, sharedSpaceId);
// Task now visible to all space members
// Original creator can still edit/delete
```

### Viewing Tasks
```typescript
// Get personal tasks
const myTasks = await todosService.getTodos(personalSpaceId);

// Get tasks shared to a space
const sharedTasks = await todosService.getSharedTodosInSpace(spaceId);
```

## Security & Privacy

### Row Level Security (RLS)
- Users can only view/edit their own tasks
- Sharing requires membership in target space
- Shared tasks read-only for space members
- Only task creator can unshare or delete

### Data Isolation
- Personal tasks isolated by user_id
- Shared visibility controlled through junction table
- No cross-contamination between spaces

## Widget Integration

### Adding To-Do Widget to Canvas
1. Open Personal Space canvas
2. Click "+" to open widget toolbox
3. Select "To-Do List" from Planning category
4. Widget auto-populates with your tasks
5. Resize/move as needed

### Widget Sizes
- **Icon**: Compact task counter
- **Mini**: List of active tasks (default)
- **Large**: Full task list with descriptions
- **XLarge**: Extended view with all details

## Future Enhancements
- Recurring tasks
- Task templates
- Subtasks and checklists
- Task dependencies
- Collaborative task editing
- Task comments and discussions
- Integration with calendar for due dates
- Reminders and notifications
