/**
 * Event Segmentation Helpers
 * 
 * Split events for calendar views (month/week/day)
 */

import { PersonalCalendarEvent } from '../personalSpaces/calendarService';

export interface SegmentedEvents {
  containers: PersonalCalendarEvent[];
  allDay: PersonalCalendarEvent[];
  timed: PersonalCalendarEvent[];
  nested: PersonalCalendarEvent[];
}

/**
 * Split events for month view rendering
 */
export function splitEventsForMonthView(events: PersonalCalendarEvent[]): SegmentedEvents {
  const containers: PersonalCalendarEvent[] = [];
  const allDay: PersonalCalendarEvent[] = [];
  const timed: PersonalCalendarEvent[] = [];
  const nested: PersonalCalendarEvent[] = [];

  for (const event of events) {
    if (event.event_scope === 'container') {
      containers.push(event);
    } else if (event.event_scope === 'item') {
      nested.push(event);
    } else if (event.allDay) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  }

  return { containers, allDay, timed, nested };
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  events: PersonalCalendarEvent[],
  date: Date
): SegmentedEvents {
  const dateStr = date.toISOString().split('T')[0];
  const dateTime = date.getTime();
  const nextDayTime = dateTime + 24 * 60 * 60 * 1000;

  const containers: PersonalCalendarEvent[] = [];
  const allDay: PersonalCalendarEvent[] = [];
  const timed: PersonalCalendarEvent[] = [];
  const nested: PersonalCalendarEvent[] = [];

  for (const event of events) {
    const eventDate = new Date(event.startAt).toISOString().split('T')[0];
    const eventStartTime = new Date(event.startAt).getTime();
    const eventEndTime = event.endAt ? new Date(event.endAt).getTime() : eventStartTime;

    // Container events span multiple days
    if (event.event_scope === 'container') {
      if (dateTime >= eventStartTime && dateTime <= eventEndTime) {
        containers.push(event);
      }
    }
    // Nested events
    else if (event.event_scope === 'item') {
      if (eventDate === dateStr) {
        nested.push(event);
      }
    }
    // Regular events
    else if (eventDate === dateStr) {
      if (event.allDay) {
        allDay.push(event);
      } else {
        timed.push(event);
      }
    }
  }

  // Sort timed events by start time
  timed.sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  return { containers, allDay, timed, nested };
}

/**
 * Calculate multi-day container segments for week row rendering
 */
export function getContainerSegmentsForWeek(
  container: PersonalCalendarEvent,
  weekStart: Date,
  weekEnd: Date
): { startDay: number; endDay: number; isStart: boolean; isEnd: boolean } | null {
  const containerStart = new Date(container.startAt);
  const containerEnd = container.endAt ? new Date(container.endAt) : containerStart;

  // Check if container overlaps with this week
  if (containerEnd < weekStart || containerStart > weekEnd) {
    return null;
  }

  const weekStartTime = weekStart.getTime();
  const weekEndTime = weekEnd.getTime();
  const containerStartTime = containerStart.getTime();
  const containerEndTime = containerEnd.getTime();

  // Calculate which days of the week the container spans
  const segmentStart = Math.max(0, Math.floor((containerStartTime - weekStartTime) / (24 * 60 * 60 * 1000)));
  const segmentEnd = Math.min(6, Math.floor((containerEndTime - weekStartTime) / (24 * 60 * 60 * 1000)));

  const isStart = containerStartTime >= weekStartTime && containerStartTime < weekEndTime;
  const isEnd = containerEndTime > weekStartTime && containerEndTime <= weekEndTime;

  return {
    startDay: segmentStart,
    endDay: segmentEnd,
    isStart,
    isEnd,
  };
}

