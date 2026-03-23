/**
 * Phase 7A: Personal Calendar Service with Offline Support
 * 
 * Wrapper around personal calendar service that queues actions when offline.
 */

import { 
  createPersonalCalendarEvent as createPersonalCalendarEventOriginal,
  updatePersonalCalendarEvent as updatePersonalCalendarEventOriginal,
  type CreatePersonalEventInput,
  type UpdatePersonalEventInput,
  type PersonalCalendarEvent
} from './calendarService';
import { executeOrQueue } from '../offlineUtils';

/**
 * Create a personal calendar event, queueing if offline
 */
export async function createPersonalCalendarEvent(
  userId: string,
  input: CreatePersonalEventInput
): Promise<PersonalCalendarEvent> {
  return await executeOrQueue(
    'create_personal_calendar_event',
    { userId, ...input } as Record<string, unknown>,
    () => createPersonalCalendarEventOriginal(userId, input)
  );
}

/**
 * Update a personal calendar event, queueing if offline
 */
export async function updatePersonalCalendarEvent(
  userId: string,
  eventId: string,
  input: UpdatePersonalEventInput
): Promise<PersonalCalendarEvent> {
  return await executeOrQueue(
    'update_personal_calendar_event',
    { userId, eventId, ...input } as Record<string, unknown>,
    () => updatePersonalCalendarEventOriginal(userId, eventId, input)
  );
}



