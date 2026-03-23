/**
 * useHabitPatterns Hook
 * 
 * Fetches and analyzes habit patterns for intelligent defaults and suggestions.
 */

import { useState, useEffect } from 'react';
import { loadHabitPatterns, generateHabitSuggestions, type HabitPattern, type HabitSuggestions } from '../../lib/trackerStudio/habitPatternAnalysis';

export function useHabitPatterns(
  trackerId: string | null,
  lookbackDays: number = 90,
  currentDate?: Date
): {
  patterns: Map<string, HabitPattern>;
  suggestions: HabitSuggestions;
  loading: boolean;
  error: string | null;
} {
  const [patterns, setPatterns] = useState<Map<string, HabitPattern>>(new Map());
  const [suggestions, setSuggestions] = useState<HabitSuggestions>({
    suggestedHabitNames: [],
    defaultHabitName: null,
    defaultStatus: null,
    defaultValueNumeric: null,
    defaultValueBoolean: null,
    contextualNote: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerId) {
      setPatterns(new Map());
      setSuggestions({
        suggestedHabitNames: [],
        defaultHabitName: null,
        defaultStatus: null,
        defaultValueNumeric: null,
        defaultValueBoolean: null,
        contextualNote: null,
      });
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPatterns() {
      try {
        setLoading(true);
        setError(null);
        
        const loadedPatterns = await loadHabitPatterns(trackerId, lookbackDays);
        
        if (!cancelled) {
          setPatterns(loadedPatterns);
          const generatedSuggestions = generateHabitSuggestions(loadedPatterns, currentDate);
          setSuggestions(generatedSuggestions);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load habit patterns');
          setPatterns(new Map());
          setSuggestions({
            suggestedHabitNames: [],
            defaultHabitName: null,
            defaultStatus: null,
            defaultValueNumeric: null,
            defaultValueBoolean: null,
            contextualNote: null,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatterns();

    return () => {
      cancelled = true;
    };
  }, [trackerId, lookbackDays, currentDate]);

  return { patterns, suggestions, loading, error };
}
