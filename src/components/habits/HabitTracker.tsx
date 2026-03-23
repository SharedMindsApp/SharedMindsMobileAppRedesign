/**
 * Habit Tracker (Legacy Shim)
 *
 * @deprecated
 * This file exists for backward compatibility only.
 * Use HabitTrackerWidget in planner/personal-spaces/shared widgets.
 * 
 * TODO: Remove this file once all imports are migrated to the canonical widgets.
 * Search for: `from.*HabitTracker` or `import.*HabitTracker` to find remaining usages.
 */

import { HabitTrackerWidget } from '../planner/widgets/HabitTrackerWidget';

let warned = false;

export function HabitTracker() {
  if (!warned && typeof window !== 'undefined') {
    console.warn(
      '[HabitTracker] Deprecated: use HabitTrackerWidget instead.'
    );
    warned = true;
  }

  return <HabitTrackerWidget layout="full" />;
}
