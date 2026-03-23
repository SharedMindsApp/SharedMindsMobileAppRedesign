/**
 * Trip Calendar Projection Service
 * 
 * Generates virtual/derived calendar events from trips and itinerary items.
 * These are NOT stored as canonical calendar_events - they are projections for display.
 * 
 * Architecture: Reference/Projection Layer (not duplicate data)
 * - Trips can appear as all-day banners: "Trip: {name}"
 * - Itinerary items can appear on their dates/times if enabled
 * - Opt-in per trip via show_trip_on_calendar and show_itinerary_items_on_calendar
 * - No duplicate canonical calendar_events unless user explicitly "publishes"
 */

import * as travelService from '../travelService';
import type { Trip, TripItineraryItem } from '../travelService';
import type { PersonalCalendarEvent } from '../personalSpaces/calendarService';

export interface TripCalendarProjectionOptions {
  userId: string;
  calendarScope: 'personal' | 'household' | 'space';
  dateRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
  };
  includeTrips?: boolean;  // Show trip date ranges as all-day events
  includeItinerary?: boolean; // Show itinerary items as timed events
}

export interface TripProjectionSettings {
  show_trip_on_calendar?: boolean;
  show_itinerary_items_on_calendar?: boolean;
}

/**
 * Get trip calendar projections (virtual events derived from trips)
 * Returns virtual calendar events that can be merged into calendar views
 */
export async function getTripCalendarProjections(
  options: TripCalendarProjectionOptions
): Promise<PersonalCalendarEvent[]> {
  const {
    userId,
    calendarScope,
    dateRange,
    includeTrips = true,
    includeItinerary = true,
  } = options;

  const projections: PersonalCalendarEvent[] = [];

  // Get all trips user can access
  const trips = await travelService.getUserTrips(userId);

  // Filter trips within date range or overlapping
  const relevantTrips = trips.filter(trip => {
    if (!trip.start_date || !trip.end_date) return false;
    
    const tripStart = trip.start_date.split('T')[0];
    const tripEnd = trip.end_date.split('T')[0];
    
    // Trip overlaps with date range
    return (
      (tripStart >= dateRange.startDate && tripStart <= dateRange.endDate) ||
      (tripEnd >= dateRange.startDate && tripEnd <= dateRange.endDate) ||
      (tripStart <= dateRange.startDate && tripEnd >= dateRange.endDate)
    );
  });

  for (const trip of relevantTrips) {
    if (!trip.start_date || !trip.end_date) continue;

    // Get trip projection settings (for now, we'll assume defaults or read from metadata)
    // TODO: Read from trip.show_trip_on_calendar and trip.show_itinerary_items_on_calendar if columns exist
    const settings: TripProjectionSettings = {
      show_trip_on_calendar: true, // Default for MVP
      show_itinerary_items_on_calendar: true, // Default for MVP
    };

    // Add trip as all-day banner (if enabled)
    if (includeTrips && settings.show_trip_on_calendar) {
      projections.push({
        id: `trip_${trip.id}_banner`,
        userId: trip.owner_id,
        title: `Trip: ${trip.name}`,
        description: trip.description || `Trip to ${trip.name}`,
        startAt: trip.start_date,
        endAt: trip.end_date,
        allDay: true,
        sourceType: 'context',
        sourceEntityId: trip.id,
        contextId: trip.context_id || undefined,
        contextName: trip.name,
        contextType: 'trip',
        event_scope: 'container',
        event_type: 'travel_segment',
        is_derived_instance: true,
        derived_type: undefined, // Trip container is not a derived instance type
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
        // Metadata for identification
        permissions: {
          can_view: true,
          can_edit: false, // Derived instances are read-only in calendar
          can_manage: false,
          detail_level: 'summary',
          scope: 'include_children',
        },
      });
    }

    // Add itinerary items (if enabled)
    if (includeItinerary && settings.show_itinerary_items_on_calendar) {
      const itinerary = await travelService.getTripItinerary(trip.id);
      
      for (const item of itinerary) {
        // Only include items within date range
        if (item.date < dateRange.startDate || item.date > dateRange.endDate) {
          continue;
        }

        // Create derived event from itinerary item
        const startAt = item.start_time
          ? `${item.date}T${item.start_time}:00`
          : `${item.date}T00:00:00`;
        
        const endAt = item.end_time
          ? `${item.date}T${item.end_time}:00`
          : (item.start_time
              ? `${item.date}T${String(parseInt(item.start_time.split(':')[0]) + 1).padStart(2, '0')}:${item.start_time.split(':')[1]}:00`
              : `${item.date}T23:59:59`);

        projections.push({
          id: `trip_${trip.id}_itinerary_${item.id}`,
          userId: trip.owner_id,
          title: item.title,
          description: item.description || null,
          startAt: startAt,
          endAt: endAt,
          allDay: !item.start_time,
          sourceType: 'context',
          sourceEntityId: item.id,
          sourceProjectId: trip.id, // Parent trip ID
          contextId: trip.context_id || undefined,
          contextName: trip.name,
          contextType: 'trip',
          event_scope: 'item',
          parent_context_event_id: `trip_${trip.id}_banner`, // Link to trip container
          event_type: mapItineraryCategoryToEventType(item.category),
          is_derived_instance: true,
          createdAt: item.created_at || trip.created_at,
          updatedAt: trip.updated_at,
          permissions: {
            can_view: true,
            can_edit: false, // Derived instances are read-only in calendar
            can_manage: false,
            detail_level: 'summary',
            scope: 'include_children',
          },
        });
      }
    }
  }

  return projections;
}

/**
 * Map itinerary category to calendar event type
 */
function mapItineraryCategoryToEventType(category: string): PersonalCalendarEvent['event_type'] {
  const mapping: Record<string, PersonalCalendarEvent['event_type']> = {
    travel: 'travel_segment',
    activity: 'event',
    food: 'event',
    reservation: 'appointment',
    milestone: 'milestone',
  };
  
  return mapping[category] || 'event';
}

/**
 * Update trip calendar projection settings
 * (Store in trip metadata or separate settings table)
 * 
 * For MVP: We'll use a simple approach where settings are stored
 * in trip.notes JSON or we add columns to trips table.
 * For now, this is a placeholder - actual implementation would
 * update trip.show_trip_on_calendar and trip.show_itinerary_items_on_calendar
 */
export async function updateTripProjectionSettings(
  tripId: string,
  settings: TripProjectionSettings
): Promise<void> {
  // TODO: Implement when trip table has show_trip_on_calendar and show_itinerary_items_on_calendar columns
  // For now, this is a placeholder that would update the trip
  // await travelService.updateTrip(tripId, {
  //   show_trip_on_calendar: settings.show_trip_on_calendar,
  //   show_itinerary_items_on_calendar: settings.show_itinerary_items_on_calendar,
  // });
  
  console.log('[tripProjectionService] Update projection settings:', { tripId, settings });
}
