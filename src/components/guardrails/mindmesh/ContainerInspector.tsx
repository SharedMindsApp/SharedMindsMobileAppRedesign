/**
 * Container Inspector
 *
 * Side panel showing detailed read-only information about a container.
 * Opens on click, closes on explicit close or deselect.
 */

import { useState, useEffect } from 'react';
import { X, ArrowUpRight, ExternalLink } from 'lucide-react';
import type { MindMeshContainer } from '../../../hooks/useMindMesh';
import type { ContainerMetadata } from '../../../lib/mindmesh-v2/containerMetadata';
import { PromoteContainerModal, type PromoteData } from './PromoteContainerModal';
import { handleUserIntent } from '../../../lib/mindmesh-v2/orchestrator';
import { supabase } from '../../../lib/supabase';
import {
  deriveTaskStatus,
  deriveEventStatus,
  getTaskStatusDisplay,
  getEventStatusDisplay,
  getTypeDisplay,
  formatDueDate,
  formatEventTimeWindow,
  getAuthoritativeSurface,
} from '../../../lib/taskEventViewModel';
import { getVisualTreatment, showsStatusBadge } from '../../../lib/mindmesh-v2/containerCapabilities';

interface ContainerInspectorProps {
  container: MindMeshContainer;
  metadata: ContainerMetadata | null;
  onClose: () => void;
  onRefresh: () => void;
  workspaceData: any;
}

