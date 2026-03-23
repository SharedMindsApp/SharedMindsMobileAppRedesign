/**
 * Planner Habit Tracker Widget - DEPRECATED
 * 
 * Tracking has been moved to Tracker Studio.
 * This component now shows a placeholder directing users to Tracker Studio.
 */

import { PlannerTrackerPlaceholder } from '../PlannerTrackerPlaceholder';

export interface HabitTrackerWidgetProps {
  layout?: 'full' | 'compact';
}

/**
 * @deprecated Habit tracking has been moved to Tracker Studio.
 * This component now shows a placeholder instead of the actual tracker.
 */
export function HabitTrackerWidget({ layout = 'full' }: HabitTrackerWidgetProps) {
  // Show placeholder instead of actual habit tracker
  return <PlannerTrackerPlaceholder trackerName="Habit Tracking" trackerType="habit" />;
}






