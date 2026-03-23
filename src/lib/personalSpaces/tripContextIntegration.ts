/**
 * Trip Context Integration Service
 * 
 * Wires Trips into the Context Container + Nested Events architecture.
 * 
 * This is an ENHANCEMENT, not a rewrite:
 * - Every trip can have a container context event
 * - Trip itinerary items become nested context events
 * - Calendar visibility is explicit and permission-driven
 * - Existing behavior remains unchanged unless explicitly used
 * 
 * Safety guarantees:
 * - All operations are idempotent
 * - Failures are logged, not thrown (non-blocking)
 * - No auto-sharing or auto-projection
 * - Backward compatible with existing trips
 */

import { supabase } from '../supabase';
import { createContext } from '../contextSovereign/contextService';
import { createContainerEvent, getContainerEvents } from '../contextSovereign/contextEventsService';
import { createNestedEvent, getNestedEvents } from '../contextSovereign/contextEventsService';
import type { Trip, TripItineraryItem } from '../travelService';
import type { ServiceResponse } from '../contextSovereign/types';

// ============================================================================
// Trip → Context Mapping
// ============================================================================

/**
 * Ensure a trip has a context (lazy creation)
 * 
 * If no context exists, creates one with:
 * - type = 'trip'
 * - name = trip.name
 * - owner = trip.owner_id
 * - linked_trip_id = trip.id
 * 
 * Returns the context_id (or null if creation fails)
 */
