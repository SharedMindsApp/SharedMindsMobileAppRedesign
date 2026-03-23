import { supabase } from './supabase';
import {
  scheduleTodoOnCalendar,
  syncTodoToCalendar,
  unscheduleTodoFromCalendar,
} from './todoCalendarSync';

export type TodoPriority = 'low' | 'medium' | 'high';

export interface PersonalTodo {
  id: string;
  user_id: string;
  household_id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  due_date?: string;
  priority: TodoPriority;
  category?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  shared_spaces?: SharedSpace[];
  // Breakdown fields (Phase 1)
  has_breakdown?: boolean;
  breakdown_context?: string;
  breakdown_generated_at?: string;
  // Calendar sync field
  calendar_event_id?: string | null;
  // Habit projection fields
  habit_activity_id?: string | null; // Reference to habit activity (for habit-derived tasks)
  is_habit_derived?: boolean; // Computed: habit_activity_id IS NOT NULL
}

export interface SharedSpace {
  id: string;
  space_id: string;
  space_name?: string;
  shared_at: string;
}

export interface CreateTodoParams {
  householdId: string | null; // NULL for personal todos, household_id for shared todos
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
  spaceMode?: 'personal' | 'shared'; // Explicit mode - personal todos don't require household membership check
}

export interface UpdateTodoParams {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
  orderIndex?: number;
}

export async function getPersonalSpace(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use the new spaces system (spaces table with context_type = 'personal')
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: membership, error } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(id, context_type)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.context_type', 'personal')
    .limit(1)
    .maybeSingle();

  if (error || !membership || !membership.spaces) {
    // Fallback to old system for backward compatibility
    const { data: oldData, error: oldError } = await supabase
      .from('household_members')
      .select('household_id, households!inner(type)')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .eq('households.type', 'personal')
      .maybeSingle();

    if (oldError || !oldData) return null;
    return oldData.household_id;
  }

  return (membership.spaces as any).id;
}

// Helper to determine if a household_id is personal or shared space
// If householdId is null, it's always personal mode
async function determineSpaceMode(householdId: string | null): Promise<'personal' | 'shared'> {
  // NULL household_id means personal todo
  if (householdId === null) {
    return 'personal';
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'shared';

  // Check new spaces system
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile) {
    const { data: membership } = await supabase
      .from('space_members')
      .select('spaces!inner(context_type)')
      .eq('space_id', householdId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membership && (membership.spaces as any)?.context_type === 'personal') {
      return 'personal';
    }
  }

  // Fallback to old system - check if it's a space with context_type
  const { data: space } = await supabase
    .from('spaces')
    .select('context_type')
    .eq('id', householdId)
    .maybeSingle();

  if (space && space.context_type === 'personal') {
    return 'personal';
  }

  return 'shared';
}

export async function getTodos(householdId?: string): Promise<PersonalTodo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('personal_todos')
    .select(`
      *,
      todo_space_shares!left(
        id,
        space_id,
        shared_at,
        households!inner(name)
      )
    `)
    .eq('user_id', user.id)
    .order('completed', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  // If householdId is provided, filter by it (for shared todos)
  // If not provided, get personal todos (household_id IS NULL)
  if (householdId) {
    query = query.eq('household_id', householdId);
  } else {
    query = query.is('household_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const regularTodos = (data || []).map(todo => ({
    ...todo,
    is_habit_derived: !!todo.habit_activity_id,
    shared_spaces: (todo.todo_space_shares || []).map((share: any) => ({
      id: share.id,
      space_id: share.space_id,
      space_name: share.households?.name,
      shared_at: share.shared_at,
    })),
  }));

  // Project habit occurrences as tasks for today and next 7 days
  // This ensures users see habit tasks in their todo list
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7); // Next 7 days
    
    const { projectHabitOccurrencesAsTasks, ensureHabitTaskExists } = await import('./habits/habitTaskProjectionService');
    
    const habitProjections = await projectHabitOccurrencesAsTasks(
      user.id,
      today.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    // Ensure habit tasks exist in database (lightweight persistence)
    const habitTaskIds: string[] = [];
    for (const projection of habitProjections) {
      const taskId = await ensureHabitTaskExists(user.id, projection);
      if (taskId) {
        habitTaskIds.push(taskId);
      }
    }
    
    // Reload todos to include newly created habit tasks
    // This ensures we get the actual database records with proper IDs
    if (habitTaskIds.length > 0) {
      const { data: habitTasks } = await supabase
        .from('personal_todos')
        .select(`
          *,
          todo_space_shares!left(
            id,
            space_id,
            shared_at,
            households!inner(name)
          )
        `)
        .in('id', habitTaskIds);
      
      if (habitTasks) {
        const habitTodos = habitTasks.map(todo => ({
          ...todo,
          is_habit_derived: true,
          shared_spaces: (todo.todo_space_shares || []).map((share: any) => ({
            id: share.id,
            space_id: share.space_id,
            space_name: share.households?.name,
            shared_at: share.shared_at,
          })),
        }));
        
        // Merge: regular todos first, then habit-derived tasks
        // Deduplicate by ID (in case a habit task was already in regularTodos)
        const regularIds = new Set(regularTodos.map(t => t.id));
        const uniqueHabitTodos = habitTodos.filter(t => !regularIds.has(t.id));
        
        return [...regularTodos, ...uniqueHabitTodos];
      }
    }
  } catch (err) {
    // Non-fatal: if habit projection fails, still return regular todos
    console.error('[todosService] Error projecting habit tasks:', err);
  }
  
  return regularTodos;
}

