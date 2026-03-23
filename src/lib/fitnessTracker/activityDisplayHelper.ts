/**
 * Activity Display Helper
 * 
 * Helps map categories (including sport-specific categories) to activities
 * for display on the home page
 */

import type { UserMovementProfile, TrackerCategory, MovementDomain } from './types';

export interface DisplayActivity {
  id: string; // Category ID (e.g., 'team_sport_football_soccer' or 'gym')
  name: string;
  domain: MovementDomain; // Original domain for data queries
  icon: string;
  color: string;
  state?: any; // Activity state if applicable
}

/**
 * Get all activities for display (categories as separate activities, sports get separate entries)
 */
export function getDisplayActivities(profile: UserMovementProfile): DisplayActivity[] {
  const categories = profile.trackerStructure?.categories || [];
  const activities: DisplayActivity[] = [];

  for (const category of categories) {
    // Check if this sport category has its own state (stored on domain detail)
    const domainDetail = profile.domainDetails[category.domain];
    const state = domainDetail?.state;

    // For sport categories, we might want individual state per sport in the future
    // For now, use domain-level state
    activities.push({
      id: category.id,
      name: category.name,
      domain: category.domain,
      icon: category.icon,
      color: category.color,
      state,
    });
  }

  return activities;
}

/**
 * Get activity state for a specific category/sport
 */
export function getActivityStateForCategory(
  profile: UserMovementProfile,
  categoryId: string
): any {
  const category = profile.trackerStructure?.categories?.find(c => c.id === categoryId);
  if (!category) return undefined;

  const domainDetail = profile.domainDetails[category.domain];
  return domainDetail?.state;
}
