/**
 * CANONICAL HABITS SERVICE
 * 
 * ⚠️ CRITICAL: This is the SINGLE SOURCE OF TRUTH for all habit data operations.
 * 
 * If you are adding habit-related functionality and are not using this service,
 * STOP. You are creating fragmentation.
 * 
 * @see src/lib/habits/habitContract.ts for the canonical habit contract
 * 
 * ============================================================================
 * FINAL SAFEGUARD
 * ============================================================================
 * 
 * ⚠️ IF YOU ARE READING THIS AND CONSIDERING:
 * - Creating a new habit service → STOP. Extend this service instead.
 * - Writing habit data directly to the database → STOP. Use this service.
 * - Creating habit logic in a different file → STOP. Add it here.
 * - Bypassing the habit contract → STOP. Read habitContract.ts first.
 * 
 * This service provides:
 * - Full CRUD operations for habits (activities with type='habit')
 * - Check-in logic (habit_checkins table)
 * - No duplication with calendar (habits project to calendar, not duplicate)
 * 
 * All habit writes must go through this service.
 * All habit reads should use this service or habitContextHelpers (read-only).
 */

import { supabase } from '../supabase';
import {
  createActivity,
  createActivitySchedule,
  updateActivity,
  archiveActivity,
  getUserActivities,
} from '../activities/activityService';
import type { Activity } from '../activities/activityTypes';
import {
  hideActivityProjections,
} from '../activities/activityCalendarProjection';
import type { CreateActivityInput } from '../activities/activityTypes';
import { emitActivityChanged } from '../activities/activityEvents';
import { getTagsForEntity, addTagsToEntity, type Tag } from '../tags/tagService';
import { FEATURE_CONTEXT_TAGGING } from '../featureFlags';
import { autoGenerateAndLinkTags } from '../tags/tagAutoGeneration';
import { generateInstancesFromSchedule } from '../activities/scheduleInstances';
import type { ActivitySchedule } from '../activities/activityTypes';

// ============================================================================
// Types
// ============================================================================

export type HabitPolarity = 'build' | 'break' | 'existing';
export type HabitMetricType = 'count' | 'minutes' | 'boolean' | 'rating' | 'custom' | 'limit' | 'duration';
export type HabitDirection = 'at_least' | 'at_most' | 'exactly';
export type HabitCheckinStatus = 'done' | 'missed' | 'skipped' | 'partial';

/**
 * Habit Target - Defines what success means for a habit
 * Optional, lightweight, progressive disclosure
 */
export interface HabitTarget {
  metricType: HabitMetricType;
  targetValue?: number;      // e.g. 1 cup, 10 minutes
  unit?: string;             // e.g. "cups", "minutes", "glasses"
  comparison?: HabitDirection; // 'at_least' | 'at_most' | 'exactly'
  description?: string;      // human-readable fallback (e.g., "Up to 1 caffeinated drink")
}

