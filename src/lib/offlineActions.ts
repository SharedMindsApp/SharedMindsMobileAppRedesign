/**
 * Phase 4B: Offline Action Handlers
 * 
 * Registers handlers for queueable actions.
 * These handlers execute the actual API calls when syncing.
 */

import { registerActionHandler } from './offlineSync';
import { supabase } from './supabase';
import { createEvent } from './calendar';
import { createTodo } from './todosService';
import { createMeal } from './mealLibrary';
import { createCustomMeal } from './mealPlanner';
import { createContainerEvent } from './contextSovereign/contextEventsService';
import { createActivity } from './activities/activityService';
import { createGoalActivity } from './goals/goalsService';
import { createNutritionLog as createNutritionLogOriginal } from './selfCareService';
import { 
  createPersonalCalendarEvent as createPersonalCalendarEventOriginal,
  updatePersonalCalendarEvent as updatePersonalCalendarEventOriginal
} from './personalSpaces/calendarService';

// Register handler for calendar events
registerActionHandler('create_calendar_event', async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  return await createEvent(payload as any);
});

// Phase 7A: Register handler for personal calendar events
registerActionHandler('create_personal_calendar_event', async (payload) => {
  const { userId, ...input } = payload as any;
  return await createPersonalCalendarEventOriginal(userId, input);
});

// Phase 7A: Register handler for personal calendar event updates
registerActionHandler('update_personal_calendar_event', async (payload) => {
  const { userId, eventId, ...input } = payload as any;
  return await updatePersonalCalendarEventOriginal(userId, eventId, input);
});

// Register handler for todos
registerActionHandler('create_todo', async (payload) => {
  return await createTodo(payload as any);
});

// Register handler for meals (simple)
registerActionHandler('create_meal', async (payload) => {
  return await createMeal(payload as any);
});

// Register handler for custom meals
registerActionHandler('create_custom_meal', async (payload) => {
  const { name, mealType, householdId, createdBy, options } = payload as any;
  return await createCustomMeal(name, mealType, householdId, createdBy, options);
});

// Register handler for container events
registerActionHandler('create_container_event', async (payload) => {
  const result = await createContainerEvent(payload as any);
  if (!result.success) {
    throw new Error(result.error || 'Failed to create container event');
  }
  return result.data;
});

// Register handler for activities
registerActionHandler('create_activity', async (payload) => {
  const { userId, input } = payload as any;
  return await createActivity(userId, input);
});

// Register handler for goals
registerActionHandler('create_goal', async (payload) => {
  const { userId, input } = payload as any;
  return await createGoalActivity(userId, input);
});

// Register handler for nutrition logs
registerActionHandler('create_nutrition_log', async (payload) => {
  return await createNutritionLogOriginal(payload as any);
});

