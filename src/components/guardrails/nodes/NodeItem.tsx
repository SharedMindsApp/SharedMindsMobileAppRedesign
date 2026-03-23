import { Calendar, Lightbulb } from 'lucide-react';
import type { RoadmapItem, OffshootIdea, RoadmapSection } from '../../../lib/guardrailsTypes';
import type { NodePosition } from '../../../lib/nodesLayout';
import { formatDateRange } from '../../../lib/ganttUtils';

interface NodeItemProps {
  position: NodePosition;
  item?: RoadmapItem;
  sideIdea?: OffshootIdea;
  section?: RoadmapSection;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  isLinkMode?: boolean;
}

const statusColors = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  blocked: 'bg-red-100 text-red-700 border-red-300',
};

export function NodeItem({
  position,
  item,
  sideIdea,
  section,
  onClick,
  onDragStart,
  isSelected,
  isLinkMode,
}: NodeItemProps) {
  if (position.type === 'section_header' && section) {
    return (
      <div
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: '1200px',
        }}
        className="pointer-events-none"
      >
        <div className="bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-400 pl-4 py-2">
          <h3 className="text-lg font-bold text-gray-800">{section.title}</h3>
        </div>
      </div>
    );
  }

  if (position.type === 'roadmap' && item) {
    return (
      <div
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: '280px',
        }}
        onMouseDown={isLinkMode ? onClick : onDragStart}
        onClick={isLinkMode ? onClick : undefined}
        className={`cursor-${isLinkMode ? 'pointer' : 'grab'} active:cursor-${isLinkMode ? 'pointer' : 'grabbing'}`}
      >
        <div
          className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all border-2 ${
            isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{ borderLeftColor: item.color || '#3b82f6', borderLeftWidth: '6px' }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 text-sm leading-tight flex-1">
                {item.title}
              </h4>
              <div
                className={`text-xs px-2 py-1 rounded-full border ${
                  statusColors[item.status]
                }`}
              >
                {item.status.replace('_', ' ')}
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {item.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar size={14} />
              <span>{formatDateRange(item.start_date, item.end_date)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (position.type === 'side_idea' && sideIdea) {
    return (
      <div
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: '280px',
        }}
        onMouseDown={isLinkMode ? onClick : onDragStart}
        onClick={isLinkMode ? onClick : undefined}
        className={`cursor-${isLinkMode ? 'pointer' : 'grab'} active:cursor-${isLinkMode ? 'pointer' : 'grabbing'}`}
      >
        <div
          className={`bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-md hover:shadow-lg transition-all border-2 ${
            isSelected ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-yellow-200'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb size={18} className="text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                  {sideIdea.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">Side Idea</p>
              </div>
            </div>

            {sideIdea.description && (
              <p className="text-xs text-gray-600 line-clamp-3 mt-2">
                {sideIdea.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