export interface HabitCheckin {
  id: string;
  activity_id: string;
  owner_id: string;
  local_date: string; // YYYY-MM-DD
  status: HabitCheckinStatus;
  value_numeric: number | null;
  value_boolean: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitInput {
  title: string;
  description?: string;
  polarity: HabitPolarity;
  metric_type: HabitMetricType;
  metric_unit?: string;
  target_value?: number;
  direction?: HabitDirection;
  startDate: string;
  endDate?: string;
  repeatType: 'daily' | 'weekly' | 'monthly';
  visibility_default?: 'private' | 'shared_overview' | 'shared_detailed';
  display?: {
    icon?: string;
    color?: string;
  };
  tagIds?: string[]; // Optional tag IDs to link to the habit
  autoGenerateTags?: boolean; // Auto-generate tags from title/description
  isExistingHabit?: boolean; // Flag to indicate this is an existing habit (for UI/UX purposes)
  reminderEnabled?: boolean; // Opt-in reminder notifications
  reminderTime?: string; // Time in HH:MM format (e.g., "08:00")
  skill_practice?: {
    skill_id: string;
    evidence_template?: string; // Optional template for evidence text (e.g., "Completed {habit_title} on {date}")
  };
  // Ownership (optional, defaults to user-owned)
  owner_type?: 'user' | 'household' | 'team';
  household_owner_id?: string;
  team_owner_id?: string;
  team_group_id?: string;
  // Collaboration mode (for household/team habits)
  collaboration_mode?: 'collaborative' | 'visible' | 'competitive';
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  polarity?: HabitPolarity;
  metric_type?: HabitMetricType;
  metric_unit?: string;
  target_value?: number;
  direction?: HabitDirection;
  status?: 'active' | 'completed' | 'archived' | 'inactive';
}

export interface HabitCheckinInput {
  activityId: string;
  local_date: string; // YYYY-MM-DD
  status?: HabitCheckinStatus;
  value_numeric?: number;
  value_boolean?: boolean;
  notes?: string;
}

export interface HabitSummary {
  habit: Activity & { tags?: Tag[] };
  currentStreak: number;
  bestStreak: number;
  completionRate7d: number;
  completionRate30d: number;
  totalCheckins: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Habit CRUD
// ============================================================================

/**
 * Create a habit activity with schedule
 */
export async function createHabitActivity(
  userId: string,
  input: CreateHabitInput
): Promise<{ activityId: string; scheduleId: string }> {
  // Create activity
  // For 'existing' habits, treat them like 'build' habits for direction logic
  const effectivePolarity = input.polarity === 'existing' ? 'build' : input.polarity;
  const metadata = {
    polarity: input.polarity, // Store the actual polarity including 'existing'
    metric_type: input.metric_type,
    metric_unit: input.metric_unit,
    target_value: input.target_value,
    direction: input.direction || (effectivePolarity === 'build' ? 'at_least' : 'at_most'),
    repeatType: input.repeatType,
    // Skill practice mapping (opt-in)
    skill_practice: input.skill_practice || undefined,
    // Collaboration mode (for household/team habits)
    collaboration_mode: input.collaboration_mode || (input.owner_type && input.owner_type !== 'user' ? 'collaborative' : undefined),
  };
  
  const activityInput: CreateActivityInput = {
    type: 'habit',
    title: input.title,
    description: input.description,
    status: 'active',
    metadata,
    // Ownership (optional, defaults to user-owned)
    owner_type: input.owner_type,
    household_owner_id: input.household_owner_id,
    team_owner_id: input.team_owner_id,
    team_group_id: input.team_group_id,
  };

  const activity = await createActivity(userId, activityInput);

  // Emit change event for sync
  emitActivityChanged(activity.id);

  // Update activity with habit-specific fields (if columns exist)
  // Note: These fields are in metadata, but we also store in columns if they exist
  try {
    await supabase
      .from('activities')
      .update({
        polarity: input.polarity,
        metric_type: input.metric_type,
        metric_unit: input.metric_unit || null,
        target_value: input.target_value || null,
        direction: input.direction || (effectivePolarity === 'build' ? 'at_least' : 'at_most'),
        visibility_default: input.visibility_default || 'private',
      })
      .eq('id', activity.id);
  } catch (err) {
    // Columns may not exist yet - that's okay, metadata is the source of truth
    console.warn('[habitsService] Could not update activity columns (may not exist):', err);
  }

  // Create recurring schedule
  let recurrenceRule: string;
  if (input.repeatType === 'daily') {
    recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  } else if (input.repeatType === 'weekly') {
    recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';
  } else if (input.repeatType === 'monthly') {
    recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';
  } else {
    recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  }

  const schedule = await createActivitySchedule({
    activity_id: activity.id,
    schedule_type: 'recurring',
    start_at: input.startDate,
    end_at: input.endDate || undefined,
    recurrence_rule: recurrenceRule,
    metadata: {
      repeatType: input.repeatType,
      reminderEnabled: input.reminderEnabled || false,
      reminderTime: input.reminderTime || null,
    },
  });

  // Create reminder calendar events if enabled
  if (input.reminderEnabled && input.reminderTime) {
    try {
      await createHabitReminders(userId, activity, schedule, input.reminderTime);
    } catch (err) {
      console.error('[habitsService] Error creating habit reminders:', err);
      // Non-fatal - habit is created, reminders can be added later
    }
  }

  // Handle tags if feature is enabled
  if (FEATURE_CONTEXT_TAGGING) {
    const allTagIds: string[] = [];
    
    // Auto-generate tags from title/description if enabled
    if (input.autoGenerateTags) {
      try {
        const generatedTagIds = await autoGenerateAndLinkTags(
          userId,
          'habit',
          activity.id,
          input.title,
          input.description
        );
        allTagIds.push(...generatedTagIds);
      } catch (err) {
        console.error('[habitsService] Error auto-generating tags:', err);
        // Non-fatal, continue
      }
    }
    
    // Link manually selected tags
    if (input.tagIds && input.tagIds.length > 0) {
      try {
        await addTagsToEntity(userId, input.tagIds, 'habit', activity.id);
        allTagIds.push(...input.tagIds);
      } catch (err) {
        console.error('[habitsService] Error linking tags:', err);
        // Non-fatal, continue
      }
    }
  }

  // Project to calendar (optional - can be feature-flagged)
  // await projectActivitySchedulesToCalendar(userId, activity, [schedule]);

  // TODO: Habit → Task Projection - Auto-project on creation
  // When a habit is created, immediately project today's occurrence as a task
  // This ensures users see the habit task right away
  // Implementation: Call ensureHabitTaskExists for today's date

  return {
    activityId: activity.id,
    scheduleId: schedule.id,
  };
}

/**
 * Update habit activity
 */
export async function updateHabitActivity(
  habitId: string,
  input: UpdateHabitInput
): Promise<void> {
  // Get current habit to check status change
  const { data: currentHabit } = await supabase
    .from('activities')
    .select('status, owner_id')
    .eq('id', habitId)
    .single();
  
  const wasActive = currentHabit?.status === 'active';
  const willBeActive = input.status === undefined || input.status === 'active';

  const updates: Record<string, any> = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.polarity !== undefined) updates.polarity = input.polarity;
  if (input.metric_type !== undefined) updates.metric_type = input.metric_type;
  if (input.metric_unit !== undefined) updates.metric_unit = input.metric_unit;
  if (input.target_value !== undefined) updates.target_value = input.target_value;
  if (input.direction !== undefined) updates.direction = input.direction;
  if (input.status !== undefined) updates.status = input.status;

