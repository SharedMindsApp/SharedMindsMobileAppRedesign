/**
 * Habit Streak Analysis Service
 * 
 * Analyzes habit entries to calculate streaks, predict likelihood of missing,
 * and provide streak-related insights.
 */

import type { TrackerEntry } from './types';
import { listEntriesByDateRange } from './trackerEntryService';

export interface HabitStreak {
  habitName: string;
  currentStreak: number; // Days in a row (positive for active, negative for missed)
  longestStreak: number;
  streakType: 'active' | 'missed' | 'none'; // active = consecutive done, missed = consecutive missed
  lastEntryDate: string | null;
  streakStartDate: string | null;
}

export interface StreakInsight {
  habitName: string;
  streak: HabitStreak;
  message: string; // e.g., "You're on a 5-day streak!"
  motivationLevel: 'low' | 'medium' | 'high';
  riskOfBreaking: number; // 0-1 probability of breaking streak based on patterns
}

/**
 * Calculate streak for a specific habit
 */
export function calculateStreakForHabit(
  habitName: string,
  entries: TrackerEntry[]
): HabitStreak {
  // Filter entries for this habit, sorted by date (newest first)
  const habitEntries = entries
    .filter(e => {
      const name = e.field_values?.habit_name;
      return name && typeof name === 'string' && name.trim().toLowerCase() === habitName.trim().toLowerCase();
    })
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

  if (habitEntries.length === 0) {
    return {
      habitName,
      currentStreak: 0,
      longestStreak: 0,
      streakType: 'none',
      lastEntryDate: null,
      streakStartDate: null,
    };
  }

  const lastEntry = habitEntries[0];
  const lastEntryDate = new Date(lastEntry.entry_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get status from last entry
  const status = lastEntry.field_values?.status;
  const isDone = status === 'done' || lastEntry.field_values?.value_boolean === true;

  // Sort by date (oldest first) for streak calculation
  const sortedEntries = [...habitEntries].reverse();

  // Calculate current streak
  let currentStreak = 0;
  let streakType: 'active' | 'missed' | 'none' = 'none';
  let streakStartDate: string | null = null;

  // Start from today and work backwards
  const dateMap = new Map<string, TrackerEntry>();
  for (const entry of sortedEntries) {
    dateMap.set(entry.entry_date, entry);
  }

  // Calculate active streak (consecutive "done" entries)
  let checkDate = new Date(today);
  let consecutiveDone = 0;
  let hasActiveStreak = false;

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const entry = dateMap.get(dateStr);
    
    if (entry) {
      const entryStatus = entry.field_values?.status;
      const entryDone = entryStatus === 'done' || entry.field_values?.value_boolean === true;
      
      if (entryDone) {
        consecutiveDone++;
        if (!hasActiveStreak) {
          hasActiveStreak = true;
          streakStartDate = dateStr;
        }
      } else if (entryStatus === 'missed' || entryStatus === 'skipped') {
        break; // Streak broken
      }
    } else {
      // No entry for this date - check if it's today/yesterday (might not be logged yet)
      const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        // Today or yesterday - might not be logged yet, don't break streak
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break; // Gap in entries breaks streak
      }
    }

    checkDate.setDate(checkDate.getDate() - 1);
    
    // Limit to reasonable range (2 years)
    if (consecutiveDone > 730) break;
  }

  // Calculate missed streak (consecutive "missed" entries)
  checkDate = new Date(today);
  let consecutiveMissed = 0;
  let hasMissedStreak = false;
  let missedStreakStart: string | null = null;

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const entry = dateMap.get(dateStr);
    
    if (entry) {
      const entryStatus = entry.field_values?.status;
      if (entryStatus === 'missed') {
        consecutiveMissed++;
        if (!hasMissedStreak) {
          hasMissedStreak = true;
          missedStreakStart = dateStr;
        }
      } else {
        break; // Missed streak broken
      }
    } else {
      break; // No entry breaks missed streak
    }

    checkDate.setDate(checkDate.getDate() - 1);
    
    // Limit to reasonable range
    if (consecutiveMissed > 730) break;
  }

  // Determine which streak is active
  if (consecutiveDone > 0) {
    currentStreak = consecutiveDone;
    streakType = 'active';
    streakStartDate = streakStartDate || lastEntryDate.toISOString().split('T')[0];
  } else if (consecutiveMissed > 0) {
    currentStreak = -consecutiveMissed;
    streakType = 'missed';
    streakStartDate = missedStreakStart;
  }

  // Calculate longest streak (simplified - count consecutive done entries)
  let longestStreak = 0;
  let tempStreak = 0;
  
  for (const entry of sortedEntries) {
    const entryStatus = entry.field_values?.status;
    const entryDone = entryStatus === 'done' || entry.field_values?.value_boolean === true;
    
    if (entryDone) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    habitName,
    currentStreak: streakType === 'missed' ? -consecutiveMissed : consecutiveDone,
    longestStreak,
    streakType,
    lastEntryDate: lastEntry.entry_date,
    streakStartDate,
  };
}

