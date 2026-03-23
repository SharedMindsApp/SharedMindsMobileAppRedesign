/**
 * Planner Goal Tracker Widget - DEPRECATED
 * 
 * Tracking has been moved to Tracker Studio.
 * This component now shows a placeholder directing users to Tracker Studio.
 */

import { PlannerTrackerPlaceholder } from '../PlannerTrackerPlaceholder';

export interface GoalTrackerWidgetProps {
  layout?: 'full' | 'compact';
}

/**
 * @deprecated Goal tracking has been moved to Tracker Studio.
 * This component now shows a placeholder instead of the actual tracker.
 */
export function GoalTrackerWidget({ layout = 'full' }: GoalTrackerWidgetProps) {
  // Show placeholder instead of actual goal tracker
  return <PlannerTrackerPlaceholder trackerName="Goal Tracking" trackerType="goal" />;
}






