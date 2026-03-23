/**
 * Habit → Task Projection Service
 * 
 * ⚠️ CRITICAL: This service projects habits as tasks. Tasks are DERIVED, not duplicates.
 * 
 * @see src/lib/habits/habitContract.ts for the canonical habit contract
 * 
 * Projects habit occurrences as tasks in the To-Do List.
 * Tasks are derived views of habit occurrences, not duplicates.
 * 
 * Key Principles:
 * - Habits remain activities with activity_type = 'habit'
 * - Habit check-ins are the source of truth for completion
 * - Tasks are read-time projections (or lightweight persistence)
 * - Two-way sync: task completion ↔ habit check-in
 * - No silent automation (all writes are explicit and user-initiated)
 */

import { supabase } from '../supabase';
import { listHabits } from './habitsService';
import { getActivityWithSchedules, getActivity } from '../activities/activityService';
import { generateInstancesFromSchedule } from '../activities/scheduleInstances';
import { upsertHabitCheckin } from './habitsService';
import type { Activity, ActivitySchedule } from '../activities/activityTypes';
import type { PersonalTodo } from '../todosService';
import { getPersonalSpace } from '../todosService';

// In-memory cache to track habits that have failed RLS (terminal state)
// Prevents repeated attempts in the same session
// Key: habit activity ID, Value: true if non-projectable
const nonProjectableHabits = new Set<string>();

/**
 * Mark a habit as non-projectable (terminal state after RLS failure)
 * This prevents repeated RLS attempts in the same session
 */
function markHabitTaskProjectionDisabled(habitId: string): void {
  nonProjectableHabits.add(habitId);
}

/**
 * Check if a habit is marked as non-projectable
 */
function isHabitProjectionDisabled(habitId: string): boolean {
  return nonProjectableHabits.has(habitId);
}

// ============================================================================
// Types
// ============================================================================

export interface HabitTaskProjection {
  // Task fields (derived from habit)
  id: string; // Synthetic ID: `habit_${activityId}_${localDate}`
  title: string; // Habit title
  description?: string; // Habit description
  completed: boolean; // Derived from habit_checkins
  completed_at?: string; // From habit_checkins.updated_at when status='done'
  due_date: string; // local_date (YYYY-MM-DD)
  priority: 'low' | 'medium' | 'high'; // Default 'medium'
  category?: string; // Optional, could be derived from habit tags
  order_index: number; // Higher than regular tasks (appear after)
  
  // Habit reference
  habit_activity_id: string;
  habit_schedule_id: string;
  habit_local_date: string; // YYYY-MM-DD
  
  // Metadata
  is_habit_derived: true; // Always true for projections
  habit_status?: 'done' | 'missed' | 'skipped' | 'partial'; // From habit_checkins
}

// ============================================================================
// Projection Logic
// ============================================================================

/**
 * Project habit occurrences as tasks for a given date range
 * Pure computation - determines which habits have occurrences
 * 
 * Timezone-aware: Uses local_date (YYYY-MM-DD) for day boundaries
 * This ensures habits appear on the correct day regardless of timezone
 */
