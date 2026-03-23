/**
 * Task Distribution List
 * 
 * Phase 4.3: Read-only component displaying task distributions
 * 
 * Responsibilities:
 * - Uses useTaskDistributions hook
 * - Displays list of active group distributions
 * - Read-only, no permission logic
 */

import { useTaskDistributions } from '../../hooks/distribution/useTaskDistributions';
import type { TaskProjection } from '../../lib/distribution/taskDistributionService';

type TaskDistributionListProps = {
  taskId: string;
  onDistributionChanged?: () => void;
};

export function TaskDistributionList({ taskId, onDistributionChanged }: TaskDistributionListProps) {
  const { data: projections, loading, error, refresh } = useTaskDistributions({ taskId });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!projections || projections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No distributions found. Distribute this task to a group to get started.</p>
      </div>
    );
  }

  // Group projections by sourceGroupId (group distributions)
  const groupDistributions = new Map<string, TaskProjection[]>();
  projections.forEach((projection) => {
    if (projection.sourceGroupId && projection.status !== 'revoked') {
      if (!groupDistributions.has(projection.sourceGroupId)) {
        groupDistributions.set(projection.sourceGroupId, []);
      }
      groupDistributions.get(projection.sourceGroupId)!.push(projection);
    }
  });

  if (groupDistributions.size === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No active group distributions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(groupDistributions.entries()).map(([groupId, groupProjections]) => (
        <DistributionGroupItem
          key={groupId}
          groupId={groupId}
          projections={groupProjections}
          onDistributionChanged={onDistributionChanged}
        />
      ))}
    </div>
  );
}

type DistributionGroupItemProps = {
  groupId: string;
  projections: TaskProjection[];
  onDistributionChanged?: () => void;
};

function DistributionGroupItem({ groupId, projections, onDistributionChanged }: DistributionGroupItemProps) {
  const userCount = projections.length;
  const statusCounts = {
    pending: projections.filter((p) => p.status === 'pending').length,
    accepted: projections.filter((p) => p.status === 'accepted').length,
    declined: projections.filter((p) => p.status === 'declined').length,
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">Group:</span>
            <span className="text-sm text-gray-900">{groupId}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">Users:</span>
            <span className="text-sm text-gray-900">{userCount}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {statusCounts.pending > 0 && <span>Pending: {statusCounts.pending}</span>}
            {statusCounts.accepted > 0 && <span>Accepted: {statusCounts.accepted}</span>}
            {statusCounts.declined > 0 && <span>Declined: {statusCounts.declined}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
