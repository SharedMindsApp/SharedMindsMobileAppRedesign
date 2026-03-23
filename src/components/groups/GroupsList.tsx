/**
 * Groups List Section
 * 
 * Phase 4.0: Section component that displays existing groups
 * 
 * Responsibilities:
 * - Uses useGroups hook
 * - Displays existing groups
 * - No permission logic
 */

import { useGroups } from '../../hooks/groups/useGroups';

type GroupsListProps = {
  teamId: string;
};

export function GroupsList({ teamId }: GroupsListProps) {
  const { data: groups, loading, error, refresh } = useGroups(teamId);

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

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No groups found. Create your first group to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
          {group.description && (
            <p className="text-gray-600 mt-1">{group.description}</p>
          )}
          {group.archivedAt && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
              Archived
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
