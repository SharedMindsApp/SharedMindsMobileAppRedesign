/**
 * SubtrackWorkspace Component
 * 
 * Phase 3.0: Track & Subtrack Workspace Foundation
 * 
 * Renders workspace for a subtrack (nested under a parent track).
 * Fetches subtrack and parent track data, passes it to WorkspaceShell.
 * 
 * ARCHITECTURAL RULES (Phase 3.0):
 * 
 * What this component CAN do:
 * - ✅ Fetch subtrack and parent track data via service layer
 * - ✅ Validate subtrack existence
 * - ✅ Validate parent-child relationship
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

export function SubtrackWorkspace() {
  const { masterProjectId, trackId: parentTrackId, subtrackId } = useParams<{
    masterProjectId: string;
    trackId: string;
    subtrackId: string;
  }>();
  const { activeProject } = useActiveProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subtrack, setSubtrack] = useState<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
  } | null>(null);
  const [parentTrack, setParentTrack] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!masterProjectId || !parentTrackId || !subtrackId) {
      setError('Missing project ID, parent track ID, or subtrack ID');
      setLoading(false);
      return;
    }

    async function loadTracks() {
      try {
        setLoading(true);
        setError(null);

        // Load subtrack
        const subtrackData = await getTrackById(subtrackId);
        
        if (!subtrackData) {
          setError('Subtrack not found');
          setLoading(false);
          return;
        }

        // Validate subtrack belongs to project
        if (subtrackData.masterProjectId !== masterProjectId) {
          setError('Subtrack does not belong to this project');
          setLoading(false);
          return;
        }

        // Validate this is actually a subtrack (has parent)
        if (subtrackData.parentTrackId === null) {
          setError('Invalid subtrack: This is a main track');
          setLoading(false);
          return;
        }

        // Validate parent relationship - if mismatch, redirect to correct URL
        if (subtrackData.parentTrackId !== parentTrackId) {
          // Redirect to the correct parent track URL
          navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${subtrackData.parentTrackId}/subtrack/${subtrackId}`, { replace: true });
          return;
        }

        // Load parent track
        const parentTrackData = await getTrackById(parentTrackId);
        
        if (!parentTrackData) {
          setError('Parent track not found');
          setLoading(false);
          return;
        }

        // Validate parent track belongs to project
        if (parentTrackData.masterProjectId !== masterProjectId) {
          setError('Parent track does not belong to this project');
          setLoading(false);
          return;
        }

        setSubtrack({
          id: subtrackData.id,
          name: subtrackData.name,
          description: subtrackData.description,
          color: subtrackData.color,
        });

        setParentTrack({
          id: parentTrackData.id,
          name: parentTrackData.name,
        });
      } catch (err) {
        console.error('[SubtrackWorkspace] Error loading tracks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    }

    loadTracks();
  }, [masterProjectId, parentTrackId, subtrackId, navigate]);

  // Handle track metadata refresh (from WorkspaceOverview)
  const handleTrackMetadataChange = useCallback(async () => {
    // Reload subtrack data
    if (!masterProjectId || !parentTrackId || !subtrackId) return;
    
    try {
      const subtrackData = await getTrackById(subtrackId);
      if (subtrackData) {
        setSubtrack({
          id: subtrackData.id,
          name: subtrackData.name,
          description: subtrackData.description,
          color: subtrackData.color,
        });
        
        // If parent changed, redirect to correct URL
        if (subtrackData.parentTrackId !== parentTrackId) {
          navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${subtrackData.parentTrackId}/subtrack/${subtrackId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('[SubtrackWorkspace] Error refreshing subtrack:', err);
    }
  }, [masterProjectId, parentTrackId, subtrackId, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading subtrack workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !subtrack || !parentTrack) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Subtrack not found'}</p>
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
      trackId={subtrack.id}
      trackName={subtrack.name}
      trackDescription={subtrack.description}
      trackColor={subtrack.color}
      parentTrackId={parentTrack.id}
      parentTrackName={parentTrack.name}
      isSubtrack={true}
      backUrl={backUrl}
      onTrackMetadataChange={handleTrackMetadataChange}
    />
  );
}
