/**
 * useHabitPredictions Hook
 * 
 * Generates proactive suggestions, alerts, and contextual prompts for habits.
 */

import { useMemo } from 'react';
import { useHabitPatterns } from './useHabitPatterns';
import { useHabitStreaks } from './useHabitStreaks';
import {
  generatePredictiveSuggestions,
  detectPatternAlerts,
  generateContextualPrompts,
  type PredictiveSuggestion,
  type PatternAlert,
  type ContextualPrompt,
} from '../../lib/trackerStudio/habitPredictiveAnalysis';

export function useHabitPredictions(
  trackerId: string | null,
  entryDate?: Date
): {
  suggestions: PredictiveSuggestion[];
  alerts: PatternAlert[];
  prompts: ContextualPrompt[];
  loading: boolean;
  hasHighPriority: boolean;
} {
  const currentDate = entryDate || new Date();
  const { patterns, loading: patternsLoading } = useHabitPatterns(trackerId, 90, currentDate);
  const { streaks, loading: streaksLoading } = useHabitStreaks(trackerId, 365);

  const suggestions = useMemo(() => {
    if (patterns.size === 0) return [];
    return generatePredictiveSuggestions(patterns, currentDate, streaks);
  }, [patterns, currentDate, streaks]);

  const alerts = useMemo(() => {
    if (patterns.size === 0) return [];
    return detectPatternAlerts(patterns, currentDate);
  }, [patterns, currentDate]);

  const prompts = useMemo(() => {
    if (patterns.size === 0) return [];
    return generateContextualPrompts(patterns, currentDate, streaks);
  }, [patterns, currentDate, streaks]);

  const hasHighPriority = useMemo(() => {
    return suggestions.some(s => s.priority === 'high' && s.confidence >= 0.7);
  }, [suggestions]);

  return {
    suggestions,
    alerts,
    prompts,
    loading: patternsLoading || streaksLoading,
    hasHighPriority,
  };
}