export async function ensureTripContext(tripId: string): Promise<ServiceResponse<string>> {
  try {
    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, name, owner_id, context_id')
      .eq('id', tripId)
      .single();
    
    if (tripError || !trip) {
      return { success: false, error: 'Trip not found' };
    }
    
    // If context already exists, return it
    if (trip.context_id) {
      return { success: true, data: trip.context_id };
    }
    
    // Check if context already exists via linked_trip_id
    const { data: existingContext } = await supabase
      .from('contexts')
      .select('id')
      .eq('linked_trip_id', tripId)
      .maybeSingle();
    
    if (existingContext) {
      // Update trip with context_id
      await supabase
        .from('trips')
        .update({ context_id: existingContext.id })
        .eq('id', tripId);
      
      return { success: true, data: existingContext.id };
    }
    
    // Create new context
    const contextResult = await createContext({
      type: 'trip',
      owner_user_id: trip.owner_id,
      name: trip.name,
      description: `Trip: ${trip.name}`,
      linked_trip_id: tripId,
    });
    
    if (!contextResult.success || !contextResult.data) {
      console.warn(`[tripContextIntegration] Failed to create context for trip ${tripId}:`, contextResult.error);
      return { success: false, error: contextResult.error || 'Failed to create context' };
    }
    
    // Update trip with context_id
    const { error: updateError } = await supabase
      .from('trips')
      .update({ context_id: contextResult.data.id })
      .eq('id', tripId);
    
    if (updateError) {
      console.warn(`[tripContextIntegration] Failed to update trip with context_id:`, updateError);
      // Non-fatal: context exists, just not linked
    }
    
    return { success: true, data: contextResult.data.id };
  } catch (err) {
    console.error(`[tripContextIntegration] Error ensuring trip context:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Trip Container Event (Macro Time Block)
// ============================================================================

/**
 * Ensure a trip has a container event (non-blocking)
 * 
 * Creates a container context_event with:
 * - title = trip.name
 * - start_at = trip.start_date (00:00)
 * - end_at = trip.end_date (23:59)
 * - event_scope = 'container'
 * - event_type = 'travel'
 * - time_scope = 'all_day' (if dates are same) or 'timed'
 * 
 * Rules:
 * - Idempotent: if container already exists, does nothing
 * - Non-blocking: failures are logged, not thrown
 */
export async function ensureTripContainerEvent(tripId: string): Promise<ServiceResponse<string>> {
  try {
    // Ensure context exists first
    const contextResult = await ensureTripContext(tripId);
    if (!contextResult.success || !contextResult.data) {
      return contextResult;
    }
    
    const contextId = contextResult.data;
    
    // Get trip with dates
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, name, start_date, end_date')
      .eq('id', tripId)
      .single();
    
    if (tripError || !trip) {
      return { success: false, error: 'Trip not found' };
    }
    
    if (!trip.start_date || !trip.end_date) {
      // Trip doesn't have dates yet - skip container creation
      return { success: false, error: 'Trip must have start_date and end_date' };
    }
    
    // Check if container already exists
    const { data: existingContainers } = await supabase
      .from('context_events')
      .select('id')
      .eq('context_id', contextId)
      .eq('event_scope', 'container')
      .is('parent_context_event_id', null)
      .limit(1);
    
    if (existingContainers && existingContainers.length > 0) {
      return { success: true, data: existingContainers[0].id };
    }
    
    // Get trip owner
    const { data: tripWithOwner } = await supabase
      .from('trips')
      .select('owner_id')
      .eq('id', tripId)
      .single();
    
    if (!tripWithOwner) {
      return { success: false, error: 'Trip owner not found' };
    }
    
    // Create container event
    const startDate = new Date(trip.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(trip.end_date);
    endDate.setHours(23, 59, 59, 999);
    
    const isSameDay = trip.start_date === trip.end_date;
    
    const containerResult = await createContainerEvent({
      context_id: contextId,
      created_by: tripWithOwner.owner_id,
      event_type: 'travel',
      time_scope: isSameDay ? 'all_day' : 'timed',
      title: trip.name,
      description: `Trip: ${trip.name}`,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      timezone: 'UTC',
    });
    
    if (!containerResult.success || !containerResult.data) {
      console.warn(`[tripContextIntegration] Failed to create container event for trip ${tripId}:`, containerResult.error);
      return { success: false, error: containerResult.error || 'Failed to create container event' };
    }
    
    return { success: true, data: containerResult.data.id };
  } catch (err) {
    console.error(`[tripContextIntegration] Error ensuring trip container event:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Trip Itinerary → Nested Context Events
// ============================================================================

/**
 * Sync itinerary item to nested context event
 * 
 * Creates or updates a nested context_event for an itinerary item.
 * 
 * Rules:
 * - Nested events must have a container parent
 * - Editing itinerary updates nested events
 * - Deleting itinerary deletes nested events
 * - Nested events NEVER auto-project to calendars
 */
async function syncItineraryItemToNestedEvent(
  itineraryItem: TripItineraryItem,
  containerEventId: string,
  contextId: string,
  userId: string
): Promise<ServiceResponse<string>> {
  try {
    // Check if nested event already exists (via metadata)
    const { data: existingEvent } = await supabase
      .from('context_events')
      .select('id')
      .eq('parent_context_event_id', containerEventId)
      .eq('event_scope', 'item')
      .eq('metadata->>itinerary_item_id', itineraryItem.id)
      .maybeSingle();
    
    // Build start/end times
    const itemDate = new Date(itineraryItem.date);
    let startAt: Date;
    let endAt: Date;
    
    if (itineraryItem.start_time) {
      const [hours, minutes] = itineraryItem.start_time.split(':').map(Number);
      startAt = new Date(itemDate);
      startAt.setHours(hours, minutes, 0, 0);
    } else {
      startAt = new Date(itemDate);
      startAt.setHours(0, 0, 0, 0);
    }
    
    if (itineraryItem.end_time) {
      const [hours, minutes] = itineraryItem.end_time.split(':').map(Number);
      endAt = new Date(itemDate);
      endAt.setHours(hours, minutes, 0, 0);
    } else if (itineraryItem.start_time) {
      // Default to 1 hour after start if no end time
      endAt = new Date(startAt);
      endAt.setHours(endAt.getHours() + 1);
    } else {
      endAt = new Date(itemDate);
      endAt.setHours(23, 59, 59, 999);
    }
    
    // Map itinerary category to event type
    const eventTypeMap: Record<string, 'travel' | 'meeting' | 'social' | 'personal'> = {
      travel: 'travel',
      activity: 'social',
      food: 'social',
      reservation: 'meeting',
      milestone: 'personal',
    };
    
    const eventType = eventTypeMap[itineraryItem.category] || 'personal';
    const timeScope = itineraryItem.start_time ? 'timed' : 'all_day';
    
    if (existingEvent) {
      // Update existing nested event
      const { error: updateError } = await supabase
        .from('context_events')
        .update({
          title: itineraryItem.title,
          description: itineraryItem.description || '',
          location: itineraryItem.location || '',
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          event_type: eventType,
          time_scope: timeScope,
          metadata: {
            itinerary_item_id: itineraryItem.id,
            category: itineraryItem.category,
          },
        })
        .eq('id', existingEvent.id);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      
      return { success: true, data: existingEvent.id };
    } else {
      // Create new nested event
      const nestedResult = await createNestedEvent({
        context_id: contextId,
        created_by: userId,
        parent_context_event_id: containerEventId,
        event_type: eventType,
        time_scope: timeScope,
        title: itineraryItem.title,
        description: itineraryItem.description || '',
        location: itineraryItem.location || '',
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        timezone: 'UTC',
        metadata: {
          itinerary_item_id: itineraryItem.id,
          category: itineraryItem.category,
        },
      });
      
      if (!nestedResult.success || !nestedResult.data) {
        return { success: false, error: nestedResult.error || 'Failed to create nested event' };
      }
      
      return { success: true, data: nestedResult.data.id };
    }
  } catch (err) {
    console.error(`[tripContextIntegration] Error syncing itinerary item:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Sync all itinerary items to nested context events
 * 
 * This is called when:
 * - Trip is created/updated (if dates exist)
 * - Itinerary items are added/updated/deleted
 * 
 * Rules:
 * - Only syncs if container exists
 * - Non-blocking: failures are logged
 */
export async function syncItineraryToNestedEvents(tripId: string): Promise<ServiceResponse<void>> {
  try {
    // Ensure container exists
    const containerResult = await ensureTripContainerEvent(tripId);
    if (!containerResult.success || !containerResult.data) {
      // Container doesn't exist or couldn't be created - this is OK
      return { success: true }; // Non-blocking
    }
    
    const containerEventId = containerResult.data;
    
    // Get context
    const contextResult = await ensureTripContext(tripId);
    if (!contextResult.success || !contextResult.data) {
      return { success: false, error: 'Context not found' };
    }
    
    const contextId = contextResult.data;
    
    // Get trip owner
    const { data: trip } = await supabase
      .from('trips')
      .select('owner_id')
      .eq('id', tripId)
      .single();
    
    if (!trip) {
      return { success: false, error: 'Trip not found' };
    }
    
    // Get all itinerary items
    const { data: itineraryItems, error: itineraryError } = await supabase
      .from('trip_itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: false });
    
    if (itineraryError) {
      return { success: false, error: itineraryError.message };
    }
    
    // Get existing nested events for this container
    const { data: existingNested } = await supabase
      .from('context_events')
      .select('id, metadata')
      .eq('parent_context_event_id', containerEventId)
      .eq('event_scope', 'item');
    
    const existingItineraryIds = new Set(
      (existingNested || [])
        .map(e => e.metadata?.itinerary_item_id)
        .filter(Boolean)
    );
    
    const currentItineraryIds = new Set((itineraryItems || []).map(item => item.id));
    
    // Delete nested events for removed itinerary items
    const toDelete = (existingNested || []).filter(
      e => e.metadata?.itinerary_item_id && !currentItineraryIds.has(e.metadata.itinerary_item_id)
    );
    
    for (const event of toDelete) {
      await supabase
        .from('context_events')
        .delete()
        .eq('id', event.id);
    }
    
    // Sync each itinerary item
    for (const item of itineraryItems || []) {
      const result = await syncItineraryItemToNestedEvent(
        item,
        containerEventId,
        contextId,
        trip.owner_id
      );
      
      if (!result.success) {
        console.warn(`[tripContextIntegration] Failed to sync itinerary item ${item.id}:`, result.error);
        // Continue with other items
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error(`[tripContextIntegration] Error syncing itinerary:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

