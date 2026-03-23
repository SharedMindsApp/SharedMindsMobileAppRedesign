/**
 * Distribute Event Form
 * 
 * Phase 4.4: Action component for distributing events to groups
 * 
 * Responsibilities:
 * - Uses mutation hook (useDistributeEvent)
 * - Handles loading + error states
 * - Select group
 * - Optional scope/status inputs
 * - Submit → distribute event to group
 */

import { useState } from 'react';
import { useDistributeEvent } from '../../hooks/distribution/useDistributeEvent';
import { useGroups } from '../../hooks/groups/useGroups';

type DistributeEventFormProps = {
  eventId: string;
  teamId: string;
  onDistributed?: () => void;
};

export function DistributeEventForm({ eventId, teamId, onDistributed }: DistributeEventFormProps) {
  const { distributeEvent, loading, error } = useDistributeEvent();
  const { data: groups, loading: groupsLoading } = useGroups(teamId);
  const [groupId, setGroupId] = useState('');
  const [scope, setScope] = useState<'date_only' | 'title' | 'full'>('full');
  const [status, setStatus] = useState<'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupId) {
      return;
    }

    const result = await distributeEvent({
      eventId,
      groupId,
      options: {
        scope,
        ...(status ? { status: status as 'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked' } : undefined),
      },
    });

    if (result) {
      setGroupId('');
      setStatus('');
      if (onDistributed) {
        onDistributed();
      }
    }
  };

  const activeGroups = groups?.filter((g) => !g.archivedAt) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="group-id" className="block text-sm font-medium text-gray-700 mb-1">
          Group
        </label>
        {groupsLoading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 animate-pulse">
            Loading groups...
          </div>
        ) : (
          <select
            id="group-id"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            disabled={loading || activeGroups.length === 0}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a group</option>
            {activeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
        {!groupsLoading && activeGroups.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">No active groups available</p>
        )}
      </div>

      <div>
        <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">
          Scope
        </label>
        <select
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'date_only' | 'title' | 'full')}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="date_only">Date Only</option>
          <option value="title">Title</option>
          <option value="full">Full</option>
        </select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status (Optional)
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Default (pending)</option>
          <option value="suggested">Suggested</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !groupId || groupsLoading || activeGroups.length === 0}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Distributing...' : 'Distribute Event'}
      </button>
    </form>
  );
}
