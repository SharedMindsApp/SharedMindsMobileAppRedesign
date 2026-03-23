// Phase 4A: Daily Actions Registry
// Internal list of most common daily actions for optimization
// These are existing features, not new ones

/**
 * Phase 4A: Daily Actions (from existing features)
 * Common actions users perform daily:
 * - Adding tasks (work/personal)
 * - Journal entries (daily reflection)
 * - Goal tracking/updates
 * - Habit completion
 * - Quick notes
 * - Planner updates (daily/weekly entries)
 */
export type DailyActionType =
  | 'add-task'
  | 'journal-entry'
  | 'add-goal'
  | 'complete-habit'
  | 'quick-note'
  | 'update-planner'
  | 'add-event';

/**
 * Phase 4A: Get last used context for a daily action
 * Returns stored preference or null
 */
export function getLastActionContext(actionType: DailyActionType): string | null {
  if (typeof window === 'undefined') return null;
  const key = `last_action_context_${actionType}`;
  return localStorage.getItem(key);
}

/**
 * Phase 4A: Save last used context for a daily action
 */
export function saveLastActionContext(actionType: DailyActionType, context: string): void {
  if (typeof window === 'undefined') return;
  const key = `last_action_context_${actionType}`;
  localStorage.setItem(key, context);
}



