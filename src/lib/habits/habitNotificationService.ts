/**
 * Habit Notification Service
 * 
 * Creates notifications for habit-related events (scheduled habits, reminders, etc.)
 * Links habits to the notification system.
 */

import { resolveNotificationIntent, createNotificationFromIntent } from '../notificationResolver';
import type { NotificationIntent } from '../notificationResolver';

/**
 * Create a notification for a scheduled habit reminder
 */
export async function createHabitReminderNotification(
  userId: string,
  habitId: string,
  habitTitle: string,
  scheduledTime?: string
): Promise<string | null> {
  const intent: NotificationIntent = {
    userId,
    feature: 'habit',
    signalType: 'reminder',
    title: scheduledTime 
      ? `Time for: ${habitTitle}`
      : `Reminder: ${habitTitle}`,
    body: scheduledTime
      ? `It's time to work on "${habitTitle}"`
      : `Don't forget to complete "${habitTitle}"`,
    sourceType: 'habit',
    sourceId: habitId,
    actionUrl: `/tracker?habit_id=${habitId}`,
  };

  const resolution = await resolveNotificationIntent(intent);
  if (!resolution.shouldCreate) {
    // User has disabled notifications - silently ignore
    return null;
  }

  return createNotificationFromIntent(intent, resolution);
}

/**
 * Create a notification when a habit is missed
 */
export async function createHabitMissedNotification(
  userId: string,
  habitId: string,
  habitTitle: string,
  date: string
): Promise<string | null> {
  const intent: NotificationIntent = {
    userId,
    feature: 'habit',
    signalType: 'missed_action',
    title: `Missed: ${habitTitle}`,
    body: `You didn't complete "${habitTitle}" today. You can still log it if you'd like.`,
    sourceType: 'habit',
    sourceId: habitId,
    actionUrl: `/tracker?habit_id=${habitId}&date=${date}`,
  };

  const resolution = await resolveNotificationIntent(intent);
  if (!resolution.shouldCreate) {
    return null;
  }

  return createNotificationFromIntent(intent, resolution);
}

/**
 * Create a notification for habit scheduling
 */
export async function createHabitScheduledNotification(
  userId: string,
  habitId: string,
  habitTitle: string,
  scheduleInfo: string
): Promise<string | null> {
  const intent: NotificationIntent = {
    userId,
    feature: 'habit',
    signalType: 'reminder',
    title: `Habit scheduled: ${habitTitle}`,
    body: `"${habitTitle}" is now scheduled ${scheduleInfo}. It will appear on your calendar.`,
    sourceType: 'habit',
    sourceId: habitId,
    actionUrl: `/tracker?habit_id=${habitId}`,
  };

  const resolution = await resolveNotificationIntent(intent);
  if (!resolution.shouldCreate) {
    return null;
  }

  return createNotificationFromIntent(intent, resolution);
}
