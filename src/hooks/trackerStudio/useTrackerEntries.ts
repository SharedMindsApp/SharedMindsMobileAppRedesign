/**
 * useTrackerEntries Hook
 * 
 * Thin wrapper around tracker entry service for fetching entries.
 * No business logic - just data fetching.
 */

import { useState, useEffect } from 'react';
import { listEntriesByDateRange, getEntryByDate } from '../../lib/trackerStudio/trackerEntryService';
import type { TrackerEntry, ListTrackerEntriesOptions } from '../../lib/trackerStudio/types';

export function useTrackerEntries(options: ListTrackerEntriesOptions) {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize options to prevent unnecessary re-fetches
  const trackerId = options.tracker_id;
  const userId = options.user_id;
  const startDate = options.start_date;
  const endDate = options.end_date;

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        setLoading(true);
        setError(null);
        const data = await listEntriesByDateRange(options);
        if (!cancelled) {
          setEntries(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load entries');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      cancelled = true;
    };
    // Use individual dependencies instead of options object to prevent unnecessary re-fetches
  }, [trackerId, userId, startDate, endDate]);

  return { entries, loading, error };
}

export function useTrackerEntryForDate(trackerId: string | null, entryDate: string | null) {
  const [entry, setEntry] = useState<TrackerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerId || !entryDate) {
      setEntry(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEntry() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEntryByDate(trackerId, entryDate);
        if (!cancelled) {
          setEntry(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load entry');
          setEntry(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntry();

    return () => {
      cancelled = true;
    };
  }, [trackerId, entryDate]);

  return { entry, loading, error };
}
