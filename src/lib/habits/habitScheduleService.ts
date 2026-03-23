/**
 * Habit Schedule Service
 * 
 * Integrates habits with the Spaces Calendar.
 * Habits can be scheduled to appear on the calendar as gentle reminders,
 * not rigid obligations.
 * 
 * Architecture:
 * - Calendar is canonical (no separate habit calendar)
 * - Habits link to calendar events via activity_id
 * - Scheduling is opt-in
 * - Removing schedule does NOT delete the habit
 */

import { supabase } from '../supabase';
import { createPersonalCalendarEvent, updatePersonalCalendarEvent, deletePersonalCalendarEvent } from '../personalSpaces/calendarService';
import { getActivity, getActivityWithSchedules, createActivitySchedule, updateActivitySchedule, deleteActivitySchedule } from '../activities/activityService';
import { projectActivitySchedulesToCalendar, hideActivityProjections, restoreActivityProjections } from '../activities/activityCalendarProjection';
import type { Activity } from '../activities/activityTypes';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'exact';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'custom';

export interface HabitScheduleConfig {
  frequency: RecurrenceFrequency;
  timeOfDay?: TimeOfDay;
  exactTime?: string; // HH:mm format (only if timeOfDay === 'exact')
  daysOfWeek?: number[]; // 0-6, Sunday = 0 (only if frequency === 'weekly')
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional)
}

export interface HabitScheduleInfo {
  habitId: string;
  calendarEventId: string | null;
  scheduleId: string | null;
  frequency: RecurrenceFrequency;
  timeOfDay?: TimeOfDay;
  exactTime?: string;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
}

/**
 * Schedule a habit to appear on the calendar
 */
export async function scheduleHabit(
  userId: string,
  habitId: string,
  config: HabitScheduleConfig
): Promise<HabitScheduleInfo> {
  // Get the activity (habit)
  const activity = await getActivity(habitId);
  if (!activity || activity.type !== 'habit') {
    throw new Error('Habit not found');
  }
  
  const activityWithSchedules = await getActivityWithSchedules(habitId);
  if (!activityWithSchedules) {
    throw new Error('Failed to load activity schedules');
  }

  // Calculate start_at based on time of day
  const startAt = calculateStartTime(config.startDate, config.timeOfDay, config.exactTime);
  const endAt = config.timeOfDay === 'exact' && config.exactTime
    ? calculateEndTime(startAt, 15) // 15 minute default duration
    : null;

  // Build recurrence rule
  const recurrenceRule = buildRecurrenceRule(config);

  // Check if schedule already exists
  const existingSchedule = activityWithSchedules.schedules.find(s => s.schedule_type === 'recurring');
  
  let scheduleId: string;
  if (existingSchedule) {
    // Update existing schedule
    await updateActivitySchedule(existingSchedule.id, {
      start_at: startAt,
      end_at: endAt,
      recurrence_rule: recurrenceRule,
      metadata: {
        frequency: config.frequency,
        timeOfDay: config.timeOfDay,
        exactTime: config.exactTime,
        daysOfWeek: config.daysOfWeek,
        startDate: config.startDate,
        endDate: config.endDate,
      },
    });
    scheduleId = existingSchedule.id;
  } else {
    // Create new schedule
    const schedule = await createActivitySchedule({
      activity_id: habitId,
      schedule_type: 'recurring',
      start_at: startAt,
      end_at: endAt,
      recurrence_rule: recurrenceRule,
      metadata: {
        frequency: config.frequency,
        timeOfDay: config.timeOfDay,
        exactTime: config.exactTime,
        daysOfWeek: config.daysOfWeek,
        startDate: config.startDate,
        endDate: config.endDate,
      },
    });
    scheduleId = schedule.id;
  }

  // Project to calendar
  const updatedActivityWithSchedules = await getActivityWithSchedules(habitId);
  if (!updatedActivityWithSchedules) {
    throw new Error('Failed to load updated activity');
  }

  const schedule = updatedActivityWithSchedules.schedules.find(s => s.id === scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found after creation');
  }

  const calendarEventIds = await projectActivitySchedulesToCalendar(userId, activity, [schedule]);
  const eventId = calendarEventIds[0] || null;

  return {
    habitId,
    calendarEventId: eventId,
    scheduleId,
    frequency: config.frequency,
    timeOfDay: config.timeOfDay,
    exactTime: config.exactTime,
    daysOfWeek: config.daysOfWeek,
    startDate: config.startDate,
    endDate: config.endDate,
    isActive: true,
  };
}

/**
 * Get schedule info for a habit
 */
