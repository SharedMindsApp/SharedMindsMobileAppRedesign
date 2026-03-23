/**
 * TrackWorkspace Component
 * 
 * Phase 3.0: Track & Subtrack Workspace Foundation
 * 
 * Renders workspace for a main track (not a subtrack).
 * Fetches track data and passes it to WorkspaceShell.
 * 
 * ARCHITECTURAL RULES (Phase 3.0):
 * 
 * What this component CAN do:
 * - ✅ Fetch track data via service layer
 * - ✅ Validate track existence
 * - ✅ Pass context to WorkspaceShell
 * 
 * What this component MUST NOT do:
 * - ❌ Edit track data (Phase 3.0 is read-only)
 * - ❌ Mutate domain data
 * - ❌ Implement micro-app logic (deferred to Phase 3.x)
 * - ❌ Query Supabase directly (use service layer)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrackById } from '../../../lib/guardrails/tracksHierarchy';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { WorkspaceShell } from './WorkspaceShell';

export function TrackWorkspace() {
  const { masterProjectId, trackId } = useParams<{ masterProjectId: string; trackId: string }>();
  const { activeProject } = useActiveProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!masterProjectId || !trackId) {
      setError('Missing project ID or track ID');
      setLoading(false);
      return;
    }

    async function loadTrack() {
      try {
        setLoading(true);
        setError(null);

        const trackData = await getTrackById(trackId);
        
        if (!trackData) {
          setError('Track not found');
          setLoading(false);
          return;
        }

        // Validate track belongs to project
        if (trackData.masterProjectId !== masterProjectId) {
          setError('Track does not belong to this project');
          setLoading(false);
          return;
        }

        // Validate this is a main track (not a subtrack)
        if (trackData.parentTrackId !== null) {
          // This is actually a subtrack - redirect to subtrack workspace
          navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${trackData.parentTrackId}/subtrack/${trackId}`);
          return;
        }

        setTrack({
          id: trackData.id,
          name: trackData.name,
          description: trackData.description,
          color: trackData.color,
        });
      } catch (err) {
        console.error('[TrackWorkspace] Error loading track:', err);
        setError(err instanceof Error ? err.message : 'Failed to load track');
      } finally {
        setLoading(false);
      }
    }

    loadTrack();
  }, [masterProjectId, trackId, navigate, refreshKey]);

  // Handle track metadata refresh (from WorkspaceOverview)
  const handleTrackMetadataChange = useCallback(async () => {
    // Reload track data
    try {
      const trackData = await getTrackById(trackId);
      if (trackData) {
        setTrack({
          id: trackData.id,
          name: trackData.name,
          description: trackData.description,
          color: trackData.color,
        });
        // Force refresh by updating refreshKey
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('[TrackWorkspace] Error refreshing track:', err);
    }
  }, [trackId]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading track workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !track) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Track not found'}</p>
          {masterProjectId && (
            <button
              onClick={() => navigate(`/guardrails/projects/${masterProjectId}/roadmap`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Roadmap
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render workspace
  const projectName = activeProject?.name || 'Project';
  const backUrl = `/guardrails/projects/${masterProjectId}/roadmap`;

  return (
    <WorkspaceShell
      projectId={masterProjectId!}
      projectName={projectName}
      trackId={track.id}
      trackName={track.name}
      trackDescription={track.description}
      trackColor={track.color}
      isSubtrack={false}
      backUrl={backUrl}
      onTrackMetadataChange={handleTrackMetadataChange}
    />
  );
}