export async function getSharedTodosInSpace(spaceId: string): Promise<PersonalTodo[]> {
  const { data, error } = await supabase
    .from('personal_todos')
    .select(`
      *,
      todo_space_shares!inner(id, space_id, shared_at)
    `)
    .eq('todo_space_shares.space_id', spaceId)
    .order('completed', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTodo(params: CreateTodoParams): Promise<PersonalTodo> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Determine space mode if not provided
  // If householdId is null, it's always personal mode
  const spaceMode = params.spaceMode || await determineSpaceMode(params.householdId);

  // DEFENSIVE CHECK: Personal todos must NOT include household_id
  if (spaceMode === 'personal' && params.householdId !== null) {
    throw new Error(
      'Personal todos must not include household_id. ' +
      'Personal spaces are NOT households. Set householdId to null for personal mode.'
    );
  }

  // For personal mode, household_id must be NULL
  // For shared mode, household_id must reference a valid household
  const targetHouseholdId = spaceMode === 'personal' ? null : params.householdId;

  if (spaceMode === 'shared' && !targetHouseholdId) {
    throw new Error('Shared todos require a valid householdId');
  }

  // Get max order_index for the user's todos (personal or shared)
  const orderQuery = supabase
    .from('personal_todos')
    .select('order_index')
    .eq('user_id', user.id);

  if (spaceMode === 'personal') {
    orderQuery.is('household_id', null);
  } else {
    orderQuery.eq('household_id', targetHouseholdId);
  }

  const { data: todos } = await orderQuery
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrder = todos && todos.length > 0 ? todos[0].order_index : -1;

  // Build insert object with all required fields
  const insertData: any = {
    user_id: user.id,
    household_id: targetHouseholdId, // NULL for personal, household_id for shared
    title: params.title,
    description: params.description || null,
    due_date: params.dueDate || null,
    priority: params.priority || 'medium',
    category: params.category || null,
    order_index: maxOrder + 1,
  };

  // Try to add breakdown fields - if migration not run, they'll be ignored
  // Check if columns exist by trying a test query first
  try {
    const { error: testError } = await supabase
      .from('personal_todos')
      .select('has_breakdown')
      .limit(0);
    
    // If no error, columns exist - add them to insert
    if (!testError) {
      insertData.has_breakdown = false;
      insertData.breakdown_context = null;
      insertData.breakdown_generated_at = null;
    }
  } catch (e) {
    // Columns don't exist - that's okay, skip them
    console.log('Breakdown columns not available - migration may not be run yet');
  }

  const { data, error } = await supabase
    .from('personal_todos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Provide more helpful error messages for common RLS issues
    if (error.code === '42501') {
      // RLS policy violation - user might not be a member
      const errorMessage = error.message || 'Permission denied';
      console.error('RLS Error creating todo:', {
        errorCode: error.code,
        message: errorMessage,
        householdId: params.householdId,
        userId: user.id,
      });
      
      throw new Error(
        `Cannot create todo in this space. The RLS policy check failed.\n\n` +
        `This usually means:\n` +
        `1. You are not an active member of this space, OR\n` +
        `2. The space ID is incorrect\n\n` +
        `Please verify you have access to this space.`
      );
    }
    
    // Handle column doesn't exist error (migration not run)
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('Breakdown columns not found - migration may not be run');
      // Retry without breakdown fields
      delete insertData.has_breakdown;
      delete insertData.breakdown_context;
      delete insertData.breakdown_generated_at;
      
      const { data: retryData, error: retryError } = await supabase
        .from('personal_todos')
        .insert(insertData)
        .select()
        .single();
      
      if (retryError) throw retryError;
      return retryData;
    }
    
    throw error;
  }

  // Auto-sync to calendar if todo has a due_date
  if (data && params.dueDate) {
    try {
      const dueDate = new Date(params.dueDate);
      // Set default time to 2 PM if no time specified
      dueDate.setHours(14, 0, 0, 0);
      
      const endDate = new Date(dueDate);
      endDate.setHours(15, 0, 0, 0); // 1 hour duration

      await scheduleTodoOnCalendar(
        data,
        dueDate.toISOString(),
        endDate.toISOString(),
        false
      ).catch(err => {
        // Don't fail todo creation if calendar sync fails
        console.warn('Failed to auto-sync todo to calendar:', err);
      });
    } catch (err) {
      // Don't fail todo creation if calendar sync fails
      console.warn('Failed to auto-sync todo to calendar:', err);
    }
  }

  return data;
}

