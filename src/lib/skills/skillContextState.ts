/**
 * Skill Context State
 * 
 * Computes neutral, descriptive states for skill contexts based on activity patterns.
 * These states are observational, not evaluative.
 * 
 * States:
 * - emerging: Low activity, recently created
 * - active: Recent activity present
 * - background: Infrequent but ongoing
 * - dormant: No activity for extended period
 */

import type { SkillContext } from '../skillsService';

export type ContextState = 'emerging' | 'active' | 'background' | 'dormant';

export interface ContextStateInfo {
  state: ContextState;
  label: string;
  description: string;
  lastActivityDaysAgo?: number;
}

const STATE_LABELS: Record<ContextState, string> = {
  emerging: 'Emerging',
  active: 'Active',
  background: 'Background',
  dormant: 'Dormant',
};

const STATE_DESCRIPTIONS: Record<ContextState, string> = {
  emerging: 'Recently created with limited activity so far',
  active: 'Recent activity indicates ongoing engagement',
  background: 'Occasional activity suggests background presence',
  dormant: 'No activity observed for an extended period',
};

/**
 * Compute context state based on activity patterns
 */
export function computeContextState(
  context: SkillContext,
  lastActivityAt?: string,
  activityCount?: number
): ContextStateInfo {
  const now = Date.now();
  const contextAge = now - new Date(context.created_at).getTime();
  const contextAgeDays = contextAge / (1000 * 60 * 60 * 24);
  
  let lastActivityDaysAgo: number | undefined;
  if (lastActivityAt) {
    const activityTime = new Date(lastActivityAt).getTime();
    lastActivityDaysAgo = (now - activityTime) / (1000 * 60 * 60 * 24);
  }

  // Determine state based on activity patterns
  let state: ContextState;

  if (!lastActivityAt) {
    // No activity recorded
    if (contextAgeDays < 30) {
      state = 'emerging'; // Recently created, no activity yet
    } else {
      state = 'dormant'; // Old context with no activity
    }
  } else if (lastActivityDaysAgo! <= 7) {
    // Activity within last week
    state = 'active';
  } else if (lastActivityDaysAgo! <= 30) {
    // Activity within last month
    if (activityCount && activityCount > 5) {
      state = 'active'; // Frequent activity
    } else {
      state = 'background'; // Occasional activity
    }
  } else if (lastActivityDaysAgo! <= 90) {
    // Activity within last 3 months
    state = 'background';
  } else {
    // No activity for 3+ months
    state = 'dormant';
  }

  return {
    state,
    label: STATE_LABELS[state],
    description: STATE_DESCRIPTIONS[state],
    lastActivityDaysAgo,
  };
}

/**
 * Get state color (subtle, non-evaluative)
 */
export function getStateColor(state: ContextState): string {
  const colors: Record<ContextState, string> = {
    emerging: '#9CA3AF', // Gray - neutral
    active: '#3B82F6', // Blue - present
    background: '#6B7280', // Gray-blue - subtle
    dormant: '#D1D5DB', // Light gray - minimal
  };
  return colors[state];
}

/**
 * Get state badge styling
 */
export function getStateBadgeClass(state: ContextState): string {
  const classes: Record<ContextState, string> = {
    emerging: 'bg-gray-100 text-gray-700 border-gray-300',
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    background: 'bg-slate-100 text-slate-700 border-slate-300',
    dormant: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return classes[state];
}






