import { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type {
  RoadmapSection,
  RoadmapItem,
  OffshootIdea,
  RoadmapLink,
} from '../../../lib/guardrailsTypes';
import type { Track } from '../../../lib/guardrails/tracksTypes';
import type { NodePosition } from '../../../lib/nodesLayout';
import {
  generateInitialPositions,
  updateNodePosition,
  saveNodePositions,
  optimizeLinkedNodes,
} from '../../../lib/nodesLayout';
import { NodeItem } from './NodeItem';
import { NodeLink } from './NodeLink';
import { NodesToolbar } from './NodesToolbar';
import { ItemDrawer } from '../roadmap/ItemDrawer';
import { IdeaDrawer } from './IdeaDrawer';
import { CreateLinkModal } from './CreateLinkModal';
import { PromoteIdeaModal } from './PromoteIdeaModal';

interface NodesCanvasProps {
  masterProjectId: string;
  sections: RoadmapSection[];
  items: RoadmapItem[];
  sideIdeas: OffshootIdea[];
  links: RoadmapLink[];
  initialPositions: Map<string, NodePosition>;
  onRefresh: () => void;
  onAddSideIdea: () => void;
  tracks?: Track[];
}

export function NodesCanvas({
  masterProjectId,
  sections,
  items,
  sideIdeas,
  links,
  initialPositions,
  onRefresh,
  onAddSideIdea,
  tracks = [],
}: NodesCanvasProps) {
  const [positions, setPositions] = useState<Map<string, NodePosition>>(initialPositions);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showSectionLabels, setShowSectionLabels] = useState(true);
  const [selectedRoadmapItem, setSelectedRoadmapItem] = useState<RoadmapItem | null>(null);
  const [selectedSideIdea, setSelectedSideIdea] = useState<OffshootIdea | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [promoteIdeaId, setPromoteIdeaId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  const transformRef = useRef<any>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handleAutoLayout = () => {
    const newPositions = generateInitialPositions(sections, items, sideIdeas, links);
    const optimized = optimizeLinkedNodes(newPositions, links);
    setPositions(optimized);
    saveNodePositions(masterProjectId, optimized);
  };

  const handleResetView = () => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  };

  const handleNodeClick = (nodeId: string, type: 'roadmap' | 'side_idea') => {
    if (isLinkMode) {
      if (!linkSourceId) {
        setLinkSourceId(nodeId);
      } else if (linkSourceId !== nodeId) {
        setLinkTargetId(nodeId);
      }
    } else {
      if (type === 'roadmap') {
        const item = items.find((i) => i.id === nodeId);
        if (item) setSelectedRoadmapItem(item);
      } else if (type === 'side_idea') {
        const idea = sideIdeas.find((si) => si.id === nodeId);
        if (idea) setSelectedSideIdea(idea);
      }
    }
  };

  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    if (isLinkMode) return;

    e.stopPropagation();
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !dragStartPos.current) return;

      const dx = moveEvent.clientX - dragStartPos.current.x;
      const dy = moveEvent.clientY - dragStartPos.current.y;

      const currentPos = positions.get(nodeId);
      if (currentPos) {
        const scale = transformRef.current?.state?.scale || 1;
        const updatedPositions = updateNodePosition(
          positions,
          nodeId,
          currentPos.x + dx / scale,
          currentPos.y + dy / scale
        );
        setPositions(updatedPositions);
      }

      dragStartPos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      dragStartPos.current = null;
      saveNodePositions(masterProjectId, positions);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleToggleLinkMode = () => {
    setIsLinkMode(!isLinkMode);
    setLinkSourceId(null);
    setLinkTargetId(null);
  };

  const handleCloseLinkModal = () => {
    setLinkSourceId(null);
    setLinkTargetId(null);
  };

  const handleLinkSuccess = () => {
    setLinkSourceId(null);
    setLinkTargetId(null);
    onRefresh();
  };

  const handlePromoteIdea = (ideaId: string) => {
    setPromoteIdeaId(ideaId);
    setSelectedSideIdea(null);
  };

  const linkSourceItem = linkSourceId ? items.find((i) => i.id === linkSourceId) : null;
  const linkTargetItem = linkTargetId ? items.find((i) => i.id === linkTargetId) : null;
  const promoteIdea = promoteIdeaId ? sideIdeas.find((si) => si.id === promoteIdeaId) : null;

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      <NodesToolbar
        isLinkMode={isLinkMode}
        onToggleLinkMode={handleToggleLinkMode}
        onAutoLayout={handleAutoLayout}
        onResetView={handleResetView}
        showSectionLabels={showSectionLabels}
        onToggleSectionLabels={() => setShowSectionLabels(!showSectionLabels)}
        onAddSideIdea={onAddSideIdea}
      />

      <TransformWrapper
        ref={transformRef}
        initialScale={0.8}
        minScale={0.3}
        maxScale={2}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
          }}
          contentStyle={{
            width: '100%',
            height: '100%',
          }}
        >
          <div className="relative" style={{ width: '5000px', height: '5000px' }}>
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="#d1d5db" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              {links.map((link) => {
                const sourcePos = positions.get(link.source_item_id);
                const targetPos = positions.get(link.target_item_id);

                if (!sourcePos || !targetPos) return null;

                return (
                  <NodeLink
                    key={link.id}
                    link={link}
                    sourcePosition={sourcePos}
                    targetPosition={targetPos}
                    onHoverChange={setHoveredLinkId}
                  />
                );
              })}
            </svg>

            {showSectionLabels &&
              sections.map((section) => {
                const sectionPos = positions.get(`section-${section.id}`);
                if (!sectionPos) return null;

                return (
                  <NodeItem
                    key={`section-${section.id}`}
                    position={sectionPos}
                    section={section}
                    onClick={() => {}}
                    onDragStart={() => {}}
                  />
                );
              })}

            {items.map((item) => {
              const pos = positions.get(item.id);
              if (!pos) return null;

              const isHighlighted =
                hoveredLinkId &&
                links.some(
                  (l) =>
                    l.id === hoveredLinkId &&
                    (l.source_item_id === item.id || l.target_item_id === item.id)
                );

              return (
                <NodeItem
                  key={item.id}
                  position={pos}
                  item={item}
                  onClick={() => handleNodeClick(item.id, 'roadmap')}
                  onDragStart={(e) => handleNodeDragStart(item.id, e)}
                  isSelected={linkSourceId === item.id || isHighlighted}
                  isLinkMode={isLinkMode}
                />
              );
            })}

            {sideIdeas.map((idea) => {
              const pos = positions.get(idea.id);
              if (!pos) return null;

              return (
                <NodeItem
                  key={idea.id}
                  position={pos}
                  sideIdea={idea}
                  onClick={() => handleNodeClick(idea.id, 'side_idea')}
                  onDragStart={(e) => handleNodeDragStart(idea.id, e)}
                  isSelected={linkSourceId === idea.id}
                  isLinkMode={isLinkMode}
                />
              );
            })}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {selectedRoadmapItem && (
        <ItemDrawer
          item={selectedRoadmapItem}
          isOpen={!!selectedRoadmapItem}
          onClose={() => setSelectedRoadmapItem(null)}
          onUpdate={onRefresh}
          tracks={tracks}
        />
      )}

      {selectedSideIdea && (
        <IdeaDrawer
          idea={selectedSideIdea}
          isOpen={!!selectedSideIdea}
          onClose={() => setSelectedSideIdea(null)}
          onUpdate={onRefresh}
          onPromote={handlePromoteIdea}
          tracks={tracks}
        />
      )}

      {linkSourceItem && linkTargetItem && (
        <CreateLinkModal
          sourceItemId={linkSourceItem.id}
          targetItemId={linkTargetItem.id}
          sourceItemTitle={linkSourceItem.title}
          targetItemTitle={linkTargetItem.title}
          isOpen={!!linkSourceItem && !!linkTargetItem}
          onClose={handleCloseLinkModal}
          onSuccess={handleLinkSuccess}
        />
      )}

      {promoteIdea && (
        <PromoteIdeaModal
          idea={promoteIdea}
          sections={sections}
          isOpen={!!promoteIdea}
          onClose={() => setPromoteIdeaId(null)}
          onSuccess={() => {
            setPromoteIdeaId(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