/**
 * Calculate streaks for all habits in entries
 */
export function calculateAllStreaks(entries: TrackerEntry[]): Map<string, HabitStreak> {
  const streaks = new Map<string, HabitStreak>();
  const habitNames = new Set<string>();

  // Extract unique habit names
  for (const entry of entries) {
    const habitName = entry.field_values?.habit_name;
    if (habitName && typeof habitName === 'string' && habitName.trim()) {
      habitNames.add(habitName.trim());
    }
  }

  // Calculate streak for each habit
  for (const habitName of habitNames) {
    const streak = calculateStreakForHabit(habitName, entries);
    streaks.set(habitName, streak);
  }

  return streaks;
}

/**
 * Generate streak insights and motivation messages
 */
export function generateStreakInsights(streaks: Map<string, HabitStreak>): StreakInsight[] {
  const insights: StreakInsight[] = [];

  for (const streak of streaks.values()) {
    let message = '';
    let motivationLevel: 'low' | 'medium' | 'high' = 'medium';
    let riskOfBreaking = 0.5;

    if (streak.streakType === 'active' && streak.currentStreak > 0) {
      if (streak.currentStreak >= 7) {
        message = `🔥 You're on a ${streak.currentStreak}-day streak! Keep it going!`;
        motivationLevel = 'high';
        riskOfBreaking = 0.1;
      } else if (streak.currentStreak >= 3) {
        message = `✨ You're on a ${streak.currentStreak}-day streak!`;
        motivationLevel = 'high';
        riskOfBreaking = 0.2;
      } else if (streak.currentStreak === 1) {
        message = `Great start! Keep it going!`;
        motivationLevel = 'medium';
        riskOfBreaking = 0.4;
      } else {
        message = `You're on a ${streak.currentStreak}-day streak!`;
        motivationLevel = 'medium';
        riskOfBreaking = 0.3;
      }

      // If close to longest streak, add encouragement
      if (streak.currentStreak >= streak.longestStreak * 0.8 && streak.currentStreak < streak.longestStreak) {
        message += ` You're close to your record of ${streak.longestStreak} days!`;
        motivationLevel = 'high';
      }
    } else if (streak.streakType === 'missed' && streak.currentStreak < 0) {
      const daysMissed = Math.abs(streak.currentStreak);
      message = `It's been ${daysMissed} day${daysMissed > 1 ? 's' : ''} since you last logged "${streak.habitName}". Ready to start again?`;
      motivationLevel = 'low';
      riskOfBreaking = 0.9; // High risk since already missed
    } else {
      message = `Start your streak with "${streak.habitName}" today!`;
      motivationLevel = 'medium';
      riskOfBreaking = 0.6;
    }

    insights.push({
      habitName: streak.habitName,
      streak,
      message,
      motivationLevel,
      riskOfBreaking,
    });
  }

  return insights;
}

/**
 * Load streaks for a tracker
 */
export async function loadHabitStreaks(
  trackerId: string,
  lookbackDays: number = 365
): Promise<Map<string, HabitStreak>> {
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

  // Calculate streaks
  return calculateAllStreaks(entries);
}

/**
 * Get yesterday's entry for a specific habit
 */
export function getYesterdayEntry(
  habitName: string,
  entries: TrackerEntry[]
): TrackerEntry | null {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return entries.find(e => {
    const name = e.field_values?.habit_name;
    return name && typeof name === 'string' && name.trim().toLowerCase() === habitName.trim().toLowerCase() &&
           e.entry_date === yesterdayStr;
  }) || null;
}