  await updateActivity(habitId, {
    title: input.title,
    description: input.description,
    status: input.status,
    metadata: {
      ...updates,
    },
  });

  // Update activity fields directly
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('activities')
      .update(updates)
      .eq('id', habitId);
  }

  // TODO: Habit → Task Projection - Handle status changes
  // If habit status changed from active to inactive/paused:
  // 1. Remove all projected tasks for this habit
  // 2. Tasks will reappear if habit is resumed
  if (wasActive && !willBeActive && currentHabit?.owner_id) {
    try {
      const { removeHabitTasks } = await import('./habitTaskProjectionService');
      await removeHabitTasks(currentHabit.owner_id, habitId);
    } catch (err) {
      // Non-fatal: if cleanup fails, tasks will be filtered out on next projection
      console.error('[habitsService] Error removing habit tasks on status change:', err);
    }
  }

  // Emit change event for sync
  emitActivityChanged(habitId);
}

/**
 * Archive habit (soft delete)
 */
export async function archiveHabit(
  userId: string,
  habitId: string
): Promise<void> {
  // Hide calendar projections
  await hideActivityProjections(userId, habitId);

  // TODO: Habit → Task Projection - Cleanup
  // Remove habit-derived tasks when habit is archived
  // This ensures tasks don't persist after habit is deleted
  try {
    const { removeHabitTasks } = await import('./habitTaskProjectionService');
    await removeHabitTasks(userId, habitId);
  } catch (err) {
    // Non-fatal: if cleanup fails, habit is still archived
    console.error('[habitsService] Error removing habit tasks:', err);
  }

  // Archive activity
  await archiveActivity(habitId);
}

