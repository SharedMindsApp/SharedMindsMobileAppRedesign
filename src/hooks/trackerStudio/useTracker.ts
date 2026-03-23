/**
 * useTracker Hook
 * 
 * Thin wrapper around tracker service for fetching a single tracker.
 * No business logic - just data fetching.
 */

import { useState, useEffect } from 'react';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import type { Tracker } from '../../lib/trackerStudio/types';

export function useTracker(trackerId: string | null) {
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerId) {
      setTracker(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTracker() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTracker(trackerId);
        if (!cancelled) {
          setTracker(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tracker');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTracker();

    return () => {
      cancelled = true;
    };
  }, [trackerId]);

  return { tracker, loading, error };
}
