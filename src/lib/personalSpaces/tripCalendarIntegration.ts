/**
 * Trip Calendar Integration
 * 
 * Functions to offer trip itinerary items to personal calendar via context projections.
 * 
 * Feature flag controlled: Only works when CONTEXT_CALENDAR_ENABLED is true
 */

import { supabase } from '../supabase';

/**
 * Offer a trip itinerary item to user's personal calendar
 * Creates a pending projection that user must accept
 * 
 * @param tripId - Trip ID
 * @param itineraryItem - Trip itinerary item to project
 * @param userId - User ID (trip collaborator)
 * @param tripName - Trip name (for context creation)
 * @returns projectionId if successful
 */
export async function offerTripItineraryToCalendar(
  tripId: string,
  itineraryItem: {
    id: string;
    title: string;
    description?: string | null;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    category: string;
  },
  userId: string,
  tripName: string
): Promise<{ success: boolean; projectionId?: string; error?: string }> {
  try {
    // Step 1: Get or create context for this trip
    let contextId: string;
    
    const { data: existingContext } = await supabase
      .from('contexts')
      .select('id')
      .eq('linked_trip_id', tripId)
      .maybeSingle();
    
    if (existingContext) {
      contextId = existingContext.id;
    } else {
      // Create context for trip
      const { data: newContext, error: contextError } = await supabase
        .from('contexts')
        .insert({
          type: 'trip',
          owner_user_id: userId, // Trip collaborator is context owner
          name: tripName,
          linked_trip_id: tripId,
        })
        .select('id')
        .single();
      
      if (contextError || !newContext) {
        console.error('[tripCalendarIntegration] Error creating context:', contextError);
        return { success: false, error: 'Failed to create trip context' };
      }
      
      contextId = newContext.id;
    }
    
    // Step 2: Get or create context event for this itinerary item
    let eventId: string;
    
    const { data: existingEvent } = await supabase
      .from('context_events')
      .select('id')
      .eq('context_id', contextId)
      .eq('metadata->>itinerary_item_id', itineraryItem.id)
      .maybeSingle();
    
    if (existingEvent) {
      eventId = existingEvent.id;
    } else {
      // Create event from itinerary item
      const startAt = combineDateTime(itineraryItem.date, itineraryItem.start_time || '00:00');
      const endAt = itineraryItem.end_time
        ? combineDateTime(itineraryItem.date, itineraryItem.end_time)
        : calculateDefaultEndTime(startAt);
      
      const { data: newEvent, error: eventError } = await supabase
        .from('context_events')
        .insert({
          context_id: contextId,
          created_by: userId,
          event_type: mapCategoryToEventType(itineraryItem.category),
          time_scope: itineraryItem.start_time ? 'timed' : 'all_day',
          title: itineraryItem.title,
          description: itineraryItem.description || '',
          location: itineraryItem.location || '',
          start_at: startAt,
          end_at: endAt,
          timezone: 'UTC', // TODO: Use trip destination timezone
          metadata: {
            itinerary_item_id: itineraryItem.id,
            trip_id: tripId,
            category: itineraryItem.category,
          },
        })
        .select('id')
        .single();
      
      if (eventError || !newEvent) {
        console.error('[tripCalendarIntegration] Error creating event:', eventError);
        return { success: false, error: 'Failed to create calendar event' };
      }
      
      eventId = newEvent.id;
    }
    
    // Step 3: Create projection (pending status)
    const { data: existingProjection } = await supabase
      .from('calendar_projections')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('target_user_id', userId)
      .maybeSingle();
    
    if (existingProjection) {
      // Projection already exists
      if (existingProjection.status === 'declined' || existingProjection.status === 'revoked') {
        // Re-offer declined/revoked projection
        const { error: updateError } = await supabase
          .from('calendar_projections')
          .update({
            status: 'pending',
            declined_at: null,
            revoked_at: null,
          })
          .eq('id', existingProjection.id);
        
        if (updateError) {
          console.error('[tripCalendarIntegration] Error updating projection:', updateError);
          return { success: false, error: 'Failed to re-offer event' };
        }
        
        return { success: true, projectionId: existingProjection.id };
      } else {
        // Already pending or accepted
        return { success: true, projectionId: existingProjection.id };
      }
    } else {
      // Create new projection
      const { data: newProjection, error: projectionError } = await supabase
        .from('calendar_projections')
        .insert({
          event_id: eventId,
          target_user_id: userId,
          target_space_id: null,
          scope: 'full',
          status: 'pending',
          created_by: userId,
        })
        .select('id')
        .single();
      
      if (projectionError || !newProjection) {
        console.error('[tripCalendarIntegration] Error creating projection:', projectionError);
        return { success: false, error: 'Failed to offer event to calendar' };
      }
      
      return { success: true, projectionId: newProjection.id };
    }
  } catch (err) {
    console.error('[tripCalendarIntegration] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check if itinerary item is already offered to calendar
 */
export async function isItineraryItemOffered(
  tripId: string,
  itineraryItemId: string,
  userId: string
): Promise<{ offered: boolean; status?: 'pending' | 'accepted' | 'declined' }> {
  try {
    // Find context for trip
    const { data: context } = await supabase
      .from('contexts')
      .select('id')
      .eq('linked_trip_id', tripId)
      .maybeSingle();
    
    if (!context) {
      return { offered: false };
    }
    
    // Find event for itinerary item
    const { data: event } = await supabase
      .from('context_events')
      .select('id')
      .eq('context_id', context.id)
      .eq('metadata->>itinerary_item_id', itineraryItemId)
      .maybeSingle();
    
    if (!event) {
      return { offered: false };
    }
    
    // Find projection
    const { data: projection } = await supabase
      .from('calendar_projections')
      .select('status')
      .eq('event_id', event.id)
      .eq('target_user_id', userId)
      .maybeSingle();
    
    if (!projection) {
      return { offered: false };
    }
    
    return {
      offered: true,
      status: projection.status as 'pending' | 'accepted' | 'declined',
    };
  } catch (err) {
    console.error('[tripCalendarIntegration] Error checking offer status:', err);
    return { offered: false };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function combineDateTime(date: string, time: string): string {
  // Combine date and time into ISO string
  const [hours, minutes] = time.split(':');
  const dateObj = new Date(date);
  dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return dateObj.toISOString();
}

function calculateDefaultEndTime(startAt: string): string {
  // Default to 1 hour duration if no end time provided
  const endDate = new Date(startAt);
  endDate.setHours(endDate.getHours() + 1);
  return endDate.toISOString();
}

function mapCategoryToEventType(category: string): string {
  const mapping: Record<string, string> = {
    travel: 'travel',
    activity: 'social',
    food: 'social',
    reservation: 'meeting',
    milestone: 'milestone',
  };
  
  return mapping[category] || 'personal';
}

