/**
 * Fitness Tracker Utilities
 * 
 * Utility functions for detecting and working with Fitness Tracker instances.
 */

import { supabase } from '../supabase';
import type { Tracker } from '../trackerStudio/types';

/**
 * Check if a tracker is the Fitness Tracker
 * Detects by name or by checking user_movement_profiles
 */
export async function isFitnessTracker(tracker: Tracker | { id: string; name: string }): Promise<boolean> {
  if (!tracker) return false;
  
  // Check if name matches "Fitness Tracker" (case-insensitive)
  const nameLower = tracker.name.toLowerCase().trim();
  if (nameLower === 'fitness tracker' || nameLower.includes('fitness tracker')) {
    return true;
  }
  
  // Also check by checking user_movement_profiles for fitness_tracker_id
  try {
    const { data } = await supabase
      .from('user_movement_profiles')
      .select('fitness_tracker_id')
      .eq('fitness_tracker_id', tracker.id)
      .maybeSingle();
    
    return !!data;
  } catch (error) {
    // If error, fall back to name check
    return false;
  }
}

/**
 * Check if a tracker is the Fitness Tracker (synchronous version - name only)
 * Use this for immediate checks without async overhead
 */
export function isFitnessTrackerByName(tracker: { name: string }): boolean {
  if (!tracker) return false;
  const nameLower = tracker.name.toLowerCase().trim();
  return nameLower === 'fitness tracker' || nameLower.includes('fitness tracker');
}
