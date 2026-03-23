/**
 * Context Event Timeline Band
 * 
 * Displays context events as background bands on the calendar timeline.
 * Read-only projection - never clickable to act on trackers.
 */

import { useEffect, useState } from 'react';
import {
  getActiveContextsForDate,
  listContextEventsByDateRange,
  type ContextEvent,
} from '../../lib/trackerStudio/contextEventService';
import {
  getContextEventTypeColor,
  CONTEXT_EVENT_TYPE_LABELS,
} from '../../lib/trackerStudio/contextEventTypes';

interface ContextEventTimelineBandProps {
  startDate: Date;
  endDate: Date;
  onContextClick?: (event: ContextEvent) => void;
}

export function ContextEventTimelineBand({
  startDate,
  endDate,
  onContextClick,
}: ContextEventTimelineBandProps) {
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContextEvents();
  }, [startDate, endDate]);

  const loadContextEvents = async () => {
    try {
      setLoading(true);
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const events = await listContextEventsByDateRange(start, end);
      setContextEvents(events);
    } catch (err) {
      console.error('Failed to load context events:', err);
      setContextEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || contextEvents.length === 0) {
    return null;
  }

  // Calculate date range in days
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {contextEvents.map(event => {
        const eventStart = new Date(event.start_date);
        const eventEnd = event.end_date ? new Date(event.end_date) : endDate;
        
        // Calculate position and width
        const eventStartDay = eventStart.getDate();
        const eventStartMonth = eventStart.getMonth();
        const eventStartYear = eventStart.getFullYear();
        
        // Calculate days from start of range
        const daysFromStart = Math.floor(
          (eventStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Calculate duration
        const duration = Math.ceil(
          (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1; // +1 to include both start and end days
        
        const leftPercent = Math.max(0, (daysFromStart / daysDiff) * 100);
        const widthPercent = Math.min(100 - leftPercent, (duration / daysDiff) * 100);

        if (leftPercent >= 100 || widthPercent <= 0) {
          return null;
        }

        return (
          <div
            key={event.id}
            className={`absolute top-0 bottom-0 border-l-2 border-r-2 opacity-20 ${getContextEventTypeColor(event.type)}`}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
            }}
            title={`${event.label} (${CONTEXT_EVENT_TYPE_LABELS[event.type]})`}
          />
        );
      })}
    </div>
  );
}

/**
 * Get active context events for a specific date
 * Used for tooltips and annotations
 */
export async function getContextAnnotationsForDate(date: Date): Promise<ContextEvent[]> {
  const dateStr = date.toISOString().split('T')[0];
  try {
    return await getActiveContextsForDate(dateStr);
  } catch (err) {
    console.error('Failed to load context annotations:', err);
    return [];
  }
}