export async function getHabitSchedule(habitId: string): Promise<HabitScheduleInfo | null> {
  const activity = await getActivityWithSchedules(habitId);
  if (!activity || activity.type !== 'habit') {
    return null;
  }

  const schedule = activity.schedules.find(s => s.schedule_type === 'recurring');
  if (!schedule) {
    return null;
  }

  // Find calendar event linked to this habit
  const { data: calendarEvent } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('activity_id', habitId)
    .eq('event_type', 'habit')
    .eq('projection_state', 'active')
    .maybeSingle();

  const metadata = schedule.metadata || {};
  
  return {
    habitId,
    calendarEventId: calendarEvent?.id || null,
    scheduleId: schedule.id,
    frequency: metadata.frequency || 'daily',
    timeOfDay: metadata.timeOfDay,
    exactTime: metadata.exactTime,
    daysOfWeek: metadata.daysOfWeek,
    startDate: metadata.startDate || schedule.start_at?.split('T')[0] || '',
    endDate: metadata.endDate || schedule.end_at?.split('T')[0] || null,
    isActive: true,
  };
}

/**
 * Remove schedule from a habit (does NOT delete the habit)
 */
export async function unscheduleHabit(userId: string, habitId: string): Promise<void> {
  // Hide calendar projections
  await hideActivityProjections(userId, habitId);

  // Optionally delete the schedule (or just hide it)
  // For now, we'll keep the schedule but hide projections
  // This allows easy re-scheduling later
}

/**
 * Restore schedule for a habit
 */
export async function restoreHabitSchedule(userId: string, habitId: string): Promise<void> {
  await restoreActivityProjections(userId, habitId);
}

/**
 * Calculate start time based on time of day
 */
function calculateStartTime(date: string, timeOfDay?: TimeOfDay, exactTime?: string): string {
  const dateObj = new Date(date + 'T00:00:00');
  
  if (timeOfDay === 'exact' && exactTime) {
    const [hours, minutes] = exactTime.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj.toISOString();
  }

  switch (timeOfDay) {
    case 'morning':
      dateObj.setHours(8, 0, 0, 0); // 8 AM
      break;
    case 'afternoon':
      dateObj.setHours(14, 0, 0, 0); // 2 PM
      break;
    case 'evening':
      dateObj.setHours(20, 0, 0, 0); // 8 PM
      break;
    default:
      dateObj.setHours(9, 0, 0, 0); // Default 9 AM
  }

  return dateObj.toISOString();
}

/**
 * Calculate end time (default 15 minutes for habits)
 */
function calculateEndTime(startAt: string, durationMinutes: number = 15): string {
  const start = new Date(startAt);
  start.setMinutes(start.getMinutes() + durationMinutes);
  return start.toISOString();
}

/**
 * Build RRULE from config
 */
function buildRecurrenceRule(config: HabitScheduleConfig): string {
  if (config.frequency === 'daily') {
    return 'FREQ=DAILY;INTERVAL=1';
  } else if (config.frequency === 'weekly' && config.daysOfWeek && config.daysOfWeek.length > 0) {
    // Convert days to RRULE format (MO, TU, WE, etc.)
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDay = config.daysOfWeek.map(day => dayNames[day]).join(',');
    return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay}`;
  } else {
    // Default to daily
    return 'FREQ=DAILY;INTERVAL=1';
  }
}

/**
 * Format schedule for display (expressive, calm language)
 */
export function formatScheduleDisplay(schedule: HabitScheduleInfo): string {
  if (schedule.frequency === 'daily') {
    if (schedule.timeOfDay === 'morning') {
      return 'Every morning';
    } else if (schedule.timeOfDay === 'afternoon') {
      return 'Every afternoon';
    } else if (schedule.timeOfDay === 'evening') {
      return 'Every evening';
    } else if (schedule.timeOfDay === 'exact' && schedule.exactTime) {
      // Format time nicely (e.g., "7:00am" or "7:00pm")
      const [hours, minutes] = schedule.exactTime.split(':').map(Number);
      const period = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `Daily at ${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
    } else {
      return 'Daily';
    }
  } else if (schedule.frequency === 'weekly' && schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = schedule.daysOfWeek
      .sort((a, b) => a - b)
      .map(day => dayNames[day])
      .join(' / ');
    
    if (schedule.timeOfDay === 'exact' && schedule.exactTime) {
      // Format time nicely
      const [hours, minutes] = schedule.exactTime.split(':').map(Number);
      const period = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${days} at ${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
    } else if (schedule.timeOfDay === 'morning') {
      return `${days} mornings`;
    } else if (schedule.timeOfDay === 'afternoon') {
      return `${days} afternoons`;
    } else if (schedule.timeOfDay === 'evening') {
      return `${days} evenings`;
    } else {
      return days;
    }
  } else {
    return 'Scheduled';
  }
}