export async function projectHabitOccurrencesAsTasks(
  userId: string,
  startDate: string, // YYYY-MM-DD (local date, timezone-aware)
  endDate: string // YYYY-MM-DD (local date, timezone-aware)
): Promise<HabitTaskProjection[]> {
  // Load all active habits
  const habits = await listHabits(userId, { status: 'active' });
  
  const projections: HabitTaskProjection[] = [];
  const start = new Date(startDate + 'T00:00:00'); // Ensure start of day
  const end = new Date(endDate + 'T23:59:59'); // Ensure end of day
  
  // Get authenticated user for ownership checks
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // No authenticated user - cannot project tasks
    return [];
  }
  
  // Get personal space for eligibility check
  const personalSpaceId = await getPersonalSpace();
  
  for (const habit of habits) {
    // Hard guard 1: Check if habit has failed RLS before (terminal state)
    if (nonProjectableHabits.has(habit.id)) {
      continue; // Skip - already marked as non-projectable
    }
    
    // Hard guard 2: Check if habit belongs to personal space
    // Projection is only for personal habits, not shared/household habits
    // We check if the habit's owner matches the current user
    if (habit.owner_id !== user.id) {
      continue; // Skip - habit belongs to different user
    }
    
    // Hard guard 3: Check if projection is explicitly enabled
    // Projection is opt-in via metadata.create_task flag
    const projectionEnabled = habit.metadata?.create_task === true;
    if (!projectionEnabled) {
      continue; // Skip - projection not enabled for this habit
    }
    
    // Hard guard 4: Check if habit is scheduled
    // Only scheduled habits should create tasks
    const activityWithSchedules = await getActivityWithSchedules(habit.id);
    if (!activityWithSchedules || !activityWithSchedules.schedules.length) {
      continue; // Skip habits without schedules
    }
    
    // Hard guard 5: Verify personal space exists
    if (!personalSpaceId) {
      continue; // Skip - no personal space available
    }
    
    // All guards passed - proceed with projection
    
    // Generate instances for date range
    for (const schedule of activityWithSchedules.schedules) {
      // TODO: Weekly/Monthly recurrence expansion
      // Currently supports daily habits via RRULE parsing
      // Weekly habits: task appears only on valid days (e.g., Monday, Wednesday, Friday)
      // Monthly habits: task appears on specific dates (e.g., 1st, 15th)
      // Implementation: Enhance generateInstancesFromSchedule to handle BYDAY, BYMONTHDAY in RRULE
      
      const instances = generateInstancesFromSchedule(
        schedule,
        habit.id,
        start.toISOString(),
        end.toISOString()
      );
      
      // Project each instance as a task
      for (const instance of instances) {
        // Check completion status from habit_checkins
        const checkin = await getHabitCheckinForDate(userId, habit.id, instance.local_date);
        const completed = checkin?.status === 'done';
        
        projections.push({
          id: `habit_${habit.id}_${instance.local_date}`,
          title: habit.title,
          description: habit.description || undefined,
          completed,
          completed_at: completed && checkin ? checkin.updated_at : undefined,
          due_date: instance.local_date,
          priority: 'medium',
          order_index: 10000, // Higher than regular tasks (appear after)
          habit_activity_id: habit.id,
          habit_schedule_id: schedule.id,
          habit_local_date: instance.local_date,
          is_habit_derived: true,
          habit_status: checkin?.status as 'done' | 'missed' | 'skipped' | 'partial' | undefined,
        });
      }
    }
  }
  
  return projections;
}

/**
 * Get habit check-in for a specific date
 */
async function getHabitCheckinForDate(
  userId: string,
  activityId: string,
  localDate: string
): Promise<{ status: string; updated_at: string } | null> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('status, updated_at')
    .eq('activity_id', activityId)
    .eq('owner_id', userId)
    .eq('local_date', localDate)
    .maybeSingle();
  
  if (error) {
    // Non-fatal: log at debug level (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[habitTaskProjectionService] Error fetching check-in:', error);
    }
    return null;
  }
  
  return data;
}

// ============================================================================
// Two-Way Sync
// ============================================================================

/**
 * Sync task completion to habit check-in
 * Called when a habit-derived task is completed in the To-Do List
 * 
 * This is idempotent - safe to call multiple times with the same parameters.
 */
export async function syncTaskCompletionToHabit(
  userId: string,
  habitActivityId: string,
  localDate: string,
  completed: boolean
): Promise<void> {
  // When a habit-derived task is completed:
  // 1. Create or update habit_checkin with status='done'
  // 2. Set value_boolean=true for boolean habits
  // 3. Ensure idempotent (safe to call multiple times)
  
  if (completed) {
    // For task completion, assume boolean habit (default)
    // Both values must be explicitly set per constraint
    await upsertHabitCheckin(userId, habitActivityId, localDate, {
      status: 'done',
      value_boolean: true,
      value_numeric: null,
    });
  } else {
    // Uncompleting a task → mark habit as skipped (not missed, not failure)
    // This is optional - user might want to undo completion
    // Both values must be explicitly null for skipped per constraint
    await upsertHabitCheckin(userId, habitActivityId, localDate, {
      status: 'skipped',
      value_numeric: null,
      value_boolean: null,
    });
  }
}

