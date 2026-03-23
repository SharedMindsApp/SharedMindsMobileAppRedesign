/**
 * Meal Notification Types
 * 
 * Defines types for meal planner notifications
 */

import type { MealFulfillmentType } from './placesTypes';
import type { MealSlot } from './mealScheduleTypes';

export type MealNotificationType =
  | 'meal_upcoming'
  | 'meal_cook_start'
  | 'meal_check_in'
  | 'meal_missed';

export interface MealNotificationPayload {
  space_id: string;
  date: string;
  meal_slot_id: string;
  meal_name?: string;
  fulfillment_type: MealFulfillmentType;
  recipe_id?: string;
  place_id?: string;
  prepared_meal_id?: string;
}

export interface MealNotificationPreferences {
  enableMealNotifications: boolean;
  upcomingReminderMinutes: number | null; // null = disabled
  enableCookStartPrompt: boolean;
  enableMealCheckIn: boolean;
  enableMissedMealPrompt: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

export interface MealNotificationScheduleInput {
  date: string; // ISO date string
  mealSlot: MealSlot;
  assignment: {
    fulfillment_type: MealFulfillmentType;
    recipe_id?: string | null;
    prepared_meal_id?: string | null;
    place_id?: string | null;
    meal_name?: string;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
  };
  userId: string;
  spaceId: string;
  preferences: MealNotificationPreferences;
}

export interface ScheduledMealNotification {
  notificationId: string | null;
  type: MealNotificationType;
  scheduledTime: Date;
  payload: MealNotificationPayload;
}

/**
 * Default meal notification preferences
 */
export const DEFAULT_MEAL_NOTIFICATION_PREFERENCES: MealNotificationPreferences = {
  enableMealNotifications: true,
  upcomingReminderMinutes: 30, // 30 minutes before meal
  enableCookStartPrompt: true,
  enableMealCheckIn: true,
  enableMissedMealPrompt: false, // Opt-in only
  quietHours: undefined, // No quiet hours by default
};

/**
 * Check if a time is within quiet hours
 */
export function isQuietHours(time: Date, quietHours?: { start: string; end: string }): boolean {
  if (!quietHours) return false;

  const hour = time.getHours();
  const minute = time.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const [startHour, startMinute] = quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = quietHours.end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Handle quiet hours that span midnight
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get meal notification type label
 */
export function getMealNotificationTypeLabel(type: MealNotificationType): string {
  const labels: Record<MealNotificationType, string> = {
    meal_upcoming: 'Meal Upcoming',
    meal_cook_start: 'Time to Cook',
    meal_check_in: 'Meal Check-In',
    meal_missed: 'Meal Missed',
  };
  return labels[type] || type;
}
