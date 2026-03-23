/**
 * Todo-Calendar Sync Service
 * 
 * Provides bidirectional sync between personal todos and calendar events.
 * Allows users to schedule todos on their calendar and keep them in sync.
 */

import { supabase } from './supabase';
import { 
  createPersonalCalendarEvent, 
  updatePersonalCalendarEvent,
  deletePersonalCalendarEvent,
  type CreatePersonalEventInput,
  type UpdatePersonalEventInput,
} from './personalSpaces/calendarService';
import type { PersonalTodo } from './todosService';

/**
 * Schedule a todo on the calendar
 */
export async function scheduleTodoOnCalendar(
  todo: PersonalTodo,
  startAt: string,
  endAt?: string,
  allDay: boolean = false
): Promise<{ todo: PersonalTodo; eventId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create calendar event
  const eventInput: CreatePersonalEventInput = {
    title: todo.title,
    description: todo.description || undefined,
    startAt,
    endAt: endAt || undefined,
    allDay,
    event_type: 'task',
    sourceType: 'personal',
    sourceEntityId: todo.id,
  };

  const calendarEvent = await createPersonalCalendarEvent(user.id, eventInput);

  // Link todo to calendar event
  const { data: updatedTodo, error } = await supabase
    .from('personal_todos')
    .update({ calendar_event_id: calendarEvent.id })
    .eq('id', todo.id)
    .select()
    .single();

  if (error) {
    // If linking fails, delete the calendar event we just created
    await deletePersonalCalendarEvent(calendarEvent.id, user.id).catch(() => {});
    throw error;
  }

  return {
    todo: updatedTodo as PersonalTodo,
    eventId: calendarEvent.id,
  };
}

/**
 * Update calendar event when todo changes
 */
export async function syncTodoToCalendar(todo: PersonalTodo): Promise<void> {
  if (!todo.calendar_event_id) return; // Not linked to calendar

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the calendar event to check if it exists
  const { data: event } = await supabase
    .from('calendar_events')
    .select('id, start_at, end_at, all_day')
    .eq('id', todo.calendar_event_id)
    .single();

  if (!event) {
    // Event was deleted, unlink from todo
    await supabase
      .from('personal_todos')
      .update({ calendar_event_id: null })
      .eq('id', todo.id);
    return;
  }

  // Update calendar event with todo changes
  const updateInput: UpdatePersonalEventInput = {
    title: todo.title,
    description: todo.description || undefined,
    // Keep existing start/end times unless todo has due_date
    startAt: todo.due_date ? new Date(todo.due_date).toISOString() : event.start_at,
    endAt: event.end_at,
    allDay: event.all_day,
  };

  await updatePersonalCalendarEvent(todo.calendar_event_id, user.id, updateInput);
}

/**
 * Unlink todo from calendar (delete calendar event)
 */
export async function unscheduleTodoFromCalendar(todo: PersonalTodo): Promise<PersonalTodo> {
  if (!todo.calendar_event_id) return todo; // Already not linked

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Delete calendar event
  await deletePersonalCalendarEvent(todo.calendar_event_id, user.id);

  // Unlink from todo
  const { data: updatedTodo, error } = await supabase
    .from('personal_todos')
    .update({ calendar_event_id: null })
    .eq('id', todo.id)
    .select()
    .single();

  if (error) throw error;

  return updatedTodo as PersonalTodo;
}

/**
 * Sync todo completion to calendar event
 */
export async function syncTodoCompletionToCalendar(todo: PersonalTodo): Promise<void> {
  if (!todo.calendar_event_id) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // When todo is completed, we can optionally update the calendar event
  // For now, we'll just keep the event but could mark it as completed
  // This is a placeholder for future enhancement
  if (todo.completed) {
    // Could update event description or add a "completed" marker
    // For now, we'll leave the event as-is
  }
}

/**
 * Get todos linked to a calendar event
 */
export async function getTodosForCalendarEvent(eventId: string): Promise<PersonalTodo[]> {
  const { data, error } = await supabase
    .from('personal_todos')
    .select('*')
    .eq('calendar_event_id', eventId);

  if (error) throw error;
  return data as PersonalTodo[];
}

/**
 * Check if a todo is scheduled on calendar
 */
export function isTodoScheduled(todo: PersonalTodo): boolean {
  return !!todo.calendar_event_id;
}

/**
 * Auto-sync todos with due dates to calendar
 * Creates calendar events for todos that have due_date but no calendar_event_id
 */
export async function autoSyncTodosWithDueDates(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Find todos with due_date but no calendar_event_id
  const { data: todos, error } = await supabase
    .from('personal_todos')
    .select('*')
    .eq('user_id', user.id)
    .not('due_date', 'is', null)
    .is('calendar_event_id', null)
    .eq('completed', false);

  if (error || !todos || todos.length === 0) return;

  // Create calendar events for each todo
  for (const todo of todos) {
    try {
      const dueDate = new Date(todo.due_date);
      dueDate.setHours(14, 0, 0, 0); // Default to 2 PM
      
      const endDate = new Date(dueDate);
      endDate.setHours(15, 0, 0, 0); // 1 hour duration

      await scheduleTodoOnCalendar(
        todo as PersonalTodo,
        dueDate.toISOString(),
        endDate.toISOString(),
        false
      );
    } catch (err) {
      console.warn(`Failed to auto-sync todo ${todo.id} to calendar:`, err);
    }
  }
}
