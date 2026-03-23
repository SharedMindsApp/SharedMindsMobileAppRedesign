/**
 * Notification Helpers
 * 
 * Utility functions for features to check notification capabilities
 * and provide contextual messaging to users.
 */

import { getNotificationPreferences } from './notifications';
import type { NotificationFeature, NotificationSignalType } from './notificationCapabilities';

/**
 * Check if a specific notification capability is enabled for a user.
 * 
 * This is useful for features to show contextual messaging like:
 * "You can receive reminders for this tracker — notification delivery is controlled in Settings."
 * 
 * Returns null if preferences don't exist (opt-in model).
 */
export async function isNotificationCapabilityEnabled(
  userId: string,
  feature: NotificationFeature,
  signalType?: NotificationSignalType
): Promise<boolean | null> {
  const preferences = await getNotificationPreferences(userId);

  if (!preferences) {
    return null; // No preferences = opt-in not completed
  }

  if (!preferences.notifications_enabled) {
    return false;
  }

  if (preferences.do_not_disturb) {
    return false;
  }

  // Map feature to preference category
  const categoryKey = getCategoryKey(feature);
  if (!categoryKey) {
    return false;
  }

  return preferences[categoryKey] === true;
}

/**
 * Get a user-friendly message about notification capabilities.
 * 
 * Use this in feature settings to explain notification options.
 */
export function getNotificationCapabilityMessage(
  feature: NotificationFeature,
  signalType: NotificationSignalType
): string {
  const messages: Record<string, string> = {
    'tracker.reminder': 'You can receive reminders to log tracker entries. Notification delivery is controlled in Settings → Notifications.',
    'tracker.missed_action': 'You can receive notifications when tracker entries are missed. Notification delivery is controlled in Settings → Notifications.',
    'habit.reminder': 'You can receive reminders to complete habits. Notification delivery is controlled in Settings → Notifications.',
    'habit.streak_broken': 'You can receive notifications when habit streaks are broken. Notification delivery is controlled in Settings → Notifications.',
    'sleep.reminder': 'You can receive bedtime and wake-up reminders. Notification delivery is controlled in Settings → Notifications.',
    'routine.reminder': 'You can receive reminders for routine start and completion. Notification delivery is controlled in Settings → Notifications.',
    'calendar.reminder': 'You can receive reminders for upcoming events. Notification delivery is controlled in Settings → Notifications.',
    'guardrails.update': 'You can receive notifications for project updates. Notification delivery is controlled in Settings → Notifications.',
    'planner.reminder': 'You can receive reminders for tasks and planning activities. Notification delivery is controlled in Settings → Notifications.',
  };

  const key = `${feature}.${signalType}`;
  return messages[key] || 'Notification delivery is controlled in Settings → Notifications.';
}

/**
 * Map feature to preference category key
 */
function getCategoryKey(feature: NotificationFeature): keyof import('./notificationTypes').NotificationPreferences | null {
  const mapping: Record<NotificationFeature, keyof import('./notificationTypes').NotificationPreferences> = {
    calendar: 'calendar_reminders',
    guardrails: 'guardrails_updates',
    planner: 'planner_alerts',
    tracker: 'tracker_reminders',
    habit: 'habit_reminders',
    sleep: 'sleep_reminders',
    routine: 'routine_reminders',
    social: 'system_messages',
    system: 'system_messages',
  };

  return mapping[feature] || null;
}
