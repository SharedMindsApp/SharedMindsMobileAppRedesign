# To-Do Widget Architecture & Implementation

**Document Purpose**: Comprehensive documentation of the To-Do List widget, its architecture, data model, and implementation details.

**Last Updated**: February 2025  
**Status**: Living Document - Reference for Development

---

## Overview

The To-Do List widget is a core component of the SharedMinds Personal Spaces system. It provides users with a simple, ADHD-friendly task management interface that supports:

- **Personal task management** (scoped to user's personal space)
- **Task completion tracking** with visual feedback
- **Filtering** (Active, Completed, All)
- **Optional sharing** to shared spaces (Households/Teams)
- **Future support** for AI-powered task breakdowns

The widget is designed with ADHD-first principles:
- **No shame indicators**: No overdue badges, no streaks, no failure metrics
- **Permission-based language**: Tasks can be completed or left incomplete without pressure
- **Visual clarity**: Clear distinction between active and completed tasks
- **Reduced overwhelm**: Filtering allows focus on what matters now

---

## Architecture Overview

### Component Hierarchy

```
TodoCanvasWidget (Widget Component)
├── State Management (React Hooks)
├── Service Layer (todosService)
│   ├── getTodos()
│   ├── createTodo()
│   ├── updateTodo()
│   ├── deleteTodo()
│   └── getPersonalSpace()
└── Database Layer (Supabase)
    ├── personal_todos table
    └── todo_space_shares table
```

### Key Design Decisions

1. **Personal vs Shared Separation**
   - Personal todos have `household_id = NULL`
   - Shared todos have `household_id` referencing a household
   - This separation prevents foreign key violations and maintains clear data boundaries

2. **Mode-Aware Creation**
   - `createTodo()` explicitly handles `spaceMode: 'personal' | 'shared'`
   - Defensive checks prevent personal todos from including household_id
   - RLS policies enforce correct data model

3. **Filtering at Component Level**
   - Filtering happens in-memory after data fetch
   - Three filter states: `'active' | 'completed' | 'all'`
   - Default to `'active'` to reduce visual clutter

---

## Component Structure

### TodoCanvasWidget

**Location**: `src/components/fridge-canvas/widgets/TodoCanvasWidget.tsx`

**Props**:
```typescript
interface TodoCanvasWidgetProps {
  householdId: string;  // Legacy prop, not used for personal todos
  viewMode: WidgetViewMode;  // 'micro' | 'normal' | 'expanded'
}
```

**State**:
```typescript
const [todos, setTodos] = useState<PersonalTodo[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [newTodoTitle, setNewTodoTitle] = useState<string>('');
const [showAddInput, setShowAddInput] = useState<boolean>(false);
const [personalSpaceId, setPersonalSpaceId] = useState<string | null>(null);
const [filter, setFilter] = useState<TodoFilter>('active');
```

**Key Methods**:
- `loadPersonalSpace()`: Fetches user's personal space ID
- `loadTodos()`: Loads todos with `household_id IS NULL` (personal todos)
- `handleAdd()`: Creates new todo with `householdId: null` and `spaceMode: 'personal'`
- `handleToggle()`: Toggles completion status
- `handleDelete()`: Deletes a todo

**View Modes**:
- **Micro**: Shows only count of active tasks (for dashboard widgets)
- **Normal**: Full widget with filter, add form, and task list

---

## Data Model

### PersonalTodo Interface

```typescript
export interface PersonalTodo {
  id: string;
  user_id: string;
  household_id: string | null;  // NULL for personal, UUID for shared
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  due_date?: string;
  priority: TodoPriority;  // 'low' | 'medium' | 'high'
  category?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  shared_spaces?: SharedSpace[];  // Populated via join
  // Breakdown fields (Phase 1 - AI task breakdown)
  has_breakdown?: boolean;
  breakdown_context?: string;
  breakdown_generated_at?: string;
}
```

### CreateTodoParams Interface

```typescript
export interface CreateTodoParams {
  householdId: string | null;  // NULL for personal todos
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
  spaceMode?: 'personal' | 'shared';  // Explicit mode
}
```

**Critical Rule**: 
- Personal todos: `householdId` MUST be `null`
- Shared todos: `householdId` MUST reference a valid household

---

## Service Layer

### todosService.ts

**Location**: `src/lib/todosService.ts`

#### Core Functions

**`getPersonalSpace()`**
- Returns user's personal space ID
- Checks new `spaces` table first (`context_type = 'personal'`)
- Falls back to old `households` table for backward compatibility
- Returns `null` if no personal space exists

**`getTodos(householdId?: string)`**
- If `householdId` is provided: Returns shared todos for that household
- If `householdId` is `null` or undefined: Returns personal todos (`household_id IS NULL`)
- Includes `todo_space_shares` join for sharing information
- Orders by: `completed ASC`, `order_index ASC`, `created_at DESC`

**`createTodo(params: CreateTodoParams)`**
- **Mode Detection**: Auto-detects mode if not provided
- **Defensive Check**: Throws error if `spaceMode === 'personal'` and `householdId !== null`
- **Order Index**: Calculates max `order_index` and increments
- **Breakdown Fields**: Conditionally includes breakdown metadata if columns exist
- **Error Handling**: Provides user-friendly RLS error messages

**`updateTodo(todoId: string, params: UpdateTodoParams)`**
- Updates todo fields
- Sets `completed_at` timestamp when marking as completed
- Clears `completed_at` when uncompleting

**`deleteTodo(todoId: string)`**
- Deletes todo by ID
- RLS ensures user can only delete their own todos

**`clearCompleted(householdId: string | null)`**
- Deletes all completed todos
- Filters by `household_id IS NULL` for personal todos
- Filters by `household_id = householdId` for shared todos

---

## Database Schema

### personal_todos Table

**Migration**: `20260101111430_create_unified_todo_system.sql`

```sql
CREATE TABLE personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,  -- NULLABLE
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  due_date date,
  priority todo_priority NOT NULL DEFAULT 'medium',
  category text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Breakdown fields (Phase 1)
  has_breakdown boolean NOT NULL DEFAULT false,
  breakdown_context text,
  breakdown_generated_at timestamptz
);
```

**Key Constraints**:
- `household_id` is **nullable** (migration `20260220000003`)
- Foreign key only enforced when `household_id IS NOT NULL`
- `order_index` used for manual sorting
- `updated_at` auto-updated via trigger

**Indexes**:
- `idx_personal_todos_user_id` on `user_id`
- `idx_personal_todos_household_id` on `household_id`
- `idx_personal_todos_completed` on `completed`
- `idx_personal_todos_due_date` on `due_date` (partial, WHERE due_date IS NOT NULL)

### todo_space_shares Table

**Purpose**: Junction table for sharing personal todos to shared spaces

```sql
CREATE TABLE todo_space_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES personal_todos(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(todo_id, space_id)
);
```

**Note**: Sharing functionality is implemented but not yet exposed in the widget UI.

---

## Row-Level Security (RLS) Policies

### Personal Todos

**SELECT Policy**: "Users can view own todos"
```sql
CREATE POLICY "Users can view own todos"
  ON personal_todos FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      household_id IS NULL  -- Personal todos
      OR household_id IS NOT NULL  -- Shared todos (separate policy handles visibility)
    )
  );
```

**INSERT Policy**: "Users can create own todos"
```sql
CREATE POLICY "Users can create own todos"
  ON personal_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Personal todos: household_id must be NULL
      (household_id IS NULL)
      OR
      -- Shared todos: must be member of household
      (household_id IS NOT NULL AND is_user_household_member(household_id))
    )
  );
```

**UPDATE Policy**: "Users can update own todos"
- Users can only update their own todos (`user_id = auth.uid()`)

**DELETE Policy**: "Users can delete own todos"
- Users can only delete their own todos (`user_id = auth.uid()`)

### Key RLS Principles

1. **Personal Todos**: Only require `user_id = auth.uid()` (no household membership check)
2. **Shared Todos**: Require `user_id = auth.uid()` AND household membership
3. **Sharing**: Users can share their own todos to spaces they're members of

---

## Key Features

### 1. Filtering System

**Three Filter States**:
- **Active** (default): Shows only incomplete tasks
- **Completed**: Shows only completed tasks
- **All**: Shows both active and completed tasks

**UI Implementation**:
- Filter buttons in header (Active, Completed, All)
- "All" button only shown when there are completed tasks
- Active filter highlighted with white background and emerald text

### 2. Visual Feedback

**Active Tasks**:
- Normal text color (`text-slate-700`)
- Empty checkbox with border
- Hover effect on checkbox

**Completed Tasks**:
- Strikethrough text (`line-through`)
- Muted color (`text-slate-500`)
- Green filled checkbox with white checkmark
- Reduced opacity (`opacity-75`)

### 3. Task Management

**Add Task**:
- Click "+" button to show input form
- Form includes title input and "Add" button
- Auto-focus on input field
- Form hides after successful creation

**Toggle Completion**:
- Click checkbox to toggle
- Updates `completed` and `completed_at` fields
- Immediate visual feedback

**Delete Task**:
- Hover over task to reveal delete button
- Click trash icon to delete
- No confirmation (ADHD-friendly: reduce friction)

### 4. Progress Indicator

**Completion Summary**:
- Shows "X of Y completed" when viewing active/all filters
- Hidden when viewing completed filter
- Styled with emerald background

---

## State Management Flow

### Initialization

1. Component mounts
2. `loadPersonalSpace()` called
3. `getPersonalSpace()` fetches user's personal space ID
4. If space exists, `loadTodos()` is called
5. Todos loaded with `household_id IS NULL` filter

### Creating a Todo

1. User enters title and submits form
2. `handleAdd()` called
3. Verifies personal space exists (retries if needed)
4. Calls `createTodo()` with:
   - `householdId: null`
   - `spaceMode: 'personal'`
5. Service layer:
   - Validates mode (throws if personal mode with household_id)
   - Calculates order_index
   - Inserts into database
6. On success: clears form, reloads todos

### Toggling Completion

1. User clicks checkbox
2. `handleToggle()` called
3. `updateTodo()` called with `completed: !todo.completed`
4. If completing: sets `completed_at` timestamp
5. If uncompleting: clears `completed_at`
6. Reloads todos to reflect change

### Filtering

1. User clicks filter button
2. `setFilter()` updates state
3. `filteredTodos` computed from `todos` array
4. UI re-renders with filtered list

---

## User Flow

### Viewing Todos

1. User navigates to Personal Space
2. Widget loads and fetches personal space ID
3. Todos loaded (only personal todos, `household_id IS NULL`)
4. Active todos displayed by default
5. User can switch to "Completed" or "All" filters

### Adding a Todo

1. User clicks "+" button
2. Input form appears
3. User types task title
4. User presses Enter or clicks "Add"
5. Todo created with `household_id = NULL`
6. Form clears and todos refresh

### Completing a Todo

1. User clicks checkbox on active task
2. Task immediately shows as completed (strikethrough, green checkmark)
3. `completed_at` timestamp set
4. Task moves to completed list when filtering

### Deleting a Todo

1. User hovers over task
2. Delete button (trash icon) appears
3. User clicks delete button
4. Todo deleted from database
5. List refreshes

---

## Error Handling

### Personal Space Not Found

**Scenario**: User has no personal space

**Handling**:
- `getPersonalSpace()` returns `null`
- Widget shows loading state
- Cannot create todos (user must have personal space)

**User Message**: "Personal space not found. Please refresh the page."

### RLS Policy Violation

**Scenario**: Attempting to create todo with invalid household_id

**Handling**:
- Service layer throws descriptive error
- Error message explains:
  - User might not be a member of the space
  - Space ID might be incorrect
- User sees alert with error message

### Database Errors

**Scenario**: Network error, constraint violation, etc.

**Handling**:
- Errors caught in try/catch blocks
- User-friendly error messages displayed
- Console logging for debugging

---

## Future Enhancements

### Phase 1: AI Task Breakdown (In Progress)

**Status**: Database schema ready, UI not yet implemented

**Features**:
- `has_breakdown`: Boolean flag
- `breakdown_context`: Context used for AI generation
- `breakdown_generated_at`: Timestamp of generation
- `todo_micro_steps` table for micro-step tracking

**Implementation Notes**:
- Service layer conditionally includes breakdown fields
- Gracefully handles missing columns (migration not run)

### Potential Future Features

1. **Due Date Display**: Show due dates in task list
2. **Priority Indicators**: Visual priority badges
3. **Category Filtering**: Filter by category
4. **Drag-and-Drop Reordering**: Manual task ordering
5. **Bulk Operations**: Select multiple tasks for batch actions
6. **Sharing UI**: Expose sharing functionality in widget
7. **Recurring Tasks**: Support for repeating tasks
8. **Task Templates**: Pre-defined task structures

---

## Migration History

### 20260101111430: Create Unified To-Do System
- Initial table creation
- RLS policies
- Sharing junction table

### 20260220000000: Add Todo Breakdown System
- Added breakdown columns to `personal_todos`
- Created `todo_micro_steps` table
- RLS policies for micro-steps

### 20260220000001: Fix Todo RLS Use Security Definor
- Created `is_user_household_member()` function
- Updated INSERT policy to use SECURITY DEFINER function

### 20260220000002: Fix Personal Todos RLS for Personal Mode
- Created `is_user_personal_space()` function
- Updated INSERT policy to handle personal spaces

### 20260220000003: Make Personal Todos household_id Nullable
- **Critical Migration**: Made `household_id` nullable
- Updated RLS policies to allow `household_id IS NULL` for personal todos
- Fixed foreign key constraint issues

---

## Key Architectural Principles

### 1. Personal vs Shared Separation

**Rule**: Personal todos NEVER reference households
- `household_id = NULL` for personal todos
- `household_id = UUID` for shared todos
- This prevents foreign key violations and maintains data integrity

### 2. Mode-Aware Operations

**Rule**: All todo operations must be mode-aware
- `createTodo()` validates mode
- Defensive checks prevent incorrect data
- RLS policies enforce mode separation

### 3. ADHD-First Design

**Principles**:
- No shame indicators (no overdue, no streaks)
- Permission-based language
- Visual clarity (clear active vs completed distinction)
- Reduced friction (no confirmations for simple actions)

### 4. Backward Compatibility

**Approach**:
- `getPersonalSpace()` checks new `spaces` table first
- Falls back to old `households` table
- Gracefully handles missing columns (breakdown fields)

---

## Testing Considerations

### Unit Tests Needed

1. **Service Layer**:
   - `createTodo()` with personal mode
   - `createTodo()` with shared mode
   - `createTodo()` error cases (invalid household_id)
   - `getTodos()` with null vs UUID household_id

2. **Component**:
   - Filter state changes
   - Todo creation flow
   - Todo completion toggle
   - Todo deletion

### Integration Tests Needed

1. **Database**:
   - RLS policy enforcement
   - Foreign key constraints
   - Null household_id handling

2. **User Flows**:
   - Complete add → complete → delete flow
   - Filter switching
   - Error handling

---

## Troubleshooting

### Common Issues

**Issue**: "Personal space not found"
- **Cause**: User has no personal space
- **Fix**: Ensure personal space is created on user registration

**Issue**: "RLS policy violation" when creating todo
- **Cause**: Attempting to create personal todo with household_id
- **Fix**: Ensure `householdId: null` and `spaceMode: 'personal'`

**Issue**: Foreign key violation
- **Cause**: Personal todo with non-null household_id referencing invalid household
- **Fix**: Ensure `household_id IS NULL` for personal todos

**Issue**: Todos not appearing
- **Cause**: Query filtering by wrong household_id
- **Fix**: Ensure `getTodos(null)` for personal todos

---

## Related Documentation

- **Core Purpose & Focus**: `docs/CORE_PURPOSE_AND_FOCUS.md`
- **Planner Architecture**: `docs/PLANNER_REDESIGN_ARCHITECTURE.md`
- **ADHD Design Brief**: `docs/ADHD_INTELLIGENT_TODO_DESIGN_BRIEF.md`

---

**End of Document**
