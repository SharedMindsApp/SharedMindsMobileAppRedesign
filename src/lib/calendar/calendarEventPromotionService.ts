/**
 * Calendar Event Promotion Service
 * 
 * Phase 7.0: Promotes personal calendar events (calendar_events) to context events (context_events)
 * to enable distribution via the existing distribution system.
 * 
 * Core Principle: Distribution applies ONLY to context_events.
 * Personal calendar events remain private until explicitly promoted.
 * 
 * Promotion is one-way (personal → context).
 */

import { supabase } from '../supabase';
import { createContextEvent } from '../contextSovereign/contextEventsService';
import type { CreateContextEventInput, ContextEventType, EventTimeScope } from '../contextSovereign/types';

/**
 * Convert profiles.id to auth.users.id
 */
async function getUserIdFromProfileId(profileId: string): Promise<string | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();
  
  if (error || !profile) {
    return null;
  }
  
  return profile.id;
}

/**
 * Get or create a personal context for a user
 * 
 * For Phase 7.0 MVP, we create a personal context for the user if it doesn't exist.
 * Future phases may support project-linked contexts.
 */
async function getOrCreatePersonalContext(userId: string): Promise<string> {
  // Try to find existing personal context for user
  const { data: existingContext, error: queryError } = await supabase
    .from('contexts')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('type', 'personal')
    .maybeSingle();
  
  if (queryError && queryError.code !== 'PGRST116') {
    throw new Error(`Error querying personal context: ${queryError.message}`);
  }
  
  if (existingContext) {
    return existingContext.id;
  }
  
  // Create personal context
  const { data: newContext, error: createError } = await supabase
    .from('contexts')
    .insert({
      type: 'personal',
      owner_user_id: userId,
      name: 'Personal Calendar',
      description: 'Personal calendar events',
      metadata: {},
    })
    .select('id')
    .single();
  
  if (createError || !newContext) {
    throw new Error(`Error creating personal context: ${createError?.message || 'Unknown error'}`);
  }
  
  return newContext.id;
}

/**
 * Map calendar_events.event_type to context_events.event_type
 */
function mapEventType(calendarEventType: string | null): ContextEventType {
  // calendar_events.event_type is text, context_events.event_type is enum
  // Default to 'personal' if not mappable
  const typeMap: Record<string, ContextEventType> = {
    'event': 'personal',
    'meeting': 'meeting',
    'reminder': 'reminder',
    'deadline': 'deadline',
    'travel': 'travel',
    'social': 'social',
    'block': 'block',
    'milestone': 'milestone',
  };
  
  return typeMap[calendarEventType || 'event'] || 'personal';
}

/**
 * Map calendar_events.all_day to context_events.time_scope
 */
function mapTimeScope(allDay: boolean): EventTimeScope {
  return allDay ? 'all_day' : 'timed';
}

export interface PromoteCalendarEventToContextEventInput {
  calendarEventId: string;
  projectId?: string;  // Optional: for future project-linked contexts
  trackId?: string;    // Optional: for future track-linked contexts
  initiatedByUserId: string; // auth.users.id of user initiating promotion
}

/**
 * Promote a calendar_event to a context_event
 * 
 * Creates a context_event derived from the calendar_event and links them via source_calendar_event_id.
 * 
 * Idempotent: If a context_event already exists for this calendar_event, returns the existing one.
 * 
 * @returns The context_event ID
 */
export async function promoteCalendarEventToContextEvent(
  input: PromoteCalendarEventToContextEventInput
): Promise<string> {
  const { calendarEventId, initiatedByUserId } = input;
  
  // Check if promotion already exists (idempotency)
  const { data: existingContextEvent, error: existingError } = await supabase
    .from('context_events')
    .select('id')
    .eq('source_calendar_event_id', calendarEventId)
    .maybeSingle();
  
  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking for existing promotion: ${existingError.message}`);
  }
  
  if (existingContextEvent) {
    return existingContextEvent.id;
  }
  
  // Get the calendar event
  const { data: calendarEvent, error: calendarEventError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', calendarEventId)
    .maybeSingle();
  
  if (calendarEventError || !calendarEvent) {
    throw new Error(`Calendar event not found: ${calendarEventId}`);
  }
  
  // Verify user owns the calendar event (calendar_events.user_id is auth.users.id)
  if (calendarEvent.user_id !== initiatedByUserId) {
    throw new Error('Only the calendar event owner can promote the event');
  }
  
  // Convert calendar_events.created_by (profiles.id) to auth.users.id for context_events.created_by
  let createdByUserId = initiatedByUserId; // Default to initiator
  if (calendarEvent.created_by) {
    const convertedUserId = await getUserIdFromProfileId(calendarEvent.created_by);
    if (convertedUserId) {
      createdByUserId = convertedUserId;
    }
  }
  
  // Get or create personal context for the user
  // For Phase 7.0 MVP, we use personal contexts
  // Future phases may support project-linked contexts via projectId
  const contextId = await getOrCreatePersonalContext(initiatedByUserId);
  
  // Map calendar_event fields to context_event
  const contextEventInput: CreateContextEventInput = {
    context_id: contextId,
    created_by: createdByUserId,
    event_type: mapEventType(calendarEvent.event_type),
    time_scope: mapTimeScope(calendarEvent.all_day || false),
    event_scope: 'item', // Promoted events are always items (not containers)
    title: calendarEvent.title,
    description: calendarEvent.description || '',
    location: '', // calendar_events doesn't have location, leave empty
    start_at: calendarEvent.start_at,
    end_at: calendarEvent.end_at || calendarEvent.start_at, // Fallback to start_at if end_at is null
    timezone: 'UTC', // Default timezone (calendar_events doesn't store timezone explicitly)
    metadata: {}, // Empty metadata for promoted events
  };
  
  // Create context event (but we need to add source_calendar_event_id after creation)
  // Since createContextEvent doesn't support source_calendar_event_id, we'll insert directly
  const { data: contextEvent, error: createError } = await supabase
    .from('context_events')
    .insert({
      context_id: contextEventInput.context_id,
      created_by: contextEventInput.created_by,
      event_type: contextEventInput.event_type,
      time_scope: contextEventInput.time_scope,
      event_scope: contextEventInput.event_scope,
      title: contextEventInput.title,
      description: contextEventInput.description,
      location: contextEventInput.location,
      start_at: contextEventInput.start_at,
      end_at: contextEventInput.end_at,
      timezone: contextEventInput.timezone,
      metadata: contextEventInput.metadata,
      source_calendar_event_id: calendarEventId, // Link to source calendar event
    })
    .select('id')
    .single();
  
  if (createError || !contextEvent) {
    throw new Error(`Error creating context event: ${createError?.message || 'Unknown error'}`);
  }
  
  return contextEvent.id;
}