/**
 * Sync habit check-in to task completion
 * Called when a habit is checked in the Habit Tracker
 * Updates the corresponding projected task if it exists
 * 
 * This is idempotent - safe to call multiple times with the same parameters.
 */
export async function syncHabitCheckinToTask(
  userId: string,
  habitActivityId: string,
  localDate: string,
  status: 'done' | 'missed' | 'skipped' | 'partial'
): Promise<void> {
  // When a habit is checked in:
  // 1. Find the projected task (habit_activity_id + due_date = localDate)
  // 2. Update task.completed based on status
  // 3. Update task.completed_at if status='done'
  // 4. Ensure idempotent (safe to call multiple times)
  
  const completed = status === 'done';
  
  // Find the task
  const { data: task, error: findError } = await supabase
    .from('personal_todos')
    .select('id, completed')
    .eq('user_id', userId)
    .eq('habit_activity_id', habitActivityId)
    .eq('due_date', localDate)
    .maybeSingle();
  
  if (findError) {
    // Non-fatal: log at debug level (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[habitTaskProjectionService] Error finding task for sync:', findError);
    }
    return; // Non-fatal
  }
  
  if (task) {
    // Only update if state actually changed (idempotency)
    if (task.completed !== completed) {
      const { error: updateError } = await supabase
        .from('personal_todos')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', task.id);
      
      if (updateError) {
        // Non-fatal: log at debug level (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[habitTaskProjectionService] Error updating task completion:', updateError);
        }
      }
    }
  } else {
    // Task doesn't exist yet - ensure it exists (lightweight persistence)
    // This handles edge case: habit checked before task is projected
    try {
      const projection = await projectHabitOccurrencesAsTasks(
        userId,
        localDate,
        localDate
      );
      
      const matchingProjection = projection.find(
        p => p.habit_activity_id === habitActivityId && p.habit_local_date === localDate
      );
      
      if (matchingProjection) {
        // Update projection with current check-in status
        matchingProjection.completed = completed;
        matchingProjection.completed_at = completed ? new Date().toISOString() : undefined;
        matchingProjection.habit_status = status;
        
        await ensureHabitTaskExists(userId, matchingProjection);
      }
    } catch (err) {
      // Non-fatal: if projection fails, habit check-in is still valid
      // Log at debug level (not error) - only in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[habitTaskProjectionService] Error ensuring task exists:', err);
      }
    }
  }
}

/**
 * Ensure habit-derived task exists in database
 * Lightweight persistence - creates task record if it doesn't exist
 * This allows tasks to be queried alongside regular todos
 * 
 * Best-effort: Projection failures are acceptable and non-fatal
 * RLS violations are handled gracefully without retries
 * 
 * Hard guards prevent most RLS violations before attempting insert
 */
