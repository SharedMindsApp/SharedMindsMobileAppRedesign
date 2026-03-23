/**
 * Habit Tracker Utilities
 * 
 * Utility functions for detecting and working with Habit Tracker instances.
 */

import type { Tracker } from './types';

/**
 * Check if a tracker is a Habit Tracker
 * Detects by name or template name
 */
export function isHabitTracker(tracker: Tracker): boolean {
  if (!tracker) return false;
  
  // Check if name matches "Habit Tracker" (case-insensitive)
  const nameLower = tracker.name.toLowerCase().trim();
  return nameLower === 'habit tracker' || nameLower.includes('habit tracker');
}

/**
 * Check if a tracker template is the Habit Tracker template
 */
export function isHabitTrackerTemplate(templateName: string): boolean {
  const nameLower = templateName.toLowerCase().trim();
  return nameLower === 'habit tracker' || nameLower.includes('habit tracker');
}
