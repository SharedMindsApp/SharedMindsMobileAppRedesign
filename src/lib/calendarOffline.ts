/**
 * Phase 4B: Calendar Service with Offline Support
 * 
 * Wrapper around calendar service that queues actions when offline.
 */

import { createEvent as createEventOriginal, CreateEventData, CalendarEvent } from './calendar';
import { executeOrQueue } from './offlineUtils';

/**
 * Create a calendar event, queueing if offline
 */
export async function createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
  return await executeOrQueue(
    'create_calendar_event',
    eventData as Record<string, unknown>,
    () => createEventOriginal(eventData)
  );
}