export async function ensureHabitTaskExists(
  userId: string,
  projection: HabitTaskProjection
): Promise<string | null> {
  // Hard guard 1: Check if habit is marked as non-projectable (terminal state)
  if (isHabitProjectionDisabled(projection.habit_activity_id)) {
    // Silent skip - already failed RLS, don't retry
    return null;
  }
  
  // Hard guard 2: Verify authenticated user matches userId
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    // Silent skip: user is not authenticated or doesn't match
    return null;
  }

  // Hard guard 3: Verify habit belongs to user and has projection enabled
  // Fetch activity to check ownership and opt-in flag
  const activity = await getActivity(projection.habit_activity_id);
  if (!activity) {
    // Silent skip: habit not found
    return null;
  }
  
  // Hard guard 4: Check ownership
  if (activity.owner_id !== user.id) {
    // Silent skip: habit belongs to different user
    return null;
  }
  
  // Hard guard 5: Check if projection is explicitly enabled (opt-in)
  const projectionEnabled = activity.metadata?.create_task === true;
  if (!projectionEnabled) {
    // Silent skip: projection not enabled for this habit
    return null;
  }
  
  // Hard guard 6: Verify habit is scheduled (required for projection)
  const activityWithSchedules = await getActivityWithSchedules(projection.habit_activity_id);
  if (!activityWithSchedules || !activityWithSchedules.schedules.length) {
    // Silent skip: habit has no schedule
    return null;
  }

  // Hard guard 7: Get personal space ID (required for RLS)
  const personalSpaceId = await getPersonalSpace();
  if (!personalSpaceId) {
    // Silent skip: no personal space found
    return null;
  }

  // Check if task already exists
  const { data: existing } = await supabase
    .from('personal_todos')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_activity_id', projection.habit_activity_id)
    .eq('due_date', projection.due_date)
    .maybeSingle();
  
  if (existing) {
    // Update existing task to match projection
    const { error: updateError } = await supabase
      .from('personal_todos')
      .update({
        title: projection.title,
        description: projection.description,
        completed: projection.completed,
        completed_at: projection.completed_at,
        priority: projection.priority,
        order_index: projection.order_index,
      })
      .eq('id', existing.id);
    
    if (updateError) {
      // Non-fatal: if update fails, task still exists
      // Log at debug level (not error/warn)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[habitTaskProjectionService] Error updating habit task:', updateError);
      }
    }
    
    return existing.id;
  }
  
  // All hard guards passed - attempt insert
  // RLS requires: auth.uid() = user_id AND is_user_household_member(household_id)
  const { data, error } = await supabase
    .from('personal_todos')
    .insert({
      user_id: user.id, // Use authenticated user ID (auth.uid())
      household_id: personalSpaceId,
      title: projection.title,
      description: projection.description,
      completed: projection.completed,
      completed_at: projection.completed_at,
      due_date: projection.due_date,
      priority: projection.priority,
      order_index: projection.order_index,
      habit_activity_id: projection.habit_activity_id,
    })
    .select('id')
    .single();
  
  if (error) {
    // Handle RLS violations as terminal state (code 42501)
    if (error.code === '42501') {
      // RLS violation: Mark habit as non-projectable (terminal state)
      // Do not retry in this session
      markHabitTaskProjectionDisabled(projection.habit_activity_id);
      
      // Log once per habit at debug/info level (not warn/error)
      // Silent in production, visible in development
      if (process.env.NODE_ENV === 'development') {
        console.info(
          '[habitTaskProjectionService] RLS prevented task creation (marked as non-projectable)',
          { habitId: projection.habit_activity_id }
        );
      }
      
      return null;
    }
    
    // Other errors: log at debug level (non-fatal)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[habitTaskProjectionService] Error creating habit task:', error);
    }
    return null;
  }
  
  return data?.id || null;
}

/**
 * Remove habit-derived tasks for a specific habit
 * Called when habit is paused or archived
 * 
 * This ensures tasks disappear when habits are paused/archived
 */
export async function removeHabitTasks(
  userId: string,
  habitActivityId: string
): Promise<void> {
  // When a habit is paused or archived:
  // 1. Delete all projected tasks for this habit
  // 2. This keeps the todo list clean and prevents stale tasks
  // 3. Tasks will reappear if habit is resumed
  
  const { error } = await supabase
    .from('personal_todos')
    .delete()
    .eq('user_id', userId)
    .eq('habit_activity_id', habitActivityId);
  
  if (error) {
    // Non-fatal: if deletion fails, tasks will be filtered out on next projection
    // Log at debug level (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[habitTaskProjectionService] Error removing habit tasks:', error);
    }
  }
}
