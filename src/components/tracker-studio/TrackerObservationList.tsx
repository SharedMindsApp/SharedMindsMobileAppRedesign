import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users, Share2 } from 'lucide-react';
import { listObservationsForTracker, revokeObservationLink } from '../../lib/trackerStudio/trackerObservationService';
import { getMasterProjectById } from '../../lib/guardrails';
import { showToast } from '../Toast';
import type { Tracker } from '../../lib/trackerStudio/types';

interface TrackerObservationListProps {
  tracker: Tracker;
  onRevoked: () => void;
}

interface ObservationWithProject {
  linkId: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  allLinkIds: string[];
}

export function TrackerObservationList({
  tracker,
  onRevoked,
}: TrackerObservationListProps) {
  const [observations, setObservations] = useState<ObservationWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadObservations();
  }, [tracker.id]);

  const loadObservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const links = await listObservationsForTracker(tracker.id);
      const guardrailsLinks = links.filter(
        link => link.context_type === 'guardrails_project' && link.revoked_at === null
      );

      const projectMap = new Map<string, string[]>();
      guardrailsLinks.forEach(link => {
        const projectId = link.context_id;
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, []);
        }
        projectMap.get(projectId)!.push(link.id);
      });

      const observationsWithProjects = await Promise.all(
        Array.from(projectMap.entries()).map(async ([projectId, linkIds]) => {
          const project = await getMasterProjectById(projectId);
          return {
            linkId: linkIds[0],
            projectId,
            projectName: project?.name || 'Unknown Project',
            createdAt: guardrailsLinks.find(l => l.context_id === projectId)?.created_at || '',
            allLinkIds: linkIds,
          };
        })
      );

      setObservations(observationsWithProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared access');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (projectId: string, projectName: string, allLinkIds: string[]) => {
    if (revoking.has(projectId)) return;

    if (!window.confirm(
      `Stop sharing this tracker to ${projectName}? Project participants will no longer be able to view your entries.`
    )) {
      return;
    }

    try {
      setRevoking(prev => new Set(prev).add(projectId));

      const revokePromises = allLinkIds.map(linkId => revokeObservationLink(linkId));
      await Promise.allSettled(revokePromises);

      showToast('success', `Stopped sharing to ${projectName}`);
      await loadObservations();
      onRevoked();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to revoke access');
    } finally {
      setRevoking(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Shared Access</h2>
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading shared access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Shared Access</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={loadObservations}
              className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render the section if there are no observations
  if (observations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Shared Access</h2>
      <p className="text-sm text-gray-600 mb-4">
        This tracker is shared to the following Guardrails projects. Project participants can view your entries in read-only mode.
      </p>

      <div className="space-y-3">
        {observations.map(obs => (
          <div
            key={obs.projectId}
            className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-semibold text-gray-900">{obs.projectName}</h4>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Read-only
                </span>
              </div>
              <p className="text-xs text-gray-500">Shared via Guardrails project</p>
            </div>
            <button
              onClick={() => handleRevoke(obs.projectId, obs.projectName, obs.allLinkIds)}
              disabled={revoking.has(obs.projectId)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revoking.has(obs.projectId) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Revoking...
                </>
              ) : (
                'Revoke'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
