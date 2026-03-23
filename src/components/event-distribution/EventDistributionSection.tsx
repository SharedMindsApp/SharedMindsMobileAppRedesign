/**
 * Event Distribution Section
 * 
 * Phase 4.4: Container section for event distribution
 * 
 * Responsibilities:
 * - Container only
 * - No permission logic
 * - No feature flag logic
 * - Coordinates refresh after distribution changes
 */

import { EventDistributionList } from './EventDistributionList';
import { DistributeEventForm } from './DistributeEventForm';

type EventDistributionSectionProps = {
  eventId: string;
  teamId: string;
  onDistributionChanged?: () => void;
};

export function EventDistributionSection({ eventId, teamId, onDistributionChanged }: EventDistributionSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Distribution</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribute to Group</h3>
          <DistributeEventForm eventId={eventId} teamId={teamId} onDistributed={onDistributionChanged} />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Current Distributions</h3>
          <EventDistributionList eventId={eventId} onDistributionChanged={onDistributionChanged} />
        </div>
      </div>
    </div>
  );
}
