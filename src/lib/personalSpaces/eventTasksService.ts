/**
 * Event Tasks Service
 * 
 * Service for managing tasks associated with calendar events or standalone tasks.
 * Tasks can be:
 * - Event-linked: event_id is set, date derived from event
 * - Standalone: event_id is null, date is set directly
 */

import { supabase } from '../supabase';

export interface EventTask {
  id: string;
  event_id: string | null; // null for standalone tasks
  user_id: string | null; // set for standalone tasks
  title: string;
  completed: boolean;
  status: 'pending' | 'completed'; // derived from progress (progress = 100 → completed)
  completed_at: string | null; // timestamp when completed (set when progress = 100)
  progress: number; // 0-100, represents completion percentage
  date: string | null; // date for standalone tasks (ISO date string)
  start_time: string | null; // optional time (HH:MM format)
  duration_minutes: number | null; // optional duration
  created_at: string;
  updated_at: string;
}

export interface CreateEventTaskInput {
  event_id: string;
  title: string;
  completed?: boolean;
  progress?: number; // 0-100, defaults to 0
}

export interface CreateStandaloneTaskInput {
  user_id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time?: string; // optional time (HH:MM format)
  duration_minutes?: number; // optional duration
  completed?: boolean;
  progress?: number; // 0-100, defaults to 0
}

export interface UpdateEventTaskInput {
  title?: string;
  completed?: boolean;
  progress?: number; // 0-100 (progress = 100 → automatically sets completed = true)
  date?: string; // for standalone tasks
  start_time?: string; // for standalone tasks
  duration_minutes?: number; // for standalone tasks
}

/**
 * Get all tasks for an event
 */
