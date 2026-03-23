/**
 * Meal Notification Integration
 * 
 * Integrates meal slot assignments with the notification scheduler.
 * Called when meal assignments are created, updated, or deleted.
 */

import { scheduleMealNotifications, cancelMealNotifications } from './mealNotificationScheduler';
import { getMealNotificationPreferences } from './mealNotificationService';
import type { MealSlotAssignment } from './placesTypes';
import type { MealSlot } from './mealScheduleTypes';
import { getMealSlotAssignments } from './placesService';
import { getAllSlotsForDay } from './mealScheduleTypes';
import type { MealSchedule } from './mealScheduleTypes';

/**
 * Schedule notifications for a meal slot assignment
 * 
 * Called when:
 * - A meal is assigned to a slot
 * - A meal assignment is updated
 * - Weekly preferences are applied
 */
export async function scheduleNotificationsForAssignment(
  spaceId: string,
  date: string,
  mealSlot: MealSlot,
  assignment: MealSlotAssignment,
  userId: string
): Promise<void> {
  // Get user's meal notification preferences
  const preferences = await getMealNotificationPreferences(userId);

  // Get meal details based on fulfillment type
  let mealName: string | undefined;
  let prepTime: number | null = null;
  let cookTime: number | null = null;

  if (assignment.fulfillment_type === 'recipe' && assignment.recipe) {
    mealName = assignment.recipe.name;
    prepTime = assignment.recipe.prep_time || null;
    cookTime = assignment.recipe.cook_time || null;
  } else if (assignment.fulfillment_type === 'prepared_meal' && assignment.prepared_meal) {
    mealName = assignment.prepared_meal.recipe_name;
    // Meal prep typically needs reheating time (estimate 10-15 min)
    prepTime = 0;
    cookTime = 15;
  } else if (assignment.fulfillment_type === 'eat_out' && assignment.place) {
    mealName = assignment.place.name;
    if (assignment.place_order) {
      mealName = `${assignment.place_order.name} from ${assignment.place.name}`;
    }
  } else if (assignment.fulfillment_type === 'freeform') {
    mealName = assignment.freeform_label || undefined;
  }

  // Schedule notifications
  await scheduleMealNotifications({
    date,
    mealSlot,
    assignment: {
      fulfillment_type: assignment.fulfillment_type,
      recipe_id: assignment.recipe_id || null,
      prepared_meal_id: assignment.prepared_meal_id || null,
      place_id: assignment.place_id || null,
      meal_name: mealName,
      prep_time_minutes: prepTime,
      cook_time_minutes: cookTime,
    },
    userId,
    spaceId,
    preferences,
  });
}

/**
 * Cancel notifications for a meal slot
 * 
 * Called when:
 * - A meal assignment is removed
 * - A meal slot is changed to fasting
 * - A meal assignment is changed (cancel old, schedule new)
 */
export async function cancelNotificationsForSlot(
  spaceId: string,
  date: string,
  mealSlotId: string
): Promise<void> {
  await cancelMealNotifications(spaceId, date, mealSlotId);
}

/**
 * Schedule notifications for all meal assignments in a week
 * 
 * Called when:
 * - Week view is loaded
 * - Weekly preferences are applied
 * - Meal schedule changes
 */
export async function scheduleNotificationsForWeek(
  spaceId: string,
  weekStartDate: string,
  mealSchedule: MealSchedule,
  userId: string
): Promise<void> {
  // Get all meal slot assignments for the week
  const assignments = await getMealSlotAssignments(spaceId, weekStartDate);

  // Get user preferences once
  const preferences = await getMealNotificationPreferences(userId);

  // Schedule notifications for each assignment
  for (const assignment of assignments) {
    // Find the meal slot
    const daySchedule = mealSchedule.schedules.find(s => s.dayOfWeek === assignment.day_of_week);
    if (!daySchedule || !daySchedule.enabled) {
      continue;
    }

    const mealSlot = daySchedule.slots.find(s => s.id === assignment.meal_slot_id);
    if (!mealSlot || mealSlot.type === 'fast') {
      continue;
    }

    // Calculate date for this day
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + assignment.day_of_week);
    const dateStr = date.toISOString().split('T')[0];

    // Schedule notifications
    await scheduleNotificationsForAssignment(
      spaceId,
      dateStr,
      mealSlot,
      assignment,
      userId
    );
  }
}
