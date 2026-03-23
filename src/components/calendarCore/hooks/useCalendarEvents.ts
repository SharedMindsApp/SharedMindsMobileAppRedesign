/**
 * useCalendarEvents Hook
 * 
 * Shared hook for fetching calendar events based on context.
 * Abstracts differences between Spaces (household) and Planner (personal) calendars.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { getHouseholdEvents } from '../../../lib/calendar';
import { getPersonalEventsForDateRange } from '../../../lib/personalSpaces/calendarService';
import type { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import type { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';
import type { CalendarContext, CalendarScope } from '../types';
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
} from '../../../lib/calendarUtils';
import { useEventTypeColors, resolveEventColor } from '../../../hooks/useEventTypeColors';

// Convert PersonalCalendarEvent to CalendarEventWithMembers format
// Resolves color from event type using user's custom colors or defaults
function convertPersonalToCalendarEvent(event: PersonalCalendarEvent, customColors?: Record<string, string>): CalendarEventWithMembers {
  // Resolve color from event type
  const resolvedColor = resolveEventColor(event.event_type, customColors);

  return {
    id: event.id,
    title: event.title,
    description: event.description || null,
    location: null, // PersonalCalendarEvent doesn't have location field
    start_at: event.startAt,
    end_at: event.endAt || event.startAt,
    all_day: event.allDay || false,
    color: resolvedColor, // Resolved from event type
    event_type: event.event_type, // Preserve event type
    created_by: event.userId,
    household_id: null,
    members: [],
    member_profiles: [],
  };
}

export function useCalendarEvents(
  context: CalendarContext,
  scope: CalendarScope,
  currentDate: Date,
  view: 'day' | 'week' | 'month' | 'year' | 'agenda'
) {
  const { user } = useAuth();
  const { customColors } = useEventTypeColors(); // Get user's custom event type colors
  const [events, setEvents] = useState<CalendarEventWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to track previous values and prevent unnecessary re-fetches
  const prevContextRef = useRef<CalendarContext | null>(null);
  const prevScopeRef = useRef<CalendarScope | null>(null);
  const prevDateRef = useRef<Date | null>(null);
  const prevViewRef = useRef<'day' | 'week' | 'month' | 'year' | 'agenda' | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  // Memoize loadEvents to prevent recreation on every render
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range based on view
      let startDate: Date;
      let endDate: Date;

      switch (view) {
        case 'day':
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = startOfWeek(currentDate);
          endDate = endOfWeek(currentDate);
          break;
        case 'month':
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
          break;
        case 'year':
          // Load entire year
          startDate = new Date(currentDate.getFullYear(), 0, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate.getFullYear(), 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'agenda':
          // Load next 30 days for agenda
          startDate = new Date();
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
          break;
      }

      if (context === 'spaces') {
        // Spaces: Use household events
        if (!scope.householdId) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const householdEvents = await getHouseholdEvents(
          scope.householdId,
          startDate,
          endDate
        );
        setEvents(householdEvents);
      } else if (context === 'planner') {
        // Planner: Use personal events
        if (!user || !scope.userId) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const personalEvents = await getPersonalEventsForDateRange(
          scope.userId,
          startDate.toISOString(),
          endDate.toISOString(),
          user.id
        );

        // Convert to CalendarEventWithMembers format, resolving colors from event types
        const convertedEvents = personalEvents.map(event => convertPersonalToCalendarEvent(event, customColors));

        setEvents(convertedEvents);
      }
    } catch (err) {
      console.error('[useCalendarEvents] Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [context, scope.householdId, scope.userId, currentDate, view, user?.id, customColors]);

  // Only reload if actual values changed (not just object references)
  useEffect(() => {
    const isInitialMount = prevContextRef.current === null;
    const contextChanged = prevContextRef.current !== context;
    const scopeChanged =
      prevScopeRef.current?.householdId !== scope.householdId ||
      prevScopeRef.current?.userId !== scope.userId;
    const dateChanged =
      !prevDateRef.current ||
      prevDateRef.current.getTime() !== currentDate.getTime();
    const viewChanged = prevViewRef.current !== view;
    const userChanged = prevUserIdRef.current !== user?.id;

    // Always load on initial mount or if any dependency changed
    if (isInitialMount || contextChanged || scopeChanged || dateChanged || viewChanged || userChanged) {
      prevContextRef.current = context;
      prevScopeRef.current = { ...scope };
      prevDateRef.current = new Date(currentDate);
      prevViewRef.current = view;
      prevUserIdRef.current = user?.id || null;

      loadEvents();
    }
  }, [context, scope.householdId, scope.userId, currentDate, view, user?.id, loadEvents]);

  return {
    events,
    loading,
    error,
    reload: loadEvents,
  };
}