/**
 * List user's habits
 */
export async function listHabits(
  userId: string,
  filters?: {
    status?: 'active' | 'completed' | 'archived' | 'inactive';
    includeTags?: boolean;
  }
): Promise<Activity[]> {
  const habits = await getUserActivities(userId, {
    type: 'habit',
    status: filters?.status,
  });

  // Optionally enrich with tags
  if (FEATURE_CONTEXT_TAGGING && filters?.includeTags) {
    const habitsWithTags = await Promise.all(
      habits.map(async (habit) => {
        try {
          const tags = await getTagsForEntity('habit', habit.id);
          return { ...habit, tags };
        } catch (err) {
          console.error(`[habitsService] Error loading tags for habit ${habit.id}:`, err);
          return habit;
        }
      })
    );
    return habitsWithTags;
  }

  return habits;
}

// ============================================================================
// Habit Check-ins
// ============================================================================

/**
 * Upsert habit check-in (create or update)
 */
export async function upsertHabitCheckin(
  userId: string,
  activityId: string,
  local_date: string,
  payload: {
    status: 'done' | 'missed' | 'skipped' | 'partial';
    value_numeric: number | null;
    value_boolean: boolean | null;
    notes?: string;
  }
): Promise<HabitCheckin> {
  // CRITICAL: Do NOT mutate payload, do NOT apply defaults, do NOT merge with previous values
  // The UI is responsible for constructing the correct payload
  // This service passes it through exactly as received

  // Check if check-in exists
  const { data: existing } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('activity_id', activityId)
    .eq('owner_id', userId)
    .eq('local_date', local_date)
    .maybeSingle();

  // Build insert/update object exactly as received from UI
  // No defaults, no fallback logic, no merging
  const checkinData: {
    activity_id: string;
    owner_id: string;
    local_date: string;
    status: 'done' | 'missed' | 'skipped' | 'partial';
    value_numeric: number | null;
    value_boolean: boolean | null;
    notes: string | null;
  } = {
    activity_id: activityId,
    owner_id: userId,
    local_date: local_date,
    status: payload.status,
    value_numeric: payload.value_numeric, // Use exactly as provided (null or number)
    value_boolean: payload.value_boolean, // Use exactly as provided (null or boolean)
    notes: payload.notes || null,
  };

  // Debug logging to verify payload correctness
  console.log('[DEBUG habit_checkin payload]', checkinData);

  let checkin: HabitCheckin;
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('habit_checkins')
      .update(checkinData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[habitsService] Error updating check-in:', error);
      throw error;
    }

    checkin = data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('habit_checkins')
      .insert(checkinData)
      .select()
      .single();

    if (error) {
      console.error('[habitsService] Error creating check-in:', error);
      throw error;
    }

    checkin = data;
  }

  // TODO: Habit → Task Projection - Sync habit check-in to task
  // After check-in is created/updated, sync to projected task
  // This ensures task completion state matches habit check-in
  try {
    const { syncHabitCheckinToTask } = await import('./habitTaskProjectionService');
    await syncHabitCheckinToTask(
      userId,
      activityId,
      local_date,
      checkin.status as HabitCheckinStatus
    );
  } catch (err) {
    // Non-fatal: if task sync fails, check-in is still valid
    console.error('[habitsService] Error syncing habit check-in to task:', err);
  }

  // Skill Evidence Write (Controlled, Opt-In)
  // If habit has skill_practice mapping AND status is 'done', record evidence
  // This is guarded, non-blocking, and idempotent
  if (checkin.status === 'done') {
    try {
      // Get activity to check for skill_practice mapping
      const { getActivity } = await import('../activities/activityService');
      const activity = await getActivity(activityId);
      
      if (activity) {
        const { hasSkillPracticeMapping } = await import('../skills/skillEvidenceFromHabit');
        
        if (hasSkillPracticeMapping(activity.metadata)) {
          // Record skill evidence (non-blocking, idempotent)
          const { recordSkillEvidenceFromHabit } = await import('../skills/skillEvidenceFromHabit');
          await recordSkillEvidenceFromHabit(
            userId,
            activityId,
            local_date,
            checkin.notes
          );
          // Note: Errors are logged but don't affect check-in success
        }
      }
    } catch (err) {
      // Non-fatal: if skill evidence write fails, check-in is still valid
      console.error('[habitsService] Error recording skill evidence from habit:', err);
    }
  }

  return checkin;
}