export async function getEventTasks(eventId: string): Promise<EventTask[]> {
  const { data, error } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[eventTasksService] Error fetching tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new task for an event
 * 
 * Phase 5: Event-linked tasks must have event_id set and date = NULL.
 * Date is derived from the event's start_at and moves automatically with the event.
 */
export async function createEventTask(input: CreateEventTaskInput): Promise<EventTask> {
  // Phase 6: Set progress based on completed state or provided progress
  const progress = input.progress !== undefined 
    ? Math.max(0, Math.min(100, input.progress))
    : (input.completed ? 100 : 0);

  const { data, error } = await supabase
    .from('event_tasks')
    .insert({
      event_id: input.event_id, // Event-linked task
      user_id: null, // Standalone tasks have user_id, event tasks don't
      date: null, // Event-linked tasks derive date from event start_at
      title: input.title.trim(),
      completed: input.completed || progress === 100,
      progress: progress,
    })
    .select()
    .single();

  if (error) {
    console.error('[eventTasksService] Error creating task:', error);
    throw error;
  }

  return data;
}

/**
 * Update a task (works for both event tasks and standalone tasks)
 * 
 * Phase 5: Event-linked tasks cannot have their date updated.
 * Date is derived from the event's start_at and moves automatically with the event.
 * 
 * Phase 6: Progress and completed are synced automatically via database trigger.
 * - progress = 100 → automatically sets completed = true, status = 'completed'
 * - progress < 100 → automatically sets completed = false, status = 'pending'
 * - completed = true → automatically sets progress = 100
 * - completed = false → preserves current progress (or resets to 0 if was 100)
 */
export async function updateEventTask(
  taskId: string,
  updates: UpdateEventTaskInput
): Promise<EventTask> {
  // First, get the current task to check if it's event-linked and preserve progress when uncompleting
  const { data: currentTask, error: fetchError } = await supabase
    .from('event_tasks')
    .select('event_id, progress, completed')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('[eventTasksService] Error fetching task for update:', fetchError);
    throw fetchError;
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title.trim();
  }

  // Phase 6: Handle progress and completed updates
  // Priority: If progress is set, use it (trigger will sync completed/status)
  // If completed is set without progress, sync progress appropriately
  if (updates.progress !== undefined) {
    // Validate and clamp progress to 0-100
    updateData.progress = Math.max(0, Math.min(100, updates.progress));
    // Trigger will automatically sync completed and status based on progress
    // progress = 100 → completed = true, status = 'completed'
    // progress < 100 → completed = false, status = 'pending'
  } else if (updates.completed !== undefined) {
    updateData.completed = updates.completed;
    if (updates.completed) {
      // Marking as complete → set progress to 100
      // Trigger will also set this, but explicit is clearer for consistency
      updateData.progress = 100;
    } else {
      // Unmarking: Preserve current progress if it's < 100%, otherwise reset to 0%
      // The requirement says "reset to previous progress (or 0% if none)"
      // Since we don't track previous progress history, we use current progress as the baseline
      // If task was at 100% (completed), reset to 0% (no previous progress to restore)
      // If task was at < 100% (partial), preserve it
      if (currentTask.progress === 100) {
        // Task was completed - reset to 0% (we don't have history of previous progress)
        updateData.progress = 0;
      } else {
        // Task was partially complete - preserve current progress
        // Don't set progress in updateData, let it remain as-is
      }
    }
  }
  
  // Phase 5: Event-linked tasks cannot have date, start_time, or duration_minutes updated
  // These are derived from the event. Only standalone tasks can have these fields updated.
  if (currentTask.event_id === null) {
    // Standalone task - can update date/time fields
    if (updates.date !== undefined) {
      updateData.date = updates.date;
    }
    if (updates.start_time !== undefined) {
      updateData.start_time = updates.start_time || null;
    }
    if (updates.duration_minutes !== undefined) {
      updateData.duration_minutes = updates.duration_minutes || null;
    }
  } else {
    // Event-linked task - date/time fields are derived from event
    // Silently ignore any attempts to update these fields
    if (updates.date !== undefined || updates.start_time !== undefined || updates.duration_minutes !== undefined) {
      console.warn('[eventTasksService] Attempted to update date/time on event-linked task. Ignoring. Task ID:', taskId);
    }
  }

  const { data, error } = await supabase
    .from('event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('[eventTasksService] Error updating task:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a task
 */
export async function deleteEventTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('event_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('[eventTasksService] Error deleting task:', error);
    throw error;
  }
}

/**
 * Create a standalone task (not linked to an event)
 */
export async function createStandaloneTask(input: CreateStandaloneTaskInput): Promise<EventTask> {
  // Phase 6: Set progress based on completed state or provided progress
  const progress = input.progress !== undefined 
    ? Math.max(0, Math.min(100, input.progress))
    : (input.completed ? 100 : 0);

  const { data, error } = await supabase
    .from('event_tasks')
    .insert({
      event_id: null,
      user_id: input.user_id,
      title: input.title.trim(),
      date: input.date,
      start_time: input.start_time || null,
      duration_minutes: input.duration_minutes || null,
      completed: input.completed || progress === 100,
      progress: progress,
    })
    .select()
    .single();

  if (error) {
    console.error('[eventTasksService] Error creating standalone task:', error);
    throw error;
  }

  return data;
}

/**
 * Get standalone tasks for a specific date (includes both pending and completed)
 */
export async function getStandaloneTasksForDate(
  userId: string,
  date: string // ISO date string (YYYY-MM-DD)
): Promise<EventTask[]> {
  const { data, error } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('event_id', null)
    .eq('date', date)
    .order('status', { ascending: true }) // pending first
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[eventTasksService] Error fetching tasks for date:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all incomplete standalone tasks for a user, ordered by date
 * Used for the Tasks aggregation view
 * Only returns standalone tasks (event_id IS NULL), not event-linked tasks
 */
export async function getIncompleteStandaloneTasksForUser(
  userId: string
): Promise<EventTask[]> {
  const { data, error } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('event_id', null)
    .eq('completed', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[eventTasksService] Error fetching incomplete standalone tasks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get today's tasks (standalone + event-linked)
 * Includes both pending and completed tasks for today
 */
export async function getTodayTasks(
  userId: string
): Promise<EventTask[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get standalone tasks for today (both pending and completed)
  const { data: standaloneTasks, error: standaloneError } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('event_id', null)
    .eq('date', todayStr)
    .order('status', { ascending: true }) // pending first
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (standaloneError) {
    console.error('[eventTasksService] Error fetching standalone today tasks:', standaloneError);
    throw standaloneError;
  }

  // Get event-linked tasks whose events are today (both pending and completed)
  const { data: eventTasks, error: eventTasksError } = await supabase
    .from('event_tasks')
    .select(`
      *,
      calendar_events!inner (
        id,
        title,
        start_at,
        event_type,
        color,
        user_id,
        household_id
      )
    `)
    .not('event_id', 'is', null)
    .eq('calendar_events.user_id', userId)
    .gte('calendar_events.start_at', today.toISOString())
    .lt('calendar_events.start_at', tomorrow.toISOString())
    .order('status', { ascending: true }) // pending first
    .order('created_at', { ascending: true });

  if (eventTasksError) {
    console.error('[eventTasksService] Error fetching event today tasks:', eventTasksError);
    throw eventTasksError;
  }

  // Combine and flatten event tasks
  const allTasks: EventTask[] = [...(standaloneTasks || [])];
  if (eventTasks) {
    const flattened = eventTasks
      .map((item: any) => {
        const { calendar_events, ...taskData } = item;
        // For event-linked tasks, derive date from event start_at for display
        // Also attach event info for display (will be removed before returning if not needed)
        const task: EventTask & { event_title?: string; event_type?: string | null; event_color?: string | null } = {
          ...taskData,
          date: calendar_events?.start_at 
            ? new Date(calendar_events.start_at).toISOString().split('T')[0]
            : null,
          event_title: calendar_events?.title,
          event_type: calendar_events?.event_type,
          event_color: calendar_events?.color,
        };
        return task;
      });
    allTasks.push(...flattened);
  }

  // Sort: pending first, then by start_time, then by created_at
  return allTasks.sort((a, b) => {
    // Pending tasks first
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    // Then by start_time (if both have it)
    if (a.start_time && b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    if (a.start_time && !b.start_time) return -1;
    if (!a.start_time && b.start_time) return 1;
    // Finally by creation order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Get upcoming tasks (standalone + event-linked)
 * Only includes pending tasks with date > today or events in the future
 */
export async function getUpcomingTasks(
  userId: string
): Promise<EventTask[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get standalone tasks for future dates (pending only)
  const { data: standaloneTasks, error: standaloneError } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('event_id', null)
    .gte('date', tomorrowStr)
    .eq('status', 'pending')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (standaloneError) {
    console.error('[eventTasksService] Error fetching standalone upcoming tasks:', standaloneError);
    throw standaloneError;
  }

  // Get event-linked tasks whose events are in the future (pending only)
  const { data: eventTasks, error: eventTasksError } = await supabase
    .from('event_tasks')
    .select(`
      *,
      calendar_events!inner (
        id,
        title,
        start_at,
        event_type,
        color,
        user_id,
        household_id
      )
    `)
    .not('event_id', 'is', null)
    .eq('status', 'pending')
    .eq('calendar_events.user_id', userId)
    .gte('calendar_events.start_at', tomorrow.toISOString())
    .order('calendar_events.start_at', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (eventTasksError) {
    console.error('[eventTasksService] Error fetching event upcoming tasks:', eventTasksError);
    throw eventTasksError;
  }

  // Combine and flatten event tasks
  const allTasks: EventTask[] = [...(standaloneTasks || [])];
  if (eventTasks) {
    const flattened = eventTasks
      .map((item: any) => {
        const { calendar_events, ...taskData } = item;
        // For event-linked tasks, derive date from event start_at and attach event info
        const task: EventTask & { event_title?: string; event_type?: string | null; event_color?: string | null } = {
          ...taskData,
          date: calendar_events?.start_at 
            ? new Date(calendar_events.start_at).toISOString().split('T')[0]
            : null,
          event_title: calendar_events?.title,
          event_type: calendar_events?.event_type,
          event_color: calendar_events?.color,
        };
        return task;
      });
    allTasks.push(...flattened);
  }

  // Sort: by date/event date, then by start_time, then by created_at
  return allTasks.sort((a, b) => {
    // Get task date (standalone uses date, event-linked uses derived date from event)
    const dateA = a.date || a.created_at;
    const dateB = b.date || b.created_at;
    const dateCompare = new Date(dateA).getTime() - new Date(dateB).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // Then by start_time
    if (a.start_time && b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    if (a.start_time && !b.start_time) return -1;
    if (!a.start_time && b.start_time) return 1;
    
    // Finally by creation order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Get completed tasks (standalone + event-linked)
 * Sorted by completed_at (most recent first)
 */
export async function getCompletedTasks(
  userId: string
): Promise<EventTask[]> {
  // Get standalone completed tasks
  const { data: standaloneTasks, error: standaloneError } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('event_id', null)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsLast: true });

  if (standaloneError) {
    console.error('[eventTasksService] Error fetching standalone completed tasks:', standaloneError);
    throw standaloneError;
  }

  // Get event-linked completed tasks
  const { data: eventTasks, error: eventTasksError } = await supabase
    .from('event_tasks')
    .select(`
      *,
      calendar_events!inner (
        id,
        title,
        start_at,
        event_type,
        color,
        user_id,
        household_id
      )
    `)
    .not('event_id', 'is', null)
    .eq('status', 'completed')
    .eq('calendar_events.user_id', userId)
    .order('completed_at', { ascending: false, nullsLast: true });

  if (eventTasksError) {
    console.error('[eventTasksService] Error fetching event completed tasks:', eventTasksError);
    throw eventTasksError;
  }

  // Combine and flatten
  const allTasks: EventTask[] = [...(standaloneTasks || [])];
  if (eventTasks) {
    const flattened = eventTasks
      .map((item: any) => {
        const { calendar_events, ...taskData } = item;
        // For event-linked completed tasks, derive date from event start_at and attach event info
        const task: EventTask & { event_title?: string; event_type?: string | null; event_color?: string | null } = {
          ...taskData,
          date: calendar_events?.start_at 
            ? new Date(calendar_events.start_at).toISOString().split('T')[0]
            : null,
          event_title: calendar_events?.title,
          event_type: calendar_events?.event_type,
          event_color: calendar_events?.color,
        };
        return task;
      });
    allTasks.push(...flattened);
  }

  // Sort by completed_at (most recent first)
  return allTasks.sort((a, b) => {
    if (!a.completed_at && !b.completed_at) {
      // Fallback to updated_at if completed_at is missing
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });
}

/**
 * Get all incomplete tasks for a user's events, ordered by event date
 * Used for the Tasks aggregation view (DEPRECATED - use getIncompleteStandaloneTasksForUser instead)
 * Only returns event-linked tasks, not standalone tasks
 */
export async function getIncompleteTasksForUser(
  userId: string
): Promise<Array<EventTask & { event_title: string; event_date: string; event_type: string | null; event_color: string | null }>> {
  // Get incomplete event-linked tasks with their event information
  // Filter out standalone tasks (event_id IS NOT NULL)
  const { data, error } = await supabase
    .from('event_tasks')
    .select(`
      *,
      calendar_events!inner (
        id,
        title,
        start_at,
        event_type,
        color,
        user_id,
        household_id
      )
    `)
    .not('event_id', 'is', null)
    .eq('completed', false)
    .order('calendar_events.start_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[eventTasksService] Error fetching incomplete tasks:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform the data to flatten event information
  const tasksWithEvents = (data || []).map((item: any) => ({
    id: item.id,
    event_id: item.event_id,
    title: item.title,
    completed: item.completed,
    created_at: item.created_at,
    updated_at: item.updated_at,
    event_title: item.calendar_events.title,
    event_date: item.calendar_events.start_at,
    event_type: item.calendar_events.event_type,
    event_color: item.calendar_events.color,
  }))
  .sort((a, b) => {
    // Sort by event date (ascending from today), then by creation order
    const dateA = new Date(a.event_date).getTime();
    const dateB = new Date(b.event_date).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Prioritize future dates, then past dates
    const aIsFuture = dateA >= today;
    const bIsFuture = dateB >= today;
    
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;
    
    // Both future or both past - sort by date
    const dateCompare = dateA - dateB;
    if (dateCompare !== 0) return dateCompare;
    
    // Same date - sort by creation order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return tasksWithEvents;
}
