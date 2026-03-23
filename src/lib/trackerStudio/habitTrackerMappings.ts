/**
 * Habit Tracker Mappings
 * 
 * Maps habit presets to corresponding detailed tracker templates.
 * This enables smart cross-tracker suggestions and reduces double entry.
 * 
 * Purpose of each tracker type:
 * - Habit Tracker: Simple daily check-in (done/missed/skipped). Quick logging, consistency focus, streak tracking.
 * - Detailed Trackers: Structured data with specific metrics (amounts, times, quality ratings). Rich analytics, detailed insights.
 */

import type { HabitPreset } from './habitPresets';
import type { TrackerTemplate } from './types';

/**
 * Mapping from habit preset name to tracker template name
 * This allows the system to suggest using a detailed tracker when available
 */
export const HABIT_TO_TRACKER_MAPPING: Record<string, string> = {
  // Health & Wellness
  'Drink Water': 'Water Intake Tracker',
  'Take Vitamins': 'Medication Tracker',
  'Take Medication': 'Medication Tracker',
  'Quality Sleep Prep': 'Sleep Tracker',
  
  // Exercise & Activity
  'Morning Stretch': 'Exercise Tracker',
  'Exercise': 'Exercise Tracker',
  'Workout': 'Exercise Tracker',
  
  // Nutrition
  'Cook at Home': 'Nutrition Log',
  'No Fast Food': 'Nutrition Log',
  'No Skipping Meals': 'Nutrition Log',
  'Stop Late Night Snacking': 'Nutrition Log',
  'Stop Stress Eating': 'Nutrition Log',
  
  // Mindfulness & Mental Health
  'Meditation': 'Mindfulness & Meditation',
  'Gratitude Practice': 'Gratitude Journal',
  'Self Reflection': 'Mental Health Check-in',
  'Breathing Exercise': 'Mindfulness & Meditation',
  'Mindful Walking': 'Mindfulness & Meditation',
  
  // Rest & Recovery
  'Rest': 'Rest & Recovery',
  'Recovery': 'Rest & Recovery',
  'Evening Wind-down': 'Rest & Recovery',
};

/**
 * Get the tracker template name for a habit preset
 */
export function getTrackerForHabit(habitName: string): string | null {
  // Direct mapping
  const direct = HABIT_TO_TRACKER_MAPPING[habitName];
  if (direct) return direct;
  
  // Fuzzy matching (case-insensitive, partial)
  const habitLower = habitName.toLowerCase();
  for (const [habit, tracker] of Object.entries(HABIT_TO_TRACKER_MAPPING)) {
    if (habit.toLowerCase().includes(habitLower) || habitLower.includes(habit.toLowerCase())) {
      return tracker;
    }
  }
  
  return null;
}

/**
 * Get all habits that map to a specific tracker template
 */
export function getHabitsForTracker(trackerName: string): string[] {
  return Object.entries(HABIT_TO_TRACKER_MAPPING)
    .filter(([_, tracker]) => tracker === trackerName)
    .map(([habit]) => habit);
}

/**
 * Check if a habit has a corresponding detailed tracker template
 */
export function hasDetailedTracker(habitName: string): boolean {
  return getTrackerForHabit(habitName) !== null;
}

/**
 * Tracker Relationship Info
 * Explains the purpose and difference between trackers
 */
export interface TrackerRelationshipInfo {
  habitName: string;
  trackerName: string | null;
  purpose: {
    habitTracker: string; // What Habit Tracker is for
    detailedTracker: string; // What the detailed tracker is for
  };
  recommendation: 'use-habit-only' | 'use-detailed' | 'use-both';
  syncOption: boolean; // Whether we can sync entries between both
}

/**
 * Get relationship info between a habit and its detailed tracker
 */
export function getTrackerRelationshipInfo(
  habitName: string,
  trackerTemplate?: TrackerTemplate | null
): TrackerRelationshipInfo {
  const trackerName = getTrackerForHabit(habitName);
  const hasTracker = !!trackerName && !!trackerTemplate;
  
  // Default recommendation based on whether detailed tracker exists
  let recommendation: 'use-habit-only' | 'use-detailed' | 'use-both' = 'use-habit-only';
  let syncOption = false;
  
  if (hasTracker) {
    // If detailed tracker exists, recommend using it, but offer both
    recommendation = 'use-both';
    syncOption = true;
  }
  
  // Purpose explanations
  const purpose = {
    habitTracker: 'Quick daily check-in to track consistency. Perfect for simple "did I do it?" tracking with streak support.',
    detailedTracker: trackerTemplate?.description || 'Structured tracking with detailed metrics, times, amounts, and quality ratings. Better for insights and patterns.',
  };
  
  // Customize recommendation based on tracker type
  if (trackerName === 'Water Intake Tracker') {
    purpose.detailedTracker = 'Track exact amounts (cups/glasses) and timing. Better for hydration goals and patterns.';
    recommendation = 'use-detailed';
  } else if (trackerName === 'Exercise Tracker') {
    purpose.detailedTracker = 'Track workout type, duration, intensity, and activities. Better for fitness progress.';
    recommendation = 'use-detailed';
  } else if (trackerName === 'Gratitude Journal') {
    purpose.detailedTracker = 'Record detailed gratitude entries with context and reflection. Better for deeper mindfulness practice.';
    recommendation = 'use-both';
  } else if (trackerName === 'Sleep Tracker') {
    purpose.detailedTracker = 'Track sleep duration, quality ratings, and patterns. Essential for understanding sleep health.';
    recommendation = 'use-detailed';
  }
  
  return {
    habitName,
    trackerName: trackerName || null,
    purpose,
    recommendation,
    syncOption,
  };
}
