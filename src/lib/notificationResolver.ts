/**
 * Notification Resolver
 * 
 * Core engine that resolves notification intents into actual notifications.
 * This is the source of truth for whether a notification should be created.
 * 
 * Philosophy: Features emit intents, users control delivery, resolver decides.
 */

import {
  getNotificationPreferences,
  createNotification,
} from './notifications';
import type { NotificationPreferences } from './notificationTypes';
import type { NotificationFeature, NotificationSignalType } from './notificationCapabilities';

export interface NotificationIntent {
  userId: string;
  feature: NotificationFeature;
  signalType: NotificationSignalType;
  title: string;
  body: string;
  sourceType?: 'project' | 'event' | 'task' | 'system' | 'alignment' | 'goal' | 'habit' | 'tracker';
  sourceId?: string;
  actionUrl?: string;
}

export interface NotificationResolution {
  shouldCreate: boolean;
  shouldDeliverInApp: boolean;
  shouldDeliverPush: boolean;
  reason?: string;
}

/**
 * Resolve a notification intent against user preferences.
 * 
 * This is the single source of truth for notification creation.
 * Returns whether notification should be created and via which channels.
 * 
 * If resolution fails (user disabled), intent is silently ignored.
 * This is expected behavior, not an error.
 */
export async function resolveNotificationIntent(
  intent: NotificationIntent
): Promise<NotificationResolution> {
  // Get user preferences (source of truth)
  const preferences = await getNotificationPreferences(intent.userId);

  // If no preferences exist, default to disabled (opt-in model)
  if (!preferences) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: 'No preferences found - notifications disabled by default',
    };
  }

  // Global master switch
  if (!preferences.notifications_enabled) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: 'Notifications disabled globally',
    };
  }

  // Do Not Disturb mode
  if (preferences.do_not_disturb) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: 'Do Not Disturb mode active',
    };
  }

  // Map feature to preference category
  const categoryKey = getCategoryPreferenceKey(intent.feature);
  if (!categoryKey) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: `Unknown feature category: ${intent.feature}`,
    };
  }

  // Check feature category permission
  const categoryEnabled = preferences[categoryKey];
  if (!categoryEnabled) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: `Category ${intent.feature} disabled`,
    };
  }

  // Determine delivery channels
  const inAppEnabled = categoryEnabled; // If category is enabled, in-app is enabled
  const pushEnabled = preferences.push_enabled && preferences[`${categoryKey}_push` as keyof NotificationPreferences] === true;

  // If neither channel is enabled, don't create notification
  if (!inAppEnabled && !pushEnabled) {
    return {
      shouldCreate: false,
      shouldDeliverInApp: false,
      shouldDeliverPush: false,
      reason: `Category ${intent.feature} enabled but no delivery channels active`,
    };
  }

  // Resolution: Create notification
  return {
    shouldCreate: true,
    shouldDeliverInApp: inAppEnabled,
    shouldDeliverPush: pushEnabled,
  };
}

/**
 * Map notification feature to preference category key
 */
function getCategoryPreferenceKey(feature: NotificationFeature): keyof NotificationPreferences | null {
  const mapping: Record<NotificationFeature, keyof NotificationPreferences> = {
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

/**
 * Create notification from resolved intent.
 * 
 * This should only be called after resolveNotificationIntent returns shouldCreate: true.
 * The resolver ensures user preferences are respected.
 */
export async function createNotificationFromIntent(
  intent: NotificationIntent,
  resolution: NotificationResolution
): Promise<string | null> {
  if (!resolution.shouldCreate) {
    // Silently ignore - this is expected behavior when user has disabled notifications
    return null;
  }

  try {
    // Map feature to notification type
    const notificationType = mapFeatureToNotificationType(intent.feature);

    const notification = await createNotification({
      user_id: intent.userId,
      type: notificationType,
      title: intent.title,
      body: intent.body,
      source_type: intent.sourceType || null,
      source_id: intent.sourceId || null,
      action_url: intent.actionUrl || null,
      is_read: false,
    });

    // TODO: If resolution.shouldDeliverPush is true, trigger push delivery
    // This will be implemented when push provider is integrated

    return notification.id;
  } catch (error) {
    // Log error but don't fail the feature
    console.error('[notificationResolver] Error creating notification:', error);
    return null;
  }
}

/**
 * Map feature to notification type for database storage
 */
function mapFeatureToNotificationType(feature: NotificationFeature): 'system' | 'calendar' | 'guardrails' | 'planner' | 'social' {
  const mapping: Record<NotificationFeature, 'system' | 'calendar' | 'guardrails' | 'planner' | 'social'> = {
    calendar: 'calendar',
    guardrails: 'guardrails',
    planner: 'planner',
    tracker: 'calendar', // Store as calendar type for now
    habit: 'calendar', // Store as calendar type for now
    sleep: 'calendar', // Store as calendar type for now
    routine: 'calendar', // Store as calendar type for now
    social: 'social',
    system: 'system',
  };

  return mapping[feature] || 'system';
}

/**
 * Emit a notification intent (for features to use).
 * 
 * This is the public API for features to request notifications.
 * The resolver will check user preferences and create/deliver accordingly.
 * 
 * Features should call this, not createNotification directly.
 * 
 * Example:
 * ```ts
 * await emitNotificationIntent({
 *   userId: user.id,
 *   feature: 'calendar',
 *   signalType: 'reminder',
 *   title: 'Event starting soon',
 *   body: 'Your meeting starts in 15 minutes',
 *   sourceType: 'event',
 *   sourceId: event.id,
 *   actionUrl: `/calendar/event/${event.id}`,
 * });
 * ```
 */
export async function emitNotificationIntent(intent: NotificationIntent): Promise<string | null> {
  // Resolve intent against user preferences
  const resolution = await resolveNotificationIntent(intent);

  // If resolution says no, silently return (expected behavior)
  if (!resolution.shouldCreate) {
    return null;
  }

  // Create notification from resolved intent
  return createNotificationFromIntent(intent, resolution);
}
