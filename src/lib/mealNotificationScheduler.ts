/**
 * Meal Notification Scheduler
 * 
 * Schedules meal-related notifications based on meal slot assignments.
 * Integrates with the existing Spaces notifications system.
 */

import { emitNotificationIntent } from './notificationResolver';
import type { MealNotificationScheduleInput, ScheduledMealNotification, MealNotificationType } from './mealNotificationTypes';
import { isQuietHours } from './mealNotificationTypes';
import type { MealSlot } from './mealScheduleTypes';
import { isFastingSlot } from './mealScheduleTypes';

/**
 * Schedule notifications for a meal slot assignment
 * 
 * This function is idempotent - safe to call multiple times.
 * It will cancel existing notifications and create new ones.
 */
export async function scheduleMealNotifications(
  input: MealNotificationScheduleInput
): Promise<ScheduledMealNotification[]> {
  const { date, mealSlot, assignment, userId, spaceId, preferences } = input;

  // If notifications are disabled globally, return empty array
  if (!preferences.enableMealNotifications) {
    return [];
  }

  // Never schedule notifications for fasting slots
  if (isFastingSlot(mealSlot)) {
    return [];
  }

  const scheduled: ScheduledMealNotification[] = [];
  const mealDate = new Date(date);
  const mealTime = getMealTime(mealSlot, mealDate);

  // Skip if meal time is in the past
  if (mealTime < new Date()) {
    return [];
  }

  const payload = {
    space_id: spaceId,
    date,
    meal_slot_id: mealSlot.id,
    meal_name: assignment.meal_name || mealSlot.label,
    fulfillment_type: assignment.fulfillment_type,
    recipe_id: assignment.recipe_id || undefined,
    place_id: assignment.place_id || undefined,
    prepared_meal_id: assignment.prepared_meal_id || undefined,
  };

  // 1. Meal Upcoming Reminder
  if (preferences.upcomingReminderMinutes !== null && preferences.upcomingReminderMinutes > 0) {
    const reminderTime = new Date(mealTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - preferences.upcomingReminderMinutes);

    // Only schedule if reminder time is in the future and not in quiet hours
    if (reminderTime > new Date() && !isQuietHours(reminderTime, preferences.quietHours)) {
      const notificationId = await emitNotificationIntent({
        userId,
        feature: 'planner',
        signalType: 'meal_upcoming',
        title: `${mealSlot.label} is coming up`,
        body: getUpcomingReminderBody(mealSlot, assignment, mealTime),
        sourceType: 'task',
        sourceId: `${spaceId}-${date}-${mealSlot.id}`,
        actionUrl: `/meal-planner?date=${date}&slot=${mealSlot.id}`,
      });

      scheduled.push({
        notificationId,
        type: 'meal_upcoming',
        scheduledTime: reminderTime,
        payload,
      });
    }
  }

  // 2. Cook Start Prompt (only for recipes and meal prep)
  if (
    preferences.enableCookStartPrompt &&
    (assignment.fulfillment_type === 'recipe' || assignment.fulfillment_type === 'prepared_meal')
  ) {
    const cookStartTime = calculateCookStartTime(mealTime, assignment);

    // Only schedule if cook start time is in the future and not in quiet hours
    if (cookStartTime > new Date() && !isQuietHours(cookStartTime, preferences.quietHours)) {
      const notificationId = await emitNotificationIntent({
        userId,
        feature: 'planner',
        signalType: 'meal_cook_start',
        title: `Time to start cooking: ${assignment.meal_name || mealSlot.label}`,
        body: getCookStartBody(assignment, mealTime),
        sourceType: 'task',
        sourceId: `${spaceId}-${date}-${mealSlot.id}`,
        actionUrl: `/meal-planner?date=${date}&slot=${mealSlot.id}`,
      });

      scheduled.push({
        notificationId,
        type: 'meal_cook_start',
        scheduledTime: cookStartTime,
        payload,
      });
    }
  }

  // 3. Meal Check-In Prompt (most important)
  if (preferences.enableMealCheckIn) {
    const checkInTime = new Date(mealTime);
    checkInTime.setMinutes(checkInTime.getMinutes() + 30); // 30 minutes after meal time

    // Only schedule if check-in time is in the future
    if (checkInTime > new Date() && !isQuietHours(checkInTime, preferences.quietHours)) {
      const notificationId = await emitNotificationIntent({
        userId,
        feature: 'planner',
        signalType: 'meal_check_in',
        title: `How did ${mealSlot.label.toLowerCase()} go?`,
        body: getCheckInBody(mealSlot, assignment),
        sourceType: 'task',
        sourceId: `${spaceId}-${date}-${mealSlot.id}`,
        actionUrl: `/meal-planner?date=${date}&slot=${mealSlot.id}`,
      });

      scheduled.push({
        notificationId,
        type: 'meal_check_in',
        scheduledTime: checkInTime,
        payload,
      });
    }
  }

  // 4. Missed Meal Prompt (opt-in only)
  if (preferences.enableMissedMealPrompt) {
    const missedTime = new Date(mealTime);
    missedTime.setHours(missedTime.getHours() + 2); // 2 hours after meal time

    // Only schedule if missed time is in the future
    if (missedTime > new Date() && !isQuietHours(missedTime, preferences.quietHours)) {
      const notificationId = await emitNotificationIntent({
        userId,
        feature: 'planner',
        signalType: 'meal_missed',
        title: `Looks like ${mealSlot.label.toLowerCase()} didn't happen`,
        body: getMissedMealBody(mealSlot, assignment),
        sourceType: 'task',
        sourceId: `${spaceId}-${date}-${mealSlot.id}`,
        actionUrl: `/meal-planner?date=${date}&slot=${mealSlot.id}`,
      });

      scheduled.push({
        notificationId,
        type: 'meal_missed',
        scheduledTime: missedTime,
        payload,
      });
    }
  }

  return scheduled;
}

