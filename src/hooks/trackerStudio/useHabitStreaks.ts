/**
 * useHabitStreaks Hook
 * 
 * Fetches and calculates habit streaks for display and insights.
 */

import { useState, useEffect } from 'react';
import { loadHabitStreaks, generateStreakInsights, type HabitStreak, type StreakInsight } from '../../lib/trackerStudio/habitStreakAnalysis';

export function useHabitStreaks(
  trackerId: string | null,
  lookbackDays: number = 365
): {
  streaks: Map<string, HabitStreak>;
  insights: StreakInsight[];
  loading: boolean;
  error: string | null;
} {
  const [streaks, setStreaks] = useState<Map<string, HabitStreak>>(new Map());
  const [insights, setInsights] = useState<StreakInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerId) {
      setStreaks(new Map());
      setInsights([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStreaks() {
      try {
        setLoading(true);
        setError(null);
        
        const loadedStreaks = await loadHabitStreaks(trackerId, lookbackDays);
        
        if (!cancelled) {
          setStreaks(loadedStreaks);
          const generatedInsights = generateStreakInsights(loadedStreaks);
          setInsights(generatedInsights);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load habit streaks');
          setStreaks(new Map());
          setInsights([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStreaks();

    return () => {
      cancelled = true;
    };
  }, [trackerId, lookbackDays]);

  return { streaks, insights, loading, error };
}