export async function updateTodo(todoId: string, params: UpdateTodoParams): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current todo to check if it's habit-derived and for calendar sync
  const { data: currentTodo } = await supabase
    .from('personal_todos')
    .select('habit_activity_id, due_date, calendar_event_id, *')
    .eq('id', todoId)
    .eq('user_id', user.id)
    .single();

  if (!currentTodo) throw new Error('Todo not found');

  // Sync task completion to habit check-in (if habit-derived)
  if (currentTodo.habit_activity_id && params.completed !== undefined && currentTodo.due_date) {
    try {
      const { syncTaskCompletionToHabit } = await import('./habits/habitTaskProjectionService');
      await syncTaskCompletionToHabit(
        user.id,
        currentTodo.habit_activity_id,
        currentTodo.due_date,
        params.completed
      );
    } catch (err) {
      console.error('[todosService] Error syncing task completion to habit:', err);
      // Non-fatal: continue with todo update even if sync fails
    }
  }

  const updates: any = {};

  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.completed !== undefined) {
    updates.completed = params.completed;
    updates.completed_at = params.completed ? new Date().toISOString() : null;
  }
  if (params.dueDate !== undefined) updates.due_date = params.dueDate;
  if (params.priority !== undefined) updates.priority = params.priority;
  if (params.category !== undefined) updates.category = params.category;
  if (params.orderIndex !== undefined) updates.order_index = params.orderIndex;

  const { data: updatedTodoData, error } = await supabase
    .from('personal_todos')
    .update(updates)
    .eq('id', todoId)
    .select()
    .single();

  if (error) throw error;

  if (!updatedTodoData) return;

  const updatedTodo = updatedTodoData as PersonalTodo;

  // Auto-sync to calendar after update
  // If todo has a due_date but no calendar event, create one
  if (updatedTodo.due_date && !updatedTodo.calendar_event_id) {
    try {
      const dueDate = new Date(updatedTodo.due_date);
      dueDate.setHours(14, 0, 0, 0);
      
      const endDate = new Date(dueDate);
      endDate.setHours(15, 0, 0, 0);

      await scheduleTodoOnCalendar(
        updatedTodo,
        dueDate.toISOString(),
        endDate.toISOString(),
        false
      ).catch(err => {
        console.warn('Failed to auto-sync todo to calendar after update:', err);
      });
    } catch (err) {
      console.warn('Failed to auto-sync todo to calendar after update:', err);
    }
  }
  // If todo has a calendar event, sync changes
  else if (updatedTodo.calendar_event_id) {
    try {
      await syncTodoToCalendar(updatedTodo).catch(err => {
        console.warn('Failed to sync todo changes to calendar:', err);
      });
    } catch (err) {
      console.warn('Failed to sync todo changes to calendar:', err);
    }
  }
  // If due_date was removed and todo has calendar event, unschedule it
  else if (!updatedTodo.due_date && currentTodo.calendar_event_id) {
    try {
      await unscheduleTodoFromCalendar(updatedTodo).catch(err => {
        console.warn('Failed to unschedule todo from calendar:', err);
      });
    } catch (err) {
      console.warn('Failed to unschedule todo from calendar:', err);
    }
  }
}