/**
 * Get habit check-ins for date range
 * Alias for getHabitCheckinsForRange (kept for backward compatibility)
 */
export async function getHabitCheckinsRange(
  userId: string,
  activityId: string,
  startLocalDate: string,
  endLocalDate: string
): Promise<HabitCheckin[]> {
  return getHabitCheckinsForRange(userId, activityId, startLocalDate, endLocalDate);
}

/**
 * Get habit check-ins for date range
 */
export async function getHabitCheckinsForRange(
  userId: string,
  activityId: string,
  startDate: string,
  endDate: string
): Promise<HabitCheckin[]> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('activity_id', activityId)
    .eq('owner_id', userId)
    .gte('local_date', startDate)
    .lte('local_date', endDate)
    .order('local_date', { ascending: true });

  if (error) {
    console.error('[habitsService] Error fetching check-ins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all check-ins for user in date range (for calendar)
 */
export async function getUserHabitCheckinsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitCheckin[]> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('owner_id', userId)
    .gte('local_date', startDate)
    .lte('local_date', endDate)
    .order('local_date', { ascending: true });

  if (error) {
    console.error('[habitsService] Error fetching user check-ins:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// Habit Summary & Analytics
// ============================================================================

/**
 * Get habit summary (streak, completion rate, trend)
 */
export async function getHabitSummary(
  userId: string,
  habitId: string,
  range?: { startDate: string; endDate: string }
): Promise<HabitSummary> {
  const habit = await getUserActivities(userId, { type: 'habit' }).then(
    habits => habits.find(h => h.id === habitId)
  );

  if (!habit) {
    throw new Error('Habit not found');
  }

  // Default to last 30 days
  const endDate = range?.endDate || new Date().toISOString().split('T')[0];
  const startDate = range?.startDate || (() => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  })();

  const checkins = await getHabitCheckinsForRange(userId, habitId, startDate, endDate);

  // Calculate streaks
  const sortedCheckins = [...checkins]
    .sort((a, b) => new Date(a.local_date).getTime() - new Date(b.local_date).getTime())
    .filter(c => c.status === 'done');

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date(today);
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const checkin = sortedCheckins.find(c => c.local_date === dateStr);
    
    if (checkin && checkin.status === 'done') {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak
  for (const checkin of sortedCheckins) {
    if (checkin.status === 'done') {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate completion rates
  const days7Start = new Date();
  days7Start.setDate(days7Start.getDate() - 7);
  const days7StartStr = days7Start.toISOString().split('T')[0];
  const checkins7d = checkins.filter(c => c.local_date >= days7StartStr && c.status === 'done');
  const completionRate7d = (checkins7d.length / 7) * 100;

  const checkins30d = checkins.filter(c => c.status === 'done');
  const completionRate30d = (checkins30d.length / 30) * 100;

  // Calculate trend (compare last 7 days to previous 7 days)
  const days14Start = new Date();
  days14Start.setDate(days14Start.getDate() - 14);
  const days14StartStr = days14Start.toISOString().split('T')[0];
  const checkinsPrev7d = checkins.filter(
    c => c.local_date >= days14StartStr && c.local_date < days7StartStr && c.status === 'done'
  );
  const prev7dRate = (checkinsPrev7d.length / 7) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (completionRate7d > prev7dRate + 5) trend = 'up';
  else if (completionRate7d < prev7dRate - 5) trend = 'down';

  return {
    habit,
    currentStreak,
    bestStreak,
    completionRate7d,
    completionRate30d,
    totalCheckins: checkins.filter(c => c.status === 'done').length,
    trend,
  };
}

/**
 * Delete habit instance from calendar (soft delete - marks as missed/skipped)
 */
export async function deleteHabitInstanceFromCalendar(
  userId: string,
  activityId: string,
  local_date: string,
  markAs: 'missed' | 'skipped' = 'skipped'
): Promise<void> {
  // Update or create check-in with missed/skipped status
  // Both values must be explicitly null for missed/skipped per constraint
  await upsertHabitCheckin(userId, activityId, local_date, {
    status: markAs,
    value_numeric: null,
    value_boolean: null,
  });
}

/**
 * Create recurring reminder calendar events for a habit
 * Generates reminder events based on the schedule's recurrence rule
 */
async function createHabitReminders(
  userId: string,
  activity: Activity,
  schedule: ActivitySchedule,
  reminderTime: string // HH:MM format
): Promise<void> {
  if (!schedule.start_at) {
    return;
  }

  // Get profile ID and household ID (required for calendar_events)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    console.error('[habitsService] Profile not found for user:', userId);
    return;
  }

  // Find personal space via space_members
  const { data: membership } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(context_type)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.context_type', 'personal')
    .maybeSingle();

  if (!membership) {
    console.error('[habitsService] Personal space not found for user:', userId);
    return;
  }

  const household = { id: membership.space_id };

  // Generate instances for the next 90 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 90);

  const instances = generateInstancesFromSchedule(
    schedule,
    activity.id,
    startDate.toISOString(),
    endDate.toISOString()
  );

  // Create a reminder calendar event for each instance
  for (const instance of instances) {
    try {
      // Parse reminder time (HH:MM)
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const reminderDate = new Date(instance.local_date);
      reminderDate.setHours(hours, minutes, 0, 0);
      
      // End time is 15 minutes after reminder (short reminder window)
      const reminderEnd = new Date(reminderDate);
      reminderEnd.setMinutes(reminderEnd.getMinutes() + 15);

      // Check if reminder already exists for this date
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_id', activity.id)
        .eq('event_type', 'reminder')
        .gte('start_at', reminderDate.toISOString().split('T')[0] + 'T00:00:00')
        .lt('start_at', reminderDate.toISOString().split('T')[0] + 'T23:59:59')
        .maybeSingle();

      if (existing) {
        // Reminder already exists for this date
        continue;
      }

      // Create reminder calendar event directly
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          household_id: household.id,
          created_by: profile.id,
          title: `Reminder: ${activity.title}`,
          description: `Don't forget to ${activity.title.toLowerCase()}`,
          start_at: reminderDate.toISOString(),
          end_at: reminderEnd.toISOString(),
          all_day: false,
          event_type: 'reminder',
          activity_id: activity.id, // Link to habit activity
          projection_state: 'active',
          source_type: 'personal',
          source_entity_id: null,
          source_project_id: null,
        });

      if (error) {
        console.error(`[habitsService] Error creating reminder for ${instance.local_date}:`, error);
        // Continue with next instance
      }
    } catch (err) {
      console.error(`[habitsService] Error creating reminder for ${instance.local_date}:`, err);
      // Continue with next instance
    }
  }
}

