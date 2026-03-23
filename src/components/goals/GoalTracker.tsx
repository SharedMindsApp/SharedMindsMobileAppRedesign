/**
 * Goal Tracker Component (Legacy - Use GoalTrackerWidget instead)
 *
 * This compatibility wrapper keeps older imports working while redirecting
 * callers to the canonical planner widget implementation.
 */

import { GoalTrackerWidget } from '../planner/widgets/GoalTrackerWidget';

let deprecationWarningShown = false;

export function GoalTracker() {
  if (!deprecationWarningShown && typeof window !== 'undefined') {
    console.warn(
      '[GoalTracker] Deprecated: use GoalTrackerWidget from planner/personal-spaces/shared widgets instead.'
    );
    deprecationWarningShown = true;
  }

  return <GoalTrackerWidget layout="full" />;
}
