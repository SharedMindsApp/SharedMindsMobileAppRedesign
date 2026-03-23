/**
 * Habit Day-Aware Helpers
 * 
 * Utilities for determining habit relevance to a specific date,
 * including schedule checking and time-of-day annotations.
 */

import { getActivityWithSchedules } from '../activities/activityService';
import { generateInstancesFromSchedule } from '../activities/scheduleInstances';
import { getHabitSchedule, formatScheduleDisplay } from './habitScheduleService';
import type { Activity } from '../activities/activityTypes';

export interface HabitDayContext {
  isScheduled: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'exact';
  exactTime?: string;
  scheduleDisplay?: string;
}

/**
 * Check if a habit is scheduled for a specific date
 */
export async function isHabitScheduledForDate(
  habitId: string,
  date: string // YYYY-MM-DD
): Promise<boolean> {
  try {
    const activityWithSchedules = await getActivityWithSchedules(habitId);
    if (!activityWithSchedules || !activityWithSchedules.schedules.length) {
      return false;
    }

    // Check if any schedule generates an instance for this date
    const startISO = new Date(date + 'T00:00:00').toISOString();
    const endISO = new Date(date + 'T23:59:59').toISOString();

    for (const schedule of activityWithSchedules.schedules) {
      if (schedule.schedule_type === 'recurring' && schedule.recurrence_rule) {
        const instances = generateInstancesFromSchedule(
          schedule,
          habitId,
          startISO,
          endISO
        );
        
        if (instances.some(inst => inst.local_date === date)) {
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    // Network errors are transient - log at debug level only
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('network') || error?.message?.includes('QUIC')) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[habitDayAwareHelpers] Network error checking schedule (transient):', error.message);
      }
    } else {
      // Other errors - log normally
      console.error('[habitDayAwareHelpers] Error checking schedule:', error);
    }
    return false;
  }
}

/**
 * Get day context for a habit (scheduled status, time info)
 */
export async function getHabitDayContext(
  habitId: string,
  date: string // YYYY-MM-DD
): Promise<HabitDayContext> {
  try {
    const scheduleInfo = await getHabitSchedule(habitId);
    
    if (!scheduleInfo) {
      return { isScheduled: false };
    }

    // Check if scheduled for this specific date
    const isScheduled = await isHabitScheduledForDate(habitId, date);

    return {
      isScheduled,
      timeOfDay: scheduleInfo.timeOfDay,
      exactTime: scheduleInfo.exactTime,
      scheduleDisplay: formatScheduleDisplay(scheduleInfo),
    };
  } catch (error: any) {
    // Network errors are transient - log at debug level only
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('network') || error?.message?.includes('QUIC')) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[habitDayAwareHelpers] Network error getting day context (transient):', error.message);
      }
    } else {
      // Other errors - log normally
      console.error('[habitDayAwareHelpers] Error getting day context:', error);
    }
    return { isScheduled: false };
  }
}

/**
 * Get time-of-day annotation text (informational only)
 */
export function getTimeOfDayAnnotation(
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'exact',
  exactTime?: string
): string | null {
  if (!timeOfDay) return null;

  switch (timeOfDay) {
    case 'morning':
      return 'Often works well in the morning';
    case 'afternoon':
      return 'Usually scheduled for later';
    case 'evening':
      return 'Usually scheduled for later';
    case 'exact':
      if (exactTime) {
        return `Scheduled for ${exactTime}`;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Sort habits by day relevance (scheduled first, then others)
 */
export async function sortHabitsByDayRelevance(
  habits: Activity[],
  date: string // YYYY-MM-DD
): Promise<Array<Activity & { dayContext?: HabitDayContext }>> {
  const habitsWithContext = await Promise.all(
    habits.map(async (habit) => {
      const dayContext = await getHabitDayContext(habit.id, date);
      return { ...habit, dayContext };
    })
  );

  // Sort: scheduled first, then others
  return habitsWithContext.sort((a, b) => {
    if (a.dayContext?.isScheduled && !b.dayContext?.isScheduled) return -1;
    if (!a.dayContext?.isScheduled && b.dayContext?.isScheduled) return 1;
    return 0; // Keep original order within each group
  });
}
