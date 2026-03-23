// Phase 4A: Context Memory & Smart Defaults
// Remembers simple, local preferences for faster daily use
// Uses localStorage only (no backend changes)

/**
 * Phase 4A: Get last planner view (daily/weekly/monthly)
 * Returns the last used planner view or null
 */
export function getLastPlannerView(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('last_planner_view');
}

/**
 * Phase 4A: Save last planner view
 */
export function saveLastPlannerView(view: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('last_planner_view', view);
}

/**
 * Phase 4A: Get last section within PlannerPersonal
 * Returns the last used section or null
 */
export function getLastPersonalSection(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('last_personal_section');
}

/**
 * Phase 4A: Save last personal section
 */
export function saveLastPersonalSection(section: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('last_personal_section', section);
}

/**
 * Phase 4A: Get last used context for a specific action
 * Returns stored context or default
 */
export function getLastActionContext(actionKey: string, defaultValue: string): string {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(`last_action_${actionKey}`) || defaultValue;
}

/**
 * Phase 4A: Save last used context for a specific action
 */
export function saveLastActionContext(actionKey: string, context: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`last_action_${actionKey}`, context);
}