export function ContainerInspector({
  container,
  metadata,
  onClose,
  onRefresh,
  workspaceData,
}: ContainerInspectorProps) {
  const isGhost = container.state === 'ghost';
  const [showPromoteModal, setShowPromoteModal] = useState<'track' | 'subtrack' | 'task' | 'event' | null>(null);
  const [roadmapItem, setRoadmapItem] = useState<any | null>(null);
  const [loadingRoadmapItem, setLoadingRoadmapItem] = useState(false);

  const isRoadmapItem = container.entity_type === 'roadmap_item' && container.entity_id;

  // Fetch roadmap item data if this is a task/event container
  useEffect(() => {
    if (!isRoadmapItem) {
      setRoadmapItem(null);
      return;
    }

    let cancelled = false;
    setLoadingRoadmapItem(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('roadmap_items')
          .select('id, title, description, type, status, track_id, metadata, start_date, end_date')
          .eq('id', container.entity_id!)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Failed to fetch roadmap item:', error);
          setRoadmapItem(null);
        } else {
          setRoadmapItem(data);
        }
      } catch (err) {
        console.error('Error fetching roadmap item:', err);
        if (!cancelled) {
          setRoadmapItem(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingRoadmapItem(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRoadmapItem, container.entity_id]);

  async function handlePromote(data: PromoteData): Promise<void> {
    if (showPromoteModal === 'track') {
      const intent = {
        type: 'PromoteContainerToTrack' as const,
        containerId: container.id,
        trackName: data.trackName,
        trackDescription: data.trackDescription,
        trackColor: data.trackColor,
      };

      const result = await handleUserIntent(intent, workspaceData.context);

      if (!result.success) {
        const errors = [
          ...result.planningErrors,
          ...result.executionErrors,
        ];
        throw new Error(errors.join(', '));
      }

      onRefresh();
    } else if (showPromoteModal === 'subtrack') {
      const intent = {
        type: 'PromoteContainerToSubtrack' as const,
        containerId: container.id,
        parentTrackId: data.parentTrackId!,
        subtrackName: data.trackName,
        subtrackDescription: data.trackDescription,
      };

      const result = await handleUserIntent(intent, workspaceData.context);

      if (!result.success) {
        const errors = [
          ...result.planningErrors,
          ...result.executionErrors,
        ];
        throw new Error(errors.join(', '));
      }

      onRefresh();
    } else if (showPromoteModal === 'task') {
      const intent = {
        type: 'PromoteContainerToTask' as const,
        containerId: container.id,
        parentTrackId: data.parentTrackId!,
        taskTitle: data.trackName,
        taskDescription: data.trackDescription,
        dueAt: data.dueAt,
      };

      const result = await handleUserIntent(intent, workspaceData.context);

      if (!result.success) {
        const errors = [
          ...result.planningErrors,
          ...result.executionErrors,
        ];
        throw new Error(errors.join(', '));
      }

      onRefresh();
    } else if (showPromoteModal === 'event') {
      const intent = {
        type: 'PromoteContainerToEvent' as const,
        containerId: container.id,
        parentTrackId: data.parentTrackId!,
        eventTitle: data.trackName,
        eventDescription: data.trackDescription,
        startsAt: data.startsAt!,
        endsAt: data.endsAt,
      };

      const result = await handleUserIntent(intent, workspaceData.context);

      if (!result.success) {
        const errors = [
          ...result.planningErrors,
          ...result.executionErrors,
        ];
        throw new Error(errors.join(', '));
      }

      onRefresh();
    }
  }

  if (!metadata) {
    return (
      <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Container Inspector</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close inspector"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-500">Loading metadata...</p>
        </div>
      </div>
    );
  }

  const visualTreatment = getVisualTreatment(metadata.containerType);
  const showStatus = showsStatusBadge(metadata.containerType);

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
      {/* Header with Type Indicator */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: visualTreatment.backgroundColor,
          borderColor: visualTreatment.borderColor,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{visualTreatment.badgeIcon}</span>
          <h3 className="text-lg font-semibold" style={{ color: visualTreatment.primaryColor }}>
            {visualTreatment.badgeLabel}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close inspector"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Badge */}
        <div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isGhost
                ? 'bg-gray-100 text-gray-700 border border-gray-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isGhost ? 'bg-gray-500' : 'bg-blue-500'}`} />
            {isGhost ? 'Ghost Container' : 'Active Container'}
          </div>
        </div>

        {/* Integrated Badge */}
        {metadata.authority === 'integrated' && (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Integrated — synced with Roadmap
            </div>
          </div>
        )}

        {/* Task/Event Status Section */}
        {showStatus && isRoadmapItem && roadmapItem && (
          <div className="border rounded-lg p-3" style={{
            backgroundColor: visualTreatment.backgroundColor,
            borderColor: visualTreatment.borderColor,
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {roadmapItem.type === 'task' ? '✓' : '📅'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {roadmapItem.type === 'task' ? 'Task' : 'Event'}
              </span>
            </div>

            {/* Status Badge */}
            {roadmapItem.type === 'task' && (
              <>
                {(() => {
                  const status = deriveTaskStatus(roadmapItem.status);
                  const display = getTaskStatusDisplay(status);
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${display.bgColor} ${display.color} border ${display.borderColor} mb-2`}>
                      <span>{display.icon}</span>
                      <span>{display.label}</span>
                    </div>
                  );
                })()}

                {/* Due Date */}
                {roadmapItem.metadata?.dueAt && (
                  <div className="text-xs text-gray-700 mt-2">
                    <span className="font-medium">Due:</span> {formatDueDate(roadmapItem.metadata.dueAt)}
                  </div>
                )}
              </>
            )}

            {roadmapItem.type === 'event' && (
              <>
                {(() => {
                  const status = deriveEventStatus(
                    roadmapItem.metadata?.startsAt || roadmapItem.start_date,
                    roadmapItem.metadata?.endsAt || roadmapItem.end_date
                  );
                  const display = getEventStatusDisplay(status);
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${display.bgColor} ${display.color} border ${display.borderColor} mb-2`}>
                      <span>{display.icon}</span>
                      <span>{display.label}</span>
                    </div>
                  );
                })()}

                {/* Time Window */}
                {roadmapItem.metadata?.startsAt && (
                  <div className="text-xs text-gray-700 mt-2">
                    {formatEventTimeWindow(
                      roadmapItem.metadata.startsAt,
                      roadmapItem.metadata.endsAt
                    )}
                  </div>
                )}
              </>
            )}

            {/* Managed In Note */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-medium">Completion and scheduling</span> are managed in{' '}
                <a
                  href={getAuthoritativeSurface(roadmapItem.type).path}
                  className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-0.5"
                >
                  {getAuthoritativeSurface(roadmapItem.type).name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Source Info */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Source
          </label>
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <span className="text-lg">{metadata.sourceIcon}</span>
            <span>{metadata.sourceLabel}</span>
          </div>
          {metadata.createdFromMindMesh && (
            <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
              Created from Mind Mesh
            </div>
          )}
        </div>

        {/* Local Container Notice */}
        {metadata.authority === 'local_only' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-medium">Local container</span> — exists only in Mind Mesh.
              This is a thinking space for ideas that aren't yet part of your project structure.
            </p>
          </div>
        )}

        {/* Promotion Section */}
        {metadata.authority === 'local_only' && !isGhost && (
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Integrate
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Promote this container to become part of your project structure. After promotion, it
              will sync bidirectionally with your Roadmap.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowPromoteModal('track')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <span>Promote to Track</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowPromoteModal('subtrack')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>Promote to Subtrack</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowPromoteModal('task')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>Promote to Task</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowPromoteModal('event')}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>Promote to Event</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Title
          </label>
          <div className="text-sm text-gray-900 font-medium">{metadata.title}</div>
        </div>

        {/* Description */}
        {metadata.description && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {metadata.description}
            </div>
          </div>
        )}

        {/* Additional Info */}
        {Object.keys(metadata.additionalInfo).length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Details
            </label>
            <div className="space-y-2">
              {Object.entries(metadata.additionalInfo).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between text-sm">
                  <span className="text-gray-600 font-medium">{key}:</span>
                  <span className="text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ghost Explanation */}
        {isGhost && (
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-medium">Ghost containers</span> represent items that exist in
                your Guardrails project but are not yet active in Mind Mesh. Click a ghost container
                to activate it and make it part of your working graph.
              </p>
            </div>
          </div>
        )}

        {/* Technical Details - Only show entity reference, not internal flags */}
        {metadata.authority === 'integrated' && (
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Technical
            </label>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Entity Type:</span>
                <span className="font-mono">{container.entity_type}</span>
              </div>
              <div className="flex justify-between">
                <span>Entity ID:</span>
                <span className="font-mono">{container.entity_id.slice(0, 8)}...</span>
              </div>
          </div>
        </div>
        )}
      </div>

      {/* Promotion Modal */}
      {showPromoteModal && (
        <PromoteContainerModal
          container={container}
          type={showPromoteModal}
          onClose={() => setShowPromoteModal(null)}
          onPromote={handlePromote}
        />
      )}
    </div>
  );
}
