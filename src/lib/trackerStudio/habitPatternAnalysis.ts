/**
 * Habit Pattern Analysis Service
 * 
 * Analyzes past habit tracker entries to detect patterns and provide
 * intelligent suggestions for default values and auto-complete.
 */

import type { TrackerEntry } from './types';
import { listEntriesByDateRange } from './trackerEntryService';

export interface HabitPattern {
  habitName: string;
  frequency: number; // How many times logged
  lastLoggedDate: string | null;
  averageValueNumeric: number | null;
  averageValueBoolean: boolean | null;
  mostCommonStatus: string | null;
  commonTimes: string[]; // Times of day this habit is usually logged
  commonDays: number[]; // Days of week (0=Sunday, 6=Saturday)
  recentEntries: TrackerEntry[];
}

export interface HabitSuggestions {
  suggestedHabitNames: string[]; // Ordered by frequency
  defaultHabitName: string | null;
  defaultStatus: string | null;
  defaultValueNumeric: number | null;
  defaultValueBoolean: boolean | null;
  contextualNote: string | null; // e.g., "You usually log this at 7am on weekdays"
}

/**
 * Analyze patterns from a list of habit tracker entries
 */
export function analyzeHabitPatterns(entries: TrackerEntry[]): Map<string, HabitPattern> {
  const patterns = new Map<string, HabitPattern>();

  if (entries.length === 0) {
    return patterns;
  }

  // Group entries by habit name
  const byHabitName = new Map<string, TrackerEntry[]>();
  
  for (const entry of entries) {
    const habitName = entry.field_values?.habit_name;
    if (habitName && typeof habitName === 'string' && habitName.trim()) {
      const name = habitName.trim();
      if (!byHabitName.has(name)) {
        byHabitName.set(name, []);
      }
      byHabitName.get(name)!.push(entry);
    }
  }

  // Analyze each habit
  for (const [habitName, habitEntries] of byHabitName.entries()) {
    const sortedEntries = [...habitEntries].sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    // Calculate average numeric value
    const numericValues = sortedEntries
      .map(e => e.field_values?.value_numeric)
      .filter((v): v is number => typeof v === 'number')
      .filter(v => !isNaN(v));
    const averageValueNumeric = numericValues.length > 0
      ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
      : null;

    // Calculate average boolean value (most common)
    const booleanValues = sortedEntries
      .map(e => e.field_values?.value_boolean)
      .filter((v): v is boolean => typeof v === 'boolean');
    const trueCount = booleanValues.filter(v => v === true).length;
    const averageValueBoolean = booleanValues.length > 0
      ? trueCount > booleanValues.length / 2
      : null;

    // Find most common status
    const statuses = sortedEntries
      .map(e => e.field_values?.status)
      .filter((v): v is string => typeof v === 'string');
    const statusCounts = new Map<string, number>();
    for (const status of statuses) {
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
    const mostCommonStatus = statusCounts.size > 0
      ? Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Extract times of day (if entries have timestamps, we can analyze hour of day)
    // For now, we'll look at days of week
    const daysOfWeek = sortedEntries.map(e => {
      const date = new Date(e.entry_date);
      return date.getDay(); // 0 = Sunday, 6 = Saturday
    });
    const dayCounts = new Map<number, number>();
    for (const day of daysOfWeek) {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    const commonDays = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    // Get recent entries (last 5)
    const recentEntries = sortedEntries.slice(0, 5);

    patterns.set(habitName, {
      habitName,
      frequency: sortedEntries.length,
      lastLoggedDate: sortedEntries[0]?.entry_date || null,
      averageValueNumeric: averageValueNumeric !== null ? Math.round(averageValueNumeric * 10) / 10 : null,
      averageValueBoolean,
      mostCommonStatus,
      commonTimes: [], // Can be enhanced later with timestamp analysis
      commonDays,
      recentEntries,
    });
  }

  return patterns;
}

/**
 * Generate smart suggestions based on patterns and current context
 */
export function generateHabitSuggestions(
  patterns: Map<string, HabitPattern>,
  currentDate?: Date
): HabitSuggestions {
  const current = currentDate || new Date();
  const currentDayOfWeek = current.getDay();

  if (patterns.size === 0) {
    return {
      suggestedHabitNames: [],
      defaultHabitName: null,
      defaultStatus: null,
      defaultValueNumeric: null,
      defaultValueBoolean: null,
      contextualNote: null,
    };
  }

  // Sort habits by frequency (most common first)
  const sortedPatterns = Array.from(patterns.values())
    .sort((a, b) => b.frequency - a.frequency);

  const suggestedHabitNames = sortedPatterns.map(p => p.habitName);

  // Find the most common habit
  const mostCommonPattern = sortedPatterns[0];

  // Find habits that are commonly logged on this day of week
  const todayPatterns = sortedPatterns.filter(p =>
    p.commonDays.includes(currentDayOfWeek) || p.commonDays.length === 0
  );

  // Default to most common habit overall, or most common for today
  const defaultPattern = todayPatterns.length > 0 ? todayPatterns[0] : mostCommonPattern;

  // Build contextual note
  let contextualNote: string | null = null;
  if (defaultPattern) {
    const parts: string[] = [];
    
    if (defaultPattern.commonDays.length > 0 && defaultPattern.commonDays.length < 7) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayLabels = defaultPattern.commonDays.map(d => dayNames[d]);
      if (defaultPattern.commonDays.includes(currentDayOfWeek)) {
        parts.push(`usually logged on ${dayLabels.join('s, ')}`);
      }
    }
    
    if (defaultPattern.mostCommonStatus) {
      parts.push(`usually marked as "${defaultPattern.mostCommonStatus}"`);
    }

    if (parts.length > 0) {
      contextualNote = `You ${parts.join(' and ')}`;
    }
  }

  return {
    suggestedHabitNames,
    defaultHabitName: defaultPattern?.habitName || null,
    defaultStatus: defaultPattern?.mostCommonStatus || null,
    defaultValueNumeric: defaultPattern?.averageValueNumeric ?? null,
    defaultValueBoolean: defaultPattern?.averageValueBoolean ?? null,
    contextualNote,
  };
}

/**
 * Load and analyze habit patterns for a tracker
 */
export async function loadHabitPatterns(
  trackerId: string,
  lookbackDays: number = 90
): Promise<Map<string, HabitPattern>> {
  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Fetch entries
  const entries = await listEntriesByDateRange({
    tracker_id: trackerId,
    start_date: startDateStr,
    end_date: endDate,
  });

  // Analyze patterns
  return analyzeHabitPatterns(entries);
}

/**
 * Get the most recent entry for a specific habit name
 */
export function getMostRecentEntryForHabit(
  entries: TrackerEntry[],
  habitName: string
): TrackerEntry | null {
  const habitEntries = entries
    .filter(e => {
      const name = e.field_values?.habit_name;
      return name && typeof name === 'string' && name.trim().toLowerCase() === habitName.trim().toLowerCase();
    })
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

  return habitEntries[0] || null;
}
