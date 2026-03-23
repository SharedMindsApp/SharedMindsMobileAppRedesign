import { useState, useEffect } from 'react';
import { Network, Loader, AlertCircle } from 'lucide-react';
import type {
  RoadmapSection,
  RoadmapItem,
  OffshootIdea,
  RoadmapLink,
} from '../../../lib/guardrailsTypes';
import type { Track } from '../../../lib/guardrails/tracksTypes';
import {
  getRoadmapSections,
  getRoadmapItemsBySection,
  getOffshootIdeas,
  getRoadmapLinks,
} from '../../../lib/guardrails';
import {
  generateInitialPositions,
  loadNodePositions,
  recalculateLayout,
  optimizeLinkedNodes,
  saveNodePositions,
} from '../../../lib/nodesLayout';
import { getTracksForProject } from '../../../lib/guardrails/tracks';
import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { NodesCanvas } from './NodesCanvas';
import { AddSideIdeaModal } from './AddSideIdeaModal';

interface NodesPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

export function NodesPage({ masterProjectId, masterProjectName }: NodesPageProps) {
  const [sections, setSections] = useState<RoadmapSection[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [sideIdeas, setSideIdeas] = useState<OffshootIdea[]>([]);
  const [links, setLinks] = useState<RoadmapLink[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddIdeaModalOpen, setIsAddIdeaModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [sectionsData, ideasData, linksData, tracksData] = await Promise.all([
        getRoadmapSections(masterProjectId),
        getOffshootIdeas(masterProjectId),
        getRoadmapLinks(masterProjectId),
        getTracksForProject(masterProjectId),
      ]);

      setSections(sectionsData);
      setSideIdeas(ideasData);
      setLinks(linksData);
      setTracks(tracksData);

      const allItems: RoadmapItem[] = [];
      for (const section of sectionsData) {
        const sectionItems = await getRoadmapItemsBySection(section.id);
        allItems.push(...sectionItems);
      }
      setItems(allItems);
    } catch (err) {
      console.error('Failed to load nodes data:', err);
      setError('Failed to load nodes data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [masterProjectId]);

  const positions = (() => {
    if (loading) return new Map();

    const stored = loadNodePositions(masterProjectId);

    if (stored && stored.size > 0) {
      const recalculated = recalculateLayout(stored, sections, items, sideIdeas, links);
      if (recalculated !== stored) {
        saveNodePositions(masterProjectId, recalculated);
      }
      return recalculated;
    }

    const initial = generateInitialPositions(sections, items, sideIdeas, links);
    const optimized = optimizeLinkedNodes(initial, links);
    saveNodePositions(masterProjectId, optimized);
    return optimized;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading nodes view...</p>
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
              <h3 className="font-semibold text-gray-900">Error Loading Nodes</h3>
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

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-50">
        <ProjectHeaderTabs masterProjectId={masterProjectId} projectName={masterProjectName} />
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <p className="text-sm text-gray-600">
            Interactive mind map of roadmap items and dependencies
          </p>
        </div>

        {items.length === 0 && sideIdeas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Network size={32} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Items to Display
              </h2>
              <p className="text-gray-600 mb-6">
                Create roadmap items in the Roadmap view or add side ideas here to start
                building your project mind map.
              </p>
              <button
                onClick={() => setIsAddIdeaModalOpen(true)}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Add Your First Side Idea
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <NodesCanvas
              masterProjectId={masterProjectId}
              sections={sections}
              items={items}
              sideIdeas={sideIdeas}
              links={links}
              initialPositions={positions}
              onRefresh={loadData}
              onAddSideIdea={() => setIsAddIdeaModalOpen(true)}
              tracks={tracks}
            />
          </div>
        )}
      </div>

      <AddSideIdeaModal
        masterProjectId={masterProjectId}
        isOpen={isAddIdeaModalOpen}
        onClose={() => setIsAddIdeaModalOpen(false)}
        onSuccess={loadData}
      />
    </>
  );
}
