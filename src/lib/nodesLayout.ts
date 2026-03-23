import type { RoadmapItem, RoadmapSection, RoadmapLink, OffshootIdea } from './guardrailsTypes';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  type: 'roadmap' | 'side_idea' | 'section_header';
}

export interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  sectionSpacing: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 280,
  nodeHeight: 120,
  horizontalSpacing: 100,
  verticalSpacing: 80,
  sectionSpacing: 200,
};

export function generateInitialPositions(
  sections: RoadmapSection[],
  items: RoadmapItem[],
  sideIdeas: OffshootIdea[],
  links: RoadmapLink[],
  config: LayoutConfig = DEFAULT_CONFIG
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  const itemsBySectionId = new Map<string, RoadmapItem[]>();
  items.forEach((item) => {
    const sectionItems = itemsBySectionId.get(item.section_id) || [];
    sectionItems.push(item);
    itemsBySectionId.set(item.section_id, sectionItems);
  });

  let currentY = 0;

  sections.forEach((section, sectionIndex) => {
    const sectionItems = itemsBySectionId.get(section.id) || [];

    positions.set(`section-${section.id}`, {
      id: `section-${section.id}`,
      x: 50,
      y: currentY,
      type: 'section_header',
    });

    const itemsPerRow = 4;
    sectionItems.forEach((item, itemIndex) => {
      const row = Math.floor(itemIndex / itemsPerRow);
      const col = itemIndex % itemsPerRow;

      positions.set(item.id, {
        id: item.id,
        x: 50 + col * (config.nodeWidth + config.horizontalSpacing),
        y: currentY + 80 + row * (config.nodeHeight + config.verticalSpacing),
        type: 'roadmap',
      });
    });

    const rows = Math.ceil(sectionItems.length / itemsPerRow);
    currentY += 80 + Math.max(rows, 1) * (config.nodeHeight + config.verticalSpacing) + config.sectionSpacing;
  });

  const sideIdeasX = 50 + 5 * (config.nodeWidth + config.horizontalSpacing);
  sideIdeas.forEach((idea, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;

    positions.set(idea.id, {
      id: idea.id,
      x: sideIdeasX + col * (config.nodeWidth + config.horizontalSpacing),
      y: 100 + row * (config.nodeHeight + config.verticalSpacing),
      type: 'side_idea',
    });
  });

  return positions;
}

export function optimizeLinkedNodes(
  positions: Map<string, NodePosition>,
  links: RoadmapLink[]
): Map<string, NodePosition> {
  const optimized = new Map(positions);

  links.forEach((link) => {
    const sourcePos = optimized.get(link.source_item_id);
    const targetPos = optimized.get(link.target_item_id);

    if (sourcePos && targetPos && sourcePos.type === 'roadmap' && targetPos.type === 'roadmap') {
      const distance = Math.sqrt(
        Math.pow(targetPos.x - sourcePos.x, 2) + Math.pow(targetPos.y - sourcePos.y, 2)
      );

      if (distance > 800) {
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;

        optimized.set(targetPos.id, {
          ...targetPos,
          x: midX + (targetPos.x - sourcePos.x) * 0.3,
          y: midY + (targetPos.y - sourcePos.y) * 0.3,
        });
      }
    }
  });

  return optimized;
}

const STORAGE_KEY_PREFIX = 'nodes_layout_';

export function saveNodePositions(masterProjectId: string, positions: Map<string, NodePosition>): void {
  const data = Array.from(positions.entries());
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${masterProjectId}`,
    JSON.stringify(data)
  );
}

export function loadNodePositions(masterProjectId: string): Map<string, NodePosition> | null {
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${masterProjectId}`);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    return new Map(data);
  } catch (error) {
    console.error('Failed to parse stored positions:', error);
    return null;
  }
}

export function updateNodePosition(
  positions: Map<string, NodePosition>,
  nodeId: string,
  x: number,
  y: number
): Map<string, NodePosition> {
  const updated = new Map(positions);
  const existing = updated.get(nodeId);

  if (existing) {
    updated.set(nodeId, { ...existing, x, y });
  }

  return updated;
}

export function calculateLinkPath(
  source: NodePosition,
  target: NodePosition,
  config: LayoutConfig = DEFAULT_CONFIG
): string {
  const sourceX = source.x + config.nodeWidth / 2;
  const sourceY = source.y + config.nodeHeight / 2;
  const targetX = target.x + config.nodeWidth / 2;
  const targetY = target.y + config.nodeHeight / 2;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const controlOffset = Math.min(distance * 0.3, 150);

  const angle = Math.atan2(dy, dx);
  const controlX1 = sourceX + Math.cos(angle) * controlOffset;
  const controlY1 = sourceY + Math.sin(angle) * controlOffset;
  const controlX2 = targetX - Math.cos(angle) * controlOffset;
  const controlY2 = targetY - Math.sin(angle) * controlOffset;

  return `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
}

export function recalculateLayout(
  existingPositions: Map<string, NodePosition>,
  sections: RoadmapSection[],
  items: RoadmapItem[],
  sideIdeas: OffshootIdea[],
  links: RoadmapLink[]
): Map<string, NodePosition> {
  const existingIds = new Set(existingPositions.keys());
  const currentIds = new Set([
    ...sections.map(s => `section-${s.id}`),
    ...items.map(i => i.id),
    ...sideIdeas.map(si => si.id),
  ]);

  const hasNewNodes = Array.from(currentIds).some(id => !existingIds.has(id));

  if (!hasNewNodes) {
    return existingPositions;
  }

  const newLayout = generateInitialPositions(sections, items, sideIdeas, links);

  existingIds.forEach(id => {
    if (currentIds.has(id) && existingPositions.has(id)) {
      const existing = existingPositions.get(id)!;
      newLayout.set(id, existing);
    }
  });

  return newLayout;
}