export async function deleteTodo(todoId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get todo to check if it's habit-derived and has a calendar event
  const { data: todo } = await supabase
    .from('personal_todos')
    .select('habit_activity_id, calendar_event_id')
    .eq('id', todoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!todo) throw new Error('Todo not found');

  // TODO: Habit → Task Projection - Prevent deletion of habit-derived tasks
  // Habit-derived tasks should not be manually deleted
  // They are managed by the habit system (paused/archived habits remove tasks)
  // For now, allow deletion but log a warning
  // Future: prevent deletion and show user-friendly message, or mark as skipped
  if (todo.habit_activity_id) {
    console.warn('[todosService] Attempted to delete habit-derived task. Habit tasks are managed by the habit system.');
    // Optionally: mark habit as skipped instead of deleting task
    // For now, allow deletion - user might want to skip a specific occurrence
  }

  // Delete the todo (cascade will handle calendar_event_id link)
  const { error } = await supabase
    .from('personal_todos')
    .delete()
    .eq('id', todoId);

  if (error) throw error;

  // Delete associated calendar event if it exists
  if (todo?.calendar_event_id) {
    try {
      await unscheduleTodoFromCalendar({ id: todoId, calendar_event_id: todo.calendar_event_id } as PersonalTodo).catch(err => {
        console.warn('Failed to delete calendar event for todo:', err);
      });
    } catch (err) {
      console.warn('Failed to delete calendar event for todo:', err);
    }
  }
}

export async function shareToSpace(todoId: string, spaceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('todo_space_shares')
    .insert({
      todo_id: todoId,
      space_id: spaceId,
      shared_by: user.id,
    });

  if (error) throw error;
}

export async function unshareFromSpace(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_space_shares')
    .delete()
    .eq('id', shareId);

  if (error) throw error;
}

export async function getAvailableSpaces(): Promise<Array<{ id: string; name: string; type: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, households!inner(id, name, type)')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .neq('households.type', 'personal');

  if (error) {
    console.error('Error fetching spaces:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.households.id,
    name: item.households.name,
    type: item.households.type,
  }));
}

export async function clearCompleted(householdId: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('personal_todos')
    .delete()
    .eq('user_id', user.id)
    .eq('completed', true);

  // For personal todos, household_id IS NULL
  // For shared todos, household_id must match
  if (householdId === null) {
    query = query.is('household_id', null);
  } else {
    query = query.eq('household_id', householdId);
  }

  const { error } = await query;

  if (error) throw error;
}

// ============================================================================
// Micro-Steps API (for expandable todos)
// ============================================================================

export interface TodoMicroStep {
  id: string;
  todo_id: string;
  title: string;
  order_index: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all micro-steps for a todo, ordered by order_index
 */
export async function getTodoSteps(todoId: string): Promise<TodoMicroStep[]> {
  const { data, error } = await supabase
    .from('todo_micro_steps')
    .select('*')
    .eq('todo_id', todoId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new micro-step for a todo
 * Automatically calculates the next order_index
 */
export async function createTodoStep(todoId: string, title: string): Promise<TodoMicroStep> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get max order_index for this todo
  const { data: existingSteps } = await supabase
    .from('todo_micro_steps')
    .select('order_index')
    .eq('todo_id', todoId)
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrder = existingSteps && existingSteps.length > 0 
    ? existingSteps[0].order_index 
    : -1;

  const { data, error } = await supabase
    .from('todo_micro_steps')
    .insert({
      todo_id: todoId,
      title: title.trim(),
      order_index: maxOrder + 1,
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle a micro-step's completion status
 */
export async function toggleTodoStep(stepId: string, completed: boolean): Promise<void> {
  const updates: any = {
    completed,
  };

  if (completed) {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const { error } = await supabase
    .from('todo_micro_steps')
    .update(updates)
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Delete a micro-step
 */
export async function deleteTodoStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_micro_steps')
    .delete()
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Apply a breakdown template to a todo
 * Creates micro-steps from a predefined template
 */
export async function applyBreakdownTemplate(
  todoId: string,
  steps: string[]
): Promise<TodoMicroStep[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert all steps with sequential order_index
  const stepsToInsert = steps.map((title, index) => ({
    todo_id: todoId,
    title: title.trim(),
    order_index: index,
    completed: false,
  }));

  const { data, error } = await supabase
    .from('todo_micro_steps')
    .insert(stepsToInsert)
    .select();

  if (error) throw error;

  // Update todo to mark as having breakdown
  try {
    await supabase
      .from('personal_todos')
      .update({
        has_breakdown: true,
        breakdown_generated_at: new Date().toISOString(),
      })
      .eq('id', todoId);
  } catch (e) {
    // Ignore if columns don't exist (backward compatibility)
    console.log('Breakdown columns may not exist');
  }

  return data || [];
}
