import { useState, useEffect } from 'react';
import {
  listContextEventsByDateRange,
  getActiveContextsForDate,
  type ContextEvent,
} from '../../lib/trackerStudio/contextEventService';

/**
 * Hook to fetch context events for a date range
 */
export function useContextEvents(startDate: string, endDate: string) {
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const events = await listContextEventsByDateRange(startDate, endDate);
        setContextEvents(events);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load context events');
        setContextEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [startDate, endDate]);

  return { contextEvents, loading, error };
}

/**
 * Hook to get active context events for a specific date
 */
export function useActiveContextsForDate(date: string | null) {
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setContextEvents([]);
      setLoading(false);
      return;
    }

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const events = await getActiveContextsForDate(date);
        setContextEvents(events);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load context events');
        setContextEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [date]);

  return { contextEvents, loading, error };
}
