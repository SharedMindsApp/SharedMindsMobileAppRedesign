/**
 * Meal Notification Service
 * 
 * Service functions for managing meal notification preferences and handling notification actions
 */

import { supabase } from './supabase';
import type { MealNotificationPreferences } from './mealNotificationTypes';
import { DEFAULT_MEAL_NOTIFICATION_PREFERENCES } from './mealNotificationTypes';
import { getNotificationPreferences, updateNotificationPreferences } from './notifications';

/**
 * Get meal notification preferences for a user
 */
export async function getMealNotificationPreferences(userId: string): Promise<MealNotificationPreferences> {
  const prefs = await getNotificationPreferences(userId);
  
  if (!prefs) {
    return DEFAULT_MEAL_NOTIFICATION_PREFERENCES;
  }

  return {
    enableMealNotifications: (prefs as any).meal_notifications_enabled ?? DEFAULT_MEAL_NOTIFICATION_PREFERENCES.enableMealNotifications,
    upcomingReminderMinutes: (prefs as any).meal_upcoming_reminder_minutes ?? DEFAULT_MEAL_NOTIFICATION_PREFERENCES.upcomingReminderMinutes,
    enableCookStartPrompt: (prefs as any).meal_cook_start_enabled ?? DEFAULT_MEAL_NOTIFICATION_PREFERENCES.enableCookStartPrompt,
    enableMealCheckIn: (prefs as any).meal_check_in_enabled ?? DEFAULT_MEAL_NOTIFICATION_PREFERENCES.enableMealCheckIn,
    enableMissedMealPrompt: (prefs as any).meal_missed_enabled ?? DEFAULT_MEAL_NOTIFICATION_PREFERENCES.enableMissedMealPrompt,
    quietHours: (prefs as any).meal_quiet_hours_start && (prefs as any).meal_quiet_hours_end
      ? {
          start: (prefs as any).meal_quiet_hours_start,
          end: (prefs as any).meal_quiet_hours_end,
        }
      : undefined,
  };
}

/**
 * Update meal notification preferences for a user
 */
export async function updateMealNotificationPreferences(
  userId: string,
  preferences: Partial<MealNotificationPreferences>
): Promise<void> {
  const updateData: any = {};

  if (preferences.enableMealNotifications !== undefined) {
    updateData.meal_notifications_enabled = preferences.enableMealNotifications;
  }
  if (preferences.upcomingReminderMinutes !== undefined) {
    updateData.meal_upcoming_reminder_minutes = preferences.upcomingReminderMinutes;
  }
  if (preferences.enableCookStartPrompt !== undefined) {
    updateData.meal_cook_start_enabled = preferences.enableCookStartPrompt;
  }
  if (preferences.enableMealCheckIn !== undefined) {
    updateData.meal_check_in_enabled = preferences.enableMealCheckIn;
  }
  if (preferences.enableMissedMealPrompt !== undefined) {
    updateData.meal_missed_enabled = preferences.enableMissedMealPrompt;
  }
  if (preferences.quietHours !== undefined) {
    if (preferences.quietHours) {
      updateData.meal_quiet_hours_start = preferences.quietHours.start;
      updateData.meal_quiet_hours_end = preferences.quietHours.end;
    } else {
      updateData.meal_quiet_hours_start = null;
      updateData.meal_quiet_hours_end = null;
    }
  }

  await updateNotificationPreferences(userId, updateData);
}

/**
 * Handle meal notification action
 * 
 * Called when user interacts with a meal notification
 */
export async function handleMealNotificationAction(
  action: 'made_it' | 'later' | 'skipped' | 'ate_out',
  spaceId: string,
  date: string,
  mealSlotId: string,
  userId: string
): Promise<void> {
  // TODO: Implement action handling
  // - "made_it": Mark meal as completed
  // - "later": Snooze check-in (30 min default)
  // - "skipped": Mark meal as skipped
  // - "ate_out": Convert to eat_out assignment

  console.log('[mealNotificationService] Handling action:', {
    action,
    spaceId,
    date,
    mealSlotId,
    userId,
  });

  // For now, just mark the notification as read
  // Full implementation would update meal slot assignment status
}
