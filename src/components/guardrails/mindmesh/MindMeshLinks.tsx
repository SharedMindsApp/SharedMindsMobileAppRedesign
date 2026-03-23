import { useState } from 'react';
import { X } from 'lucide-react';
import { deleteLink } from '../../../lib/guardrails/mindmesh';
import type { MindMeshNode, MindMeshNodeLink } from '../../../lib/guardrails/mindmeshTypes';

interface Props {
  links: MindMeshNodeLink[];
  nodes: MindMeshNode[];
  onDeleteLink: (linkId: string) => void;
}

export function MindMeshLinks({ links, nodes, onDeleteLink }: Props) {
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  function getNodeCenter(node: MindMeshNode) {
    return {
      x: node.x_position + node.width / 2,
      y: node.y_position + node.height / 2,
    };
  }

  function getPortPosition(node: MindMeshNode, portId: string | null): { x: number; y: number } {
    if (!portId) {
      return getNodeCenter(node);
    }

    const baseX = node.x_position;
    const baseY = node.y_position;
    const width = node.width;
    const height = node.height;

    switch (portId) {
      case 'input-top':
        return { x: baseX, y: baseY + height * 0.25 };
      case 'input-bottom':
        return { x: baseX, y: baseY + height * 0.75 };
      case 'output-top':
        return { x: baseX + width, y: baseY + height * 0.25 };
      case 'output-bottom':
        return { x: baseX + width, y: baseY + height * 0.75 };
      default:
        return getNodeCenter(node);
    }
  }

  function getLinkColor(linkType: MindMeshNodeLink['link_type']) {
    switch (linkType) {
      case 'dependency':
        return '#ef4444';
      case 'supporting':
        return '#3b82f6';
      case 'reference':
        return '#6b7280';
      case 'offshoot':
        return '#a855f7';
      default:
        return '#6b7280';
    }
  }

  async function handleDeleteLink(linkId: string) {
    try {
      await deleteLink(linkId);
      onDeleteLink(linkId);
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {links.map(link => {
        const fromNode = nodeMap.get(link.from_node_id);
        const toNode = nodeMap.get(link.to_node_id);

        if (!fromNode || !toNode) return null;

        const from = getPortPosition(fromNode, link.source_port_id);
        const to = getPortPosition(toNode, link.target_port_id);

        const color = getLinkColor(link.link_type);
        const isHovered = hoveredLinkId === link.id;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={link.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isHovered ? 3 : 2}
              markerEnd="url(#arrowhead)"
              style={{ color }}
              className="pointer-events-auto cursor-pointer transition-all"
              onMouseEnter={() => setHoveredLinkId(link.id)}
              onMouseLeave={() => setHoveredLinkId(null)}
            />

            {isHovered && (
              <g>
                <circle
                  cx={midX}
                  cy={midY}
                  r="12"
                  fill="white"
                  stroke={color}
                  strokeWidth="2"
                  className="pointer-events-auto cursor-pointer"
                />
                <foreignObject
                  x={midX - 8}
                  y={midY - 8}
                  width="16"
                  height="16"
                  className="pointer-events-auto"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLink(link.id);
                    }}
                    className="w-full h-full flex items-center justify-center hover:bg-red-50 rounded-full"
                    title="Delete link"
                  >
                    <X size={12} className="text-red-600" />
                  </button>
                </foreignObject>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