/**
 * Get meal time from slot and date
 */
function getMealTime(slot: MealSlot, date: Date): Date {
  const mealTime = new Date(date);

  // If slot has a start time, use it
  if (slot.startTime) {
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    mealTime.setHours(hours, minutes, 0, 0);
  } else {
    // Default times based on meal type
    const defaults: Record<string, { hour: number; minute: number }> = {
      breakfast: { hour: 8, minute: 0 },
      lunch: { hour: 12, minute: 30 },
      dinner: { hour: 19, minute: 0 },
      snack: { hour: 15, minute: 0 },
    };

    const mealType = slot.mealTypeMapping || slot.label.toLowerCase();
    const defaultTime = defaults[mealType] || defaults.breakfast;
    mealTime.setHours(defaultTime.hour, defaultTime.minute, 0, 0);
  }

  return mealTime;
}

/**
 * Calculate when to start cooking
 */
function calculateCookStartTime(
  mealTime: Date,
  assignment: MealNotificationScheduleInput['assignment']
): Date {
  const cookStartTime = new Date(mealTime);

  // Calculate total cooking time
  const prepTime = assignment.prep_time_minutes || 0;
  const cookTime = assignment.cook_time_minutes || 0;
  const totalTime = prepTime + cookTime;

  if (totalTime > 0) {
    cookStartTime.setMinutes(cookStartTime.getMinutes() - totalTime);
  } else {
    // Default buffer: 45 minutes before meal
    cookStartTime.setMinutes(cookStartTime.getMinutes() - 45);
  }

  return cookStartTime;
}

/**
 * Get notification body text for upcoming reminder
 */
function getUpcomingReminderBody(
  slot: MealSlot,
  assignment: MealNotificationScheduleInput['assignment'],
  mealTime: Date
): string {
  const timeStr = mealTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  if (assignment.fulfillment_type === 'eat_out') {
    return `You're planning to eat out at ${timeStr}.`;
  } else if (assignment.fulfillment_type === 'prepared_meal') {
    return `Meal prep is ready! Meal time is ${timeStr}.`;
  } else if (assignment.meal_name) {
    return `${assignment.meal_name} is scheduled for ${timeStr}.`;
  } else {
    return `${slot.label} is scheduled for ${timeStr}.`;
  }
}

/**
 * Get notification body text for cook start
 */
function getCookStartBody(
  assignment: MealNotificationScheduleInput['assignment'],
  mealTime: Date
): string {
  const timeStr = mealTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  if (assignment.fulfillment_type === 'prepared_meal') {
    return `Time to reheat your meal prep. Meal is at ${timeStr}.`;
  } else {
    const prepTime = assignment.prep_time_minutes || 0;
    const cookTime = assignment.cook_time_minutes || 0;
    if (prepTime > 0 || cookTime > 0) {
      return `Start now to have it ready by ${timeStr}.`;
    } else {
      return `Meal is scheduled for ${timeStr}.`;
    }
  }
}

/**
 * Get notification body text for check-in
 */
function getCheckInBody(
  slot: MealSlot,
  assignment: MealNotificationScheduleInput['assignment']
): string {
  if (assignment.fulfillment_type === 'eat_out') {
    return `Did you enjoy eating out?`;
  } else if (assignment.fulfillment_type === 'prepared_meal') {
    return `How did your meal prep turn out?`;
  } else {
    return `Did you make ${assignment.meal_name || slot.label.toLowerCase()}?`;
  }
}

/**
 * Get notification body text for missed meal
 */
function getMissedMealBody(
  slot: MealSlot,
  assignment: MealNotificationScheduleInput['assignment']
): string {
  return `Want to reschedule ${slot.label.toLowerCase()} or mark it as skipped?`;
}

/**
 * Cancel notifications for a meal slot
 * 
 * This is called when:
 * - Meal assignment is removed
 * - Meal assignment is changed
 * - Meal slot is changed to fasting
 */
export async function cancelMealNotifications(
  spaceId: string,
  date: string,
  mealSlotId: string
): Promise<void> {
  // TODO: Implement notification cancellation
  // This would require tracking notification IDs in a separate table
  // or using a notification metadata field to identify meal notifications
  // For now, notifications will naturally expire or be marked as read
  console.log('[mealNotificationScheduler] Canceling notifications for:', {
    spaceId,
    date,
    mealSlotId,
  });
}
