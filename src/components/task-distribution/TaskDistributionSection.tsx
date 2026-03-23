/**
 * Task Distribution Section
 * 
 * Phase 4.3: Container section for task distribution
 * 
 * Responsibilities:
 * - Container only
 * - No permission logic
 * - No feature flag logic
 * - Coordinates refresh after distribution changes
 */

import { TaskDistributionList } from './TaskDistributionList';
import { DistributeTaskForm } from './DistributeTaskForm';

type TaskDistributionSectionProps = {
  taskId: string;
  teamId: string;
  onDistributionChanged?: () => void;
};

export function TaskDistributionSection({ taskId, teamId, onDistributionChanged }: TaskDistributionSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Distribution</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribute to Group</h3>
          <DistributeTaskForm taskId={taskId} teamId={teamId} onDistributed={onDistributionChanged} />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Current Distributions</h3>
          <TaskDistributionList taskId={taskId} onDistributionChanged={onDistributionChanged} />
        </div>
      </div>
    </div>
  );
}
