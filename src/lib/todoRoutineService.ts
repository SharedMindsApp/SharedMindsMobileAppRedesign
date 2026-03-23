/**
 * Todo Routine Service
 * 
 * Manages daily routines - recurring todos that appear every day.
 * Routines are synced to calendar as recurring events.
 */

import { supabase } from './supabase';
import type { PersonalTodo } from './todosService';
import { 
  createPersonalCalendarEvent,
  getPersonalEventsForDateRange,
  type PersonalCalendarEvent,
} from './personalSpaces/calendarService';

export interface TodoRoutine {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  time: string; // HH:MM format (e.g., "09:00")
  duration_minutes: number; // Duration in minutes
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all routines for a user
 */
export async function getRoutines(userId: string): Promise<TodoRoutine[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('todo_routines')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new routine
 */
export async function createRoutine(
  userId: string,
  title: string,
  time: string,
  durationMinutes: number = 30,
  description?: string
): Promise<TodoRoutine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('todo_routines')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      time,
      duration_minutes: durationMinutes,
      enabled: true,
    })
    .select()
    .single();

  if (error) throw error;

  // Create recurring calendar event for this routine
  await syncRoutineToCalendar(data).catch(err => {
    console.error('Error syncing routine to calendar:', err);
    // Don't fail routine creation if calendar sync fails
  });

  return data;
}

/**
 * Update a routine
 */
export async function updateRoutine(
  routineId: string,
  updates: Partial<Pick<TodoRoutine, 'title' | 'description' | 'time' | 'duration_minutes' | 'enabled'>>
): Promise<TodoRoutine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('todo_routines')
    .update(updates)
    .eq('id', routineId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  // Update calendar event if routine is enabled
  if (data.enabled) {
    await syncRoutineToCalendar(data).catch(err => {
      console.error('Error syncing routine to calendar:', err);
    });
  }

  return data;
}

/**
 * Delete a routine
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get routine to find calendar event
  const { data: routine } = await supabase
    .from('todo_routines')
    .select('*')
    .eq('id', routineId)
    .eq('user_id', user.id)
    .single();

  if (routine) {
    // Delete associated calendar event if exists
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_entity_id', routineId)
      .eq('event_type', 'task');

    if (events && events.length > 0) {
      // Delete calendar events (could be multiple if recurring)
      for (const event of events) {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', event.id);
      }
    }
  }

  const { error } = await supabase
    .from('todo_routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Generate today's todos from routines
 */
export async function generateTodayTodosFromRoutines(userId: string): Promise<PersonalTodo[]> {
  const routines = await getRoutines(userId);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const todos: PersonalTodo[] = [];

  for (const routine of routines) {
    // Check if todo already exists for today
    const [hours, minutes] = routine.time.split(':').map(Number);
    const routineTime = new Date(today);
    routineTime.setHours(hours, minutes, 0, 0);

    // Create todo for today
    const { data: existingTodo } = await supabase
      .from('personal_todos')
      .select('*')
      .eq('user_id', userId)
      .eq('title', routine.title)
      .eq('due_date', todayStr)
      .is('household_id', null)
      .maybeSingle();

    if (!existingTodo) {
      // Create new todo from routine using todosService to get auto-calendar sync
      const { createTodo } = await import('./todosService');
      try {
        const newTodo = await createTodo({
          householdId: null,
          title: routine.title,
          description: routine.description || undefined,
          dueDate: todayStr,
          priority: 'medium',
          spaceMode: 'personal',
        });
        todos.push(newTodo);
      } catch (err) {
        console.error('Error creating todo from routine:', err);
      }
    } else {
      todos.push(existingTodo as PersonalTodo);
    }
  }

  return todos;
}

/**
 * Sync routine to calendar (creates/updates calendar event)
 */
async function syncRoutineToCalendar(routine: TodoRoutine): Promise<void> {
  if (!routine.enabled) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get today's date and set time
  const today = new Date();
  const [hours, minutes] = routine.time.split(':').map(Number);
  today.setHours(hours, minutes, 0, 0);

  const endTime = new Date(today);
  endTime.setMinutes(endTime.getMinutes() + routine.duration_minutes);

  // Check if calendar event already exists for this routine
  const { data: existingEvent } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_entity_id', routine.id)
    .eq('event_type', 'task')
    .gte('start_at', today.toISOString().split('T')[0])
    .lt('start_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .maybeSingle();

  if (existingEvent) {
    // Update existing event
    await supabase
      .from('calendar_events')
      .update({
        title: routine.title,
        description: routine.description || null,
        start_at: today.toISOString(),
        end_at: endTime.toISOString(),
      })
      .eq('id', existingEvent.id);
  } else {
    // Create new event
    await createPersonalCalendarEvent(user.id, {
      title: routine.title,
      description: routine.description,
      startAt: today.toISOString(),
      endAt: endTime.toISOString(),
      allDay: false,
      event_type: 'task',
      sourceType: 'personal',
      sourceEntityId: routine.id,
    });
  }
}

/**
 * Get today's calendar events for the todo widget
 */
export async function getTodayCalendarEvents(userId: string): Promise<PersonalCalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfDay = tomorrow.toISOString();

  const events = await getPersonalEventsForDateRange(
    userId,
    startOfDay,
    endOfDay,
    userId
  );

  // Filter to only events that start today
  return events.filter(event => {
    const eventStart = new Date(event.startAt);
    return eventStart >= today && eventStart < tomorrow;
  });
}
