import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProjects } from '../../lib/guardrails/projectUserService';
import { getProjectUsers } from '../../lib/guardrails/projectUserService';
import { getMasterProjectById } from '../../lib/guardrails';
import { createObservationLink, revokeObservationLink, listObservationsForTracker } from '../../lib/trackerStudio/trackerObservationService';
import { showToast } from '../Toast';
import type { Tracker } from '../../lib/trackerStudio/types';

interface ShareTrackerToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker;
  onShared: () => void;
}

interface ProjectWithState {
  id: string;
  name: string;
  userRole: string;
  isShared: boolean;
  observationLinkIds: string[];
}

export function ShareTrackerToProjectModal({
  isOpen,
  onClose,
  tracker,
  onShared,
}: ShareTrackerToProjectModalProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, tracker.id, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [userProjects, observationLinks] = await Promise.all([
        getUserProjects(user.id, false),
        listObservationsForTracker(tracker.id),
      ]);

      const guardrailsLinks = observationLinks.filter(
        link => link.context_type === 'guardrails_project' && link.revoked_at === null
      );

      const linkMap = new Map<string, string[]>();
      guardrailsLinks.forEach(link => {
        const projectId = link.context_id;
        if (!linkMap.has(projectId)) {
          linkMap.set(projectId, []);
        }
        linkMap.get(projectId)!.push(link.id);
      });

      const projectsWithNames = await Promise.all(
        userProjects.map(async (projectUser) => {
          const project = await getMasterProjectById(projectUser.masterProjectId);
          const linkIds = linkMap.get(projectUser.masterProjectId) || [];
          return {
            id: projectUser.masterProjectId,
            name: project?.name || 'Unknown Project',
            userRole: projectUser.role,
            isShared: linkIds.length > 0,
            observationLinkIds: linkIds,
          };
        })
      );

      setProjects(projectsWithNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (projectId: string) => {
    if (!user || sharing.has(projectId) || revoking.has(projectId)) return;

    try {
      setSharing(prev => new Set(prev).add(projectId));

      const participants = await getProjectUsers(projectId, false);
      const participantsToShare = participants.filter(p => p.userId !== user.id);

      if (participantsToShare.length === 0) {
        showToast('info', 'No other participants in this project to share with');
        setSharing(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        return;
      }

      const linkPromises = participantsToShare.map(participant =>
        createObservationLink({
          tracker_id: tracker.id,
          observer_user_id: participant.userId,
          context_type: 'guardrails_project',
          context_id: projectId,
        })
      );

      const results = await Promise.allSettled(linkPromises);
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        showToast('warning', `Shared to ${results.length - failed} participants. ${failed} failed.`);
      } else {
        showToast('success', `Shared to ${results.length} participant${results.length === 1 ? '' : 's'}`);
      }

      await loadData();
      onShared();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to share tracker');
    } finally {
      setSharing(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  const handleRevoke = async (projectId: string, linkIds: string[]) => {
    if (!user || revoking.has(projectId) || sharing.has(projectId)) return;

    const project = projects.find(p => p.id === projectId);
    const projectName = project?.name || 'this project';

    if (!window.confirm(
      `Stop sharing this tracker to ${projectName}? Project participants will no longer be able to view your entries.`
    )) {
      return;
    }

    try {
      setRevoking(prev => new Set(prev).add(projectId));

      const revokePromises = linkIds.map(linkId => revokeObservationLink(linkId));
      await Promise.allSettled(revokePromises);

      showToast('success', `Stopped sharing to ${projectName}`);
      await loadData();
      onShared();
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

  const handleClose = useCallback(() => {
    if (sharing.size === 0 && revoking.size === 0) {
      onClose();
    }
  }, [onClose, sharing.size, revoking.size]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={`Share "${tracker.name}" to Projects`}
      maxHeight="85vh"
      closeOnBackdrop={sharing.size === 0 && revoking.size === 0}
      preventClose={sharing.size > 0 || revoking.size > 0}
    >
      <div className="p-4 md:p-6">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Sharing a tracker allows project participants to view your entries in read-only mode. They cannot edit data, add entries, or see trackers you haven't shared.
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading projects...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-1">Failed to load projects</p>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You're not in any Guardrails projects</h3>
            <p className="text-gray-600 text-sm">Create or join a Guardrails project to share trackers.</p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Share to projects:</h3>
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {project.isShared ? (
                        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0" />
                      )}
                      <h4 className="text-base font-semibold text-gray-900">{project.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">Your role: {project.userRole}</p>
                    {project.isShared && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 ml-6 mt-1">
                        Shared (read-only)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-6">
                  {project.isShared ? (
                    <button
                      onClick={() => handleRevoke(project.id, project.observationLinkIds)}
                      disabled={revoking.has(project.id) || sharing.has(project.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revoking.has(project.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleShare(project.id)}
                      disabled={sharing.has(project.id) || revoking.has(project.id) || tracker.archived_at !== null}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sharing.has(project.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Sharing...
                        </>
                      ) : (
                        'Share'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={sharing.size > 0 || revoking.size > 0}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
