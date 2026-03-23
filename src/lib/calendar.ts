import { supabase } from './supabase';
import type {
  CalendarEvent,
  CalendarEventWithMembers,
  CreateEventData,
  UpdateEventData,
  CalendarFilters
} from './calendarTypes';

export async function getHouseholdEvents(
  householdId: string,
  startDate?: Date,
  endDate?: Date,
  filters?: CalendarFilters
): Promise<CalendarEventWithMembers[]> {
  // V1: table is calendar_event_participants (not calendar_event_participants)
  // V1: column is user_id (not user_id)
  // V1: calendar_events has space_id (not household_id) — householdId maps to space_id
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      members:calendar_event_participants(event_id, user_id),
      member_profiles:calendar_event_participants(
        user_id,
        profiles:user_id(id, full_name, email)
      )
    `)
    .eq('space_id', householdId)
    .order('start_at', { ascending: true });

  if (startDate) {
    query = query.gte('start_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('start_at', endDate.toISOString());
  }

  if (filters?.colors && filters.colors.length > 0) {
    query = query.in('color', filters.colors);
  }

  if (filters?.myEventsOnly) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq('created_by', user.id);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const events = (data || []).map((event: any) => {
    const memberProfiles = event.member_profiles
      ?.map((mp: any) => mp.profiles)
      .filter((p: any) => p) || [];

    return {
      ...event,
      member_profiles: memberProfiles
    };
  });

  if (filters?.memberIds && filters.memberIds.length > 0) {
    return events.filter((event: CalendarEventWithMembers) =>
      event.members?.some(m =>
        filters.memberIds?.includes(m.user_id)
      )
    );
  }

  return events;
}

export async function getEvent(eventId: string): Promise<CalendarEventWithMembers | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      members:calendar_event_participants(event_id, user_id),
      member_profiles:calendar_event_participants(
        user_id,
        profiles:user_id(id, full_name, email)
      )
    `)
    .eq('id', eventId)
    .single();

  if (error) throw error;

  if (!data) return null;

  const memberProfiles = data.member_profiles
    ?.map((mp: any) => mp.profiles)
    .filter((p: any) => p) || [];

  return {
    ...data,
    member_profiles: memberProfiles
  };
}

export async function createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { member_ids, ...eventFields } = eventData;

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .insert({
      ...eventFields,
      created_by: user.id,
      description: eventFields.description || '',
      location: eventFields.location || '',
      all_day: eventFields.all_day || false,
      color: eventFields.color || 'blue',
      event_type: eventFields.event_type || 'event'
    })
    .select()
    .single();

  if (eventError) throw eventError;

  if (member_ids && member_ids.length > 0) {
    const memberInserts = member_ids.map(memberId => ({
      event_id: event.id,
      user_id: memberId
    }));

    const { error: membersError } = await supabase
      .from('calendar_event_participants')
      .insert(memberInserts);

    if (membersError) throw membersError;
  }

  return event;
}

export async function updateEvent(
  eventId: string,
  updates: UpdateEventData
): Promise<CalendarEvent> {
  const { member_ids, ...eventUpdates } = updates;

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .update(eventUpdates)
    .eq('id', eventId)
    .select()
    .single();

  if (eventError) throw eventError;

  if (member_ids !== undefined) {
    await supabase
      .from('calendar_event_participants')
      .delete()
      .eq('event_id', eventId);

    if (member_ids.length > 0) {
      const memberInserts = member_ids.map(memberId => ({
        event_id: eventId,
        user_id: memberId
      }));

      const { error: membersError } = await supabase
        .from('calendar_event_participants')
        .insert(memberInserts);

      if (membersError) throw membersError;
    }
  }

  return event;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

/**
 * Move an event to a new date/time (drag & drop)
 * 
 * Phase 5: For personal events, uses updatePersonalCalendarEvent to ensure
 * task carry-over works correctly (event-linked tasks automatically move).
 */
export async function moveEvent(
  eventId: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<CalendarEvent> {
  // V1: calendar_events has created_by and space_id (not user_id/household_id)
  const { data: event, error: fetchError } = await supabase
    .from('calendar_events')
    .select('created_by, space_id')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    console.error('[moveEvent] Error fetching event:', fetchError);
    // Fallback to standard update
    return updateEvent(eventId, {
      start_at: newStartDate.toISOString(),
      end_at: newEndDate.toISOString()
    });
  }

  // If event has user_id and no household_id, it's a personal event
  // Use updatePersonalCalendarEvent for proper task carry-over
  if (event?.user_id && !event?.household_id) {
    const { updatePersonalCalendarEvent } = await import('./personalSpaces/calendarService');
    const updated = await updatePersonalCalendarEvent(
      event.user_id,
      eventId,
      {
        startAt: newStartDate.toISOString(),
        endAt: newEndDate.toISOString()
      }
    );
    // Convert PersonalCalendarEvent back to CalendarEvent format
    return {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      start_at: updated.startAt,
      end_at: updated.endAt || null,
      all_day: updated.allDay,
      event_type: updated.event_type || 'event',
      color: null,
      location: null,
      created_by: updated.userId,
      household_id: null,
      user_id: updated.userId,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    } as CalendarEvent;
  }

  // For household events, use standard update
  return updateEvent(eventId, {
    start_at: newStartDate.toISOString(),
    end_at: newEndDate.toISOString()
  });
}

/**
 * Resize an event (change end time)
 * 
 * Phase 5: For personal events, uses updatePersonalCalendarEvent to ensure
 * task carry-over works correctly (though end_at changes don't affect task dates).
 */
export async function resizeEvent(
  eventId: string,
  newEndDate: Date
): Promise<CalendarEvent> {
  // V1: calendar_events has created_by and space_id (not user_id/household_id)
  const { data: event, error: fetchError } = await supabase
    .from('calendar_events')
    .select('created_by, space_id')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    console.error('[resizeEvent] Error fetching event:', fetchError);
    // Fallback to standard update
    return updateEvent(eventId, {
      end_at: newEndDate.toISOString()
    });
  }

  // If event has user_id and no household_id, it's a personal event
  // Use updatePersonalCalendarEvent for consistency (end_at changes don't affect task dates)
  if (event?.user_id && !event?.household_id) {
    const { updatePersonalCalendarEvent } = await import('./personalSpaces/calendarService');
    const updated = await updatePersonalCalendarEvent(
      event.user_id,
      eventId,
      {
        endAt: newEndDate.toISOString()
      }
    );
    // Convert PersonalCalendarEvent back to CalendarEvent format
    return {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      start_at: updated.startAt,
      end_at: updated.endAt || null,
      all_day: updated.allDay,
      event_type: updated.event_type || 'event',
      color: null,
      location: null,
      created_by: updated.userId,
      household_id: null,
      user_id: updated.userId,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    } as CalendarEvent;
  }

  // For household events, use standard update
  return updateEvent(eventId, {
    end_at: newEndDate.toISOString()
  });
}

export async function getUpcomingEvents(
  householdId: string,
  limit: number = 3
): Promise<CalendarEventWithMembers[]> {
  const now = new Date();
  const events = await getHouseholdEvents(householdId, now);
  return events.slice(0, limit);
}

export async function getEventsByDateRange(
  householdId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEventWithMembers[]> {
  return getHouseholdEvents(
    householdId,
    new Date(startDate),
    new Date(endDate)
  );
}
