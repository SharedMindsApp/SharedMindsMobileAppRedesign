/**
 * Planner Tracker Block - DEPRECATED
 * 
 * Tracking has been moved to Tracker Studio.
 * This component now shows a placeholder directing users to Tracker Studio.
 */

import { PlannerTrackerPlaceholder } from '../PlannerTrackerPlaceholder';

type PlannerTrackerBlockProps = {
  trackerId: string;
};

/**
 * @deprecated Tracking functionality has been moved to Tracker Studio.
 * This component now shows a placeholder instead of the actual tracker.
 */
export function PlannerTrackerBlock({ trackerId }: PlannerTrackerBlockProps) {
  // Show placeholder instead of actual tracker
  return <PlannerTrackerPlaceholder trackerName="Tracker" />;
}
