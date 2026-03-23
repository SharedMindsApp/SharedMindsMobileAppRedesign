/**
 * Tracker Reminder Resolver
 * 
 * Background resolver that evaluates tracker reminder schedules
 * and emits notification intents when reminders should fire.
 * 
 * This runs server-side (cron / edge function) and never writes tracker data.
 * 
 * Safety rules:
 * - Reminder fires only if entry doesn't exist
 * - Respects quiet hours
 * - Max 1 reminder per tracker per day
 * - Max 3 reminders per user per day
 */

import { supabase } from '../supabase';
import { emitNotificationIntent } from '../notificationResolver';
import { getTracker } from './trackerService';
import { getEntryByDate } from './trackerEntryService';

export interface TrackerReminderEvaluationResult {
  reminderId: string;
  trackerId: string;
  trackerName: string;
  reminderKind: 'entry_prompt' | 'reflection';
  userId: string;
  shouldFire: boolean;
  reason?: string;
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(schedule: any): boolean {
  if (!schedule?.quiet_hours) {
    // Default quiet hours: 22:00 - 07:00
    const hour = new Date().getHours();
    return hour >= 22 || hour < 7;
  }

  const { start, end } = schedule.quiet_hours;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle quiet hours that span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Check if reminder should fire based on schedule
 */
function shouldFireBySchedule(schedule: any): boolean {
  if (!schedule) {
    return true; // No schedule = fire anytime
  }

  // Check quiet hours
  if (isQuietHours(schedule)) {
    return false;
  }

  // Check time of day
  if (schedule.time_of_day) {
    const [scheduleHour, scheduleMinute] = schedule.time_of_day.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Allow 5-minute window
    const scheduleTime = scheduleHour * 60 + scheduleMinute;
    const currentTime = currentHour * 60 + currentMinute;
    const diff = Math.abs(currentTime - scheduleTime);

    if (diff > 5) {
      return false;
    }
  }

  // Check days of week
  if (schedule.days && schedule.days.length > 0) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[new Date().getDay()];

    if (schedule.days.includes('daily')) {
      // Always allow
    } else if (schedule.days.includes('weekdays')) {
      if (currentDay === 'saturday' || currentDay === 'sunday') {
        return false;
      }
    } else if (!schedule.days.includes(currentDay)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate a single tracker reminder
 */
export async function evaluateTrackerReminder(
  reminderId: string,
  trackerId: string,
  reminderKind: 'entry_prompt' | 'reflection',
  userId: string,
  schedule: any
): Promise<TrackerReminderEvaluationResult> {
  // Get tracker
  const tracker = await getTracker(trackerId);
  if (!tracker) {
    return {
      reminderId,
      trackerId,
      trackerName: 'Unknown',
      reminderKind,
      userId,
      shouldFire: false,
      reason: 'Tracker not found',
    };
  }

  // Check if tracker is archived
  if (tracker.archived_at) {
    return {
      reminderId,
      trackerId,
      trackerName: tracker.name,
      reminderKind,
      userId,
      shouldFire: false,
      reason: 'Tracker is archived',
    };
  }

  // Check schedule
  if (!shouldFireBySchedule(schedule)) {
    return {
      reminderId,
      trackerId,
      trackerName: tracker.name,
      reminderKind,
      userId,
      shouldFire: false,
      reason: 'Not within scheduled time',
    };
  }

  const today = new Date().toISOString().split('T')[0];

  // Check entry existence
  let entry;
  try {
    entry = await getEntryByDate(trackerId, today);
  } catch (err) {
    // Entry doesn't exist, which is fine
    entry = null;
  }

  if (reminderKind === 'entry_prompt') {
    // Entry prompt: fire only if entry doesn't exist
    if (entry) {
      return {
        reminderId,
        trackerId,
        trackerName: tracker.name,
        reminderKind,
        userId,
        shouldFire: false,
        reason: 'Entry already exists',
      };
    }
  } else if (reminderKind === 'reflection') {
    // Reflection: fire only if entry exists but has no notes
    if (!entry) {
      return {
        reminderId,
        trackerId,
        trackerName: tracker.name,
        reminderKind,
        userId,
        shouldFire: false,
        reason: 'Entry does not exist',
      };
    }

    if (entry.notes && entry.notes.trim() !== '') {
      return {
        reminderId,
        trackerId,
        trackerName: tracker.name,
        reminderKind,
        userId,
        shouldFire: false,
        reason: 'Entry already has notes',
      };
    }
  }

  return {
    reminderId,
    trackerId,
    trackerName: tracker.name,
    reminderKind,
    userId,
    shouldFire: true,
  };
}

/**
 * Process due tracker reminders and emit notification intents
 * 
 * This should be called by a background job (cron / edge function)
 */
export async function processDueTrackerReminders(): Promise<{
  processed: number;
  fired: number;
  skipped: number;
  errors: string[];
}> {
  const stats = {
    processed: 0,
    fired: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get due tracker reminders from database
    const { data: dueReminders, error } = await supabase.rpc('get_due_tracker_reminders');

    if (error) {
      throw new Error(`Failed to fetch due reminders: ${error.message}`);
    }

    if (!dueReminders || dueReminders.length === 0) {
      return stats;
    }

    // Track reminders per user (max 3 per day)
    const userReminderCounts = new Map<string, number>();
    const today = new Date().toISOString().split('T')[0];

    for (const reminder of dueReminders) {
      stats.processed++;

      try {
        const userId = reminder.owner_user_id;
        const count = userReminderCounts.get(userId) || 0;

        // Max 3 reminders per user per day
        if (count >= 3) {
          stats.skipped++;
          continue;
        }

        // Evaluate reminder
        const evaluation = await evaluateTrackerReminder(
          reminder.reminder_id,
          reminder.tracker_id,
          reminder.reminder_kind,
          userId,
          reminder.schedule
        );

        if (!evaluation.shouldFire) {
          stats.skipped++;
          continue;
        }

        // Emit notification intent
        const title = evaluation.reminderKind === 'entry_prompt'
          ? `Log today's ${evaluation.trackerName}?`
          : `Add a note to ${evaluation.trackerName}?`;

        const body = evaluation.reminderKind === 'entry_prompt'
          ? `Want to add an entry for today?`
          : `Anything you noticed today?`;

        await emitNotificationIntent({
          userId,
          feature: 'tracker',
          signalType: 'reminder',
          title,
          body,
          sourceType: 'tracker',
          sourceId: evaluation.trackerId,
          actionUrl: `/tracker-studio/tracker/${evaluation.trackerId}`,
        });

        // Mark reminder as sent
        await supabase.rpc('mark_reminder_sent', {
          p_reminder_id: reminder.reminder_id,
        });

        userReminderCounts.set(userId, count + 1);
        stats.fired++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        stats.errors.push(`Reminder ${reminder.reminder_id}: ${errorMsg}`);
        console.error(`[trackerReminderResolver] Error processing reminder:`, err);
      }
    }

    return stats;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    stats.errors.push(`Failed to process reminders: ${errorMsg}`);
    throw err;
  }
}
