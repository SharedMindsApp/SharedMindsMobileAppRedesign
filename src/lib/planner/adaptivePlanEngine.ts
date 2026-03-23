/**
 * Adaptive Planning Engine
 * 
 * Deterministic rules engine for generating micro-step suggestions
 * based on energy mode, calendar density, and upcoming tasks.
 * 
 * No tracking, no analytics - just planning suggestions.
 */

export type EnergyMode = 'low' | 'medium' | 'high';

export interface AdaptivePlanSuggestion {
  recommendedMicroStepCount: 3 | 5 | 7;
  tone: 'calm' | 'normal' | 'ambitious';
  timeBlockPattern: {
    low: { focusBlocks: number; breaks: number };
    medium: { focusBlocks: number; breaks: number };
    high: { focusBlocks: number; breaks: number };
  };
  defaultPlanStyle: 'survive + reset' | 'steady progress' | 'momentum day';
  suggestedMicroStepTypes: string[];
}

export interface AdaptivePlanInputs {
  energyMode: EnergyMode;
  todayEventsCount: number;
  todayBusyHours: number; // Estimate of hours with scheduled events
  dueSoonTasksCount: number; // From Guardrails (read-only)
  isTravelActive?: boolean; // Trip in progress
}

/**
 * Generate adaptive planning suggestions based on inputs
 * 
 * Fully deterministic - same inputs always produce same outputs.
 */
export function generateAdaptivePlan(inputs: AdaptivePlanInputs): AdaptivePlanSuggestion {
  const {
    energyMode,
    todayEventsCount,
    todayBusyHours,
    dueSoonTasksCount,
    isTravelActive = false,
  } = inputs;

  // Calculate calendar density score (0-10)
  const calendarDensity = Math.min(10, (todayEventsCount * 2) + (todayBusyHours * 1.5));
  
  // Calculate task pressure score (0-10)
  const taskPressure = Math.min(10, dueSoonTasksCount * 2);

  // Adjust for travel
  const travelAdjustment = isTravelActive ? -2 : 0; // Lower expectations when traveling

  // Determine base micro-step count based on energy
  let recommendedMicroStepCount: 3 | 5 | 7;
  let tone: 'calm' | 'normal' | 'ambitious';
  let defaultPlanStyle: 'survive + reset' | 'steady progress' | 'momentum day';

  switch (energyMode) {
    case 'low':
      // Low energy: fewer, gentler steps
      recommendedMicroStepCount = 3;
      tone = 'calm';
      defaultPlanStyle = 'survive + reset';
      break;
    
    case 'medium':
      // Medium energy: moderate steps
      // Adjust based on calendar density
      if (calendarDensity > 6 || taskPressure > 5) {
        recommendedMicroStepCount = 3; // Busy day - focus on essentials
      } else {
        recommendedMicroStepCount = 5; // Normal day
      }
      tone = 'normal';
      defaultPlanStyle = 'steady progress';
      break;
    
    case 'high':
      // High energy: more steps possible
      // But still respect calendar
      if (calendarDensity > 8) {
        recommendedMicroStepCount = 5; // High energy but busy - don't overcommit
      } else {
        recommendedMicroStepCount = 7; // High energy, free day
      }
      tone = 'ambitious';
      defaultPlanStyle = 'momentum day';
      break;
  }

  // Adjust for travel
  if (isTravelActive && recommendedMicroStepCount > 3) {
    recommendedMicroStepCount = Math.max(3, recommendedMicroStepCount - 2) as 3 | 5 | 7;
    if (tone === 'ambitious') tone = 'normal';
    if (defaultPlanStyle === 'momentum day') defaultPlanStyle = 'steady progress';
  }

  // Time block patterns by energy mode
  const timeBlockPattern = {
    low: {
      focusBlocks: 1,
      breaks: 2, // More breaks for low energy
    },
    medium: {
      focusBlocks: 2,
      breaks: 1,
    },
    high: {
      focusBlocks: 3,
      breaks: 1,
    },
  };

  // Suggested micro-step types based on energy and context
  const suggestedMicroStepTypes: string[] = [];
  
  if (energyMode === 'low') {
    suggestedMicroStepTypes.push('single-email', 'prep-one-thing', 'review-not-edit');
  } else if (energyMode === 'medium') {
    suggestedMicroStepTypes.push('small-chunk', 'one-conversation', 'prep-for-tomorrow');
    if (dueSoonTasksCount > 0) {
      suggestedMicroStepTypes.push('breakdown-first-step');
    }
  } else { // high
    suggestedMicroStepTypes.push('deep-focus-chunk', 'multiple-small-wins', 'prep-for-week');
    if (todayEventsCount < 3) {
      suggestedMicroStepTypes.push('momentum-building');
    }
  }

  if (isTravelActive) {
    suggestedMicroStepTypes.push('travel-specific', 'minimal-commitments');
  }

  return {
    recommendedMicroStepCount,
    tone,
    timeBlockPattern,
    defaultPlanStyle,
    suggestedMicroStepTypes,
  };
}

/**
 * Get default energy mode (user preference or 'medium')
 */
export function getDefaultEnergyMode(): EnergyMode {
  if (typeof window === 'undefined') return 'medium';
  
  const stored = localStorage.getItem('planner_energy_mode');
  if (stored === 'low' || stored === 'medium' || stored === 'high') {
    return stored;
  }
  
  return 'medium';
}

/**
 * Save energy mode preference (ephemeral, local storage)
 */
export function saveEnergyMode(mode: EnergyMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('planner_energy_mode', mode);
}
