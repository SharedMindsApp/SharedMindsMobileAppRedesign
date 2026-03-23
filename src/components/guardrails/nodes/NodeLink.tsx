import { useState } from 'react';
import type { RoadmapLink } from '../../../lib/guardrailsTypes';
import type { NodePosition } from '../../../lib/nodesLayout';
import { calculateLinkPath } from '../../../lib/nodesLayout';

interface NodeLinkProps {
  link: RoadmapLink;
  sourcePosition: NodePosition;
  targetPosition: NodePosition;
  onHoverChange?: (linkId: string | null) => void;
}

const linkTypeColors = {
  dependency: '#3b82f6',
  related: '#8b5cf6',
  blocks: '#ef4444',
  influences: '#10b981',
};

const linkTypeLabels = {
  dependency: 'Dependency',
  related: 'Related',
  blocks: 'Blocks',
  influences: 'Influences',
};

export function NodeLink({
  link,
  sourcePosition,
  targetPosition,
  onHoverChange,
}: NodeLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  const path = calculateLinkPath(sourcePosition, targetPosition);
  const color = linkTypeColors[link.link_type as keyof typeof linkTypeColors] || '#6b7280';

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverChange?.(link.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange?.(null);
  };

  const midX = (sourcePosition.x + targetPosition.x) / 2 + 140;
  const midY = (sourcePosition.y + targetPosition.y) / 2 + 60;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={isHovered ? 3 : 2}
        strokeOpacity={isHovered ? 0.9 : 0.5}
        strokeDasharray={link.link_type === 'related' ? '5,5' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="transition-all cursor-pointer"
      />

      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      />

      {isHovered && (
        <g>
          <rect
            x={midX - 45}
            y={midY - 15}
            width={90}
            height={30}
            fill="white"
            stroke={color}
            strokeWidth={2}
            rx={6}
            className="drop-shadow-lg"
          />
          <text
            x={midX}
            y={midY + 5}
            textAnchor="middle"
            className="text-xs font-medium"
            fill={color}
          >
            {linkTypeLabels[link.link_type as keyof typeof linkTypeLabels] || link.link_type}
          </text>
        </g>
      )}

      <circle
        cx={targetPosition.x + 140}
        cy={targetPosition.y + 60}
        r={isHovered ? 6 : 4}
        fill={color}
        className="transition-all"
      />
    </g>
  );
}
