import { useState, useEffect, useMemo } from 'react';
import { Loader, AlertCircle, KanbanSquare, X } from 'lucide-react';
import type { RoadmapSection, RoadmapItem } from '../../../lib/guardrailsTypes';
import type { TrackTreeNode } from '../../../lib/guardrails/tracksHierarchy';
import { getRoadmapSections, getRoadmapItemsBySection } from '../../../lib/guardrails';
import { getTracksTree } from '../../../lib/guardrails/tracksHierarchy';
import { useActiveTrack } from '../../../contexts/ActiveTrackContext';
import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { TaskFlowBoardWithTracks } from './TaskFlowBoardWithTracks';
import { TaskFlowMobileList } from './TaskFlowMobileList';

interface TaskFlowPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

export function TaskFlowPage({ masterProjectId, masterProjectName }: TaskFlowPageProps) {
  const { activeTrackId, activeTrackName, activeTrackPath, activeTrackColor, clearActiveTrack } = useActiveTrack();
  const [sections, setSections] = useState<RoadmapSection[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [tracks, setTracks] = useState<TrackTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [sectionsData, tracksData] = await Promise.all([
        getRoadmapSections(masterProjectId),
        getTracksTree(masterProjectId),
      ]);

      setSections(sectionsData);
      setTracks(tracksData);

      const allItems: RoadmapItem[] = [];
      for (const section of sectionsData) {
        const sectionItems = await getRoadmapItemsBySection(section.id);
        allItems.push(...sectionItems);
      }
      setItems(allItems);
    } catch (err) {
      console.error('Failed to load task flow data:', err);
      setError('Failed to load task flow data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [masterProjectId]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredItems = useMemo(() => {
    if (!activeTrackId) return items;

    const getAllDescendantIds = (trackId: string, tree: TrackTreeNode[]): Set<string> => {
      const ids = new Set<string>([trackId]);
      const findDescendants = (nodes: TrackTreeNode[]) => {
        for (const node of nodes) {
          if (ids.has(node.parentTrackId || '')) {
            ids.add(node.id);
          }
          if (node.children.length > 0) {
            findDescendants(node.children);
          }
        }
      };
      findDescendants(tree);
      return ids;
    };

    const descendantIds = getAllDescendantIds(activeTrackId, tracks);
    return items.filter((item) => {
      const itemTrackId = (item as any).track_id;
      return itemTrackId && descendantIds.has(itemTrackId);
    });
  }, [items, activeTrackId, tracks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading task flow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Error Loading Task Flow</h3>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (sections.length === 0 || items.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <ProjectHeaderTabs masterProjectId={masterProjectId} projectName={masterProjectName} />
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <p className="text-sm text-gray-600">
            Kanban-style view of your roadmap tasks
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <KanbanSquare size={32} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Your Roadmap is Empty
            </h2>
            <p className="text-gray-600 mb-6">
              Create a section or task in the Roadmap view to populate Task Flow. Once you
              have tasks, you'll be able to manage them across different status columns here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeaderTabs masterProjectId={masterProjectId} projectName={masterProjectName} />

      {activeTrackId && (
        <div
          className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between"
          style={{
            borderLeftWidth: '4px',
            borderLeftColor: activeTrackColor || '#3B82F6',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">Viewing Track:</span>
              <span className="text-sm font-semibold text-blue-900">{activeTrackName}</span>
            </div>
            {activeTrackPath.length > 1 && (
              <span className="text-xs text-blue-700">
                {activeTrackPath.slice(0, -1).join(' → ')}
              </span>
            )}
          </div>
          <button
            onClick={clearActiveTrack}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded transition-colors"
          >
            <X size={14} />
            Clear Filter
          </button>
        </div>
      )}

      {/* Desktop-only header text */}
      {!isMobile && (
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <p className="text-sm text-gray-600">
            {activeTrackId
              ? `Showing ${filteredItems.length} task${filteredItems.length !== 1 ? 's' : ''} in this track`
              : 'Drag tasks between tracks to organize your work'}
          </p>
        </div>
      )}

      {/* Desktop: Kanban Board with Tracks */}
      {!isMobile ? (
        <TaskFlowBoardWithTracks
          items={filteredItems}
          sections={sections}
          onRefresh={loadData}
          masterProjectId={masterProjectId}
        />
      ) : (
        /* Mobile: Single-column Status-first View */
        <TaskFlowMobileList
          items={filteredItems}
          sections={sections}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
