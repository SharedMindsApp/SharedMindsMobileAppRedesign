import { useState, useRef, useCallback, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, Pause } from 'lucide-react';
import type { RoadmapItem } from '../../../lib/guardrails';
import type { ZoomLevel } from '../../../lib/guardrails/advancedGanttUtils';
import { calculateDragResult, formatDateForDB } from '../../../lib/guardrails/advancedGanttUtils';

interface DraggableGanttBarProps {
  item: RoadmapItem;
  left: number;
  width: number;
  color: string;
  anchorDate: Date;
  zoomLevel: ZoomLevel;
  rowHeight: number;
  onClick: () => void;
  onUpdate: (itemId: string, updates: { startDate?: string; endDate?: string }) => Promise<void>;
}

type DragType = 'move' | 'resize-left' | 'resize-right' | null;

const STATUS_CONFIG = {
  not_started: { icon: Clock, color: 'text-gray-400', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-blue-400', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
  blocked: { icon: AlertCircle, color: 'text-red-400', label: 'Blocked' },
};

export function DraggableGanttBar({
  item,
  left,
  width,
  color,
  anchorDate,
  zoomLevel,
  rowHeight,
  onClick,
  onUpdate,
}: DraggableGanttBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragStart, setDragStart] = useState({ x: 0, left: 0, width: 0 });
  const [previewPosition, setPreviewPosition] = useState<{ left: number; width: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: DragType) => {
      e.stopPropagation();
      if (type !== 'move') {
        e.preventDefault();
      }

      setIsDragging(true);
      setDragType(type);
      setDragStart({
        x: e.clientX,
        left,
        width,
      });
    },
    [left, width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragType) return;

      const deltaX = e.clientX - dragStart.x;
      let newLeft = dragStart.left;
      let newWidth = dragStart.width;

      if (dragType === 'move') {
        newLeft = dragStart.left + deltaX;
      } else if (dragType === 'resize-left') {
        newLeft = dragStart.left + deltaX;
        newWidth = dragStart.width - deltaX;
        if (newWidth < 40) {
          newWidth = 40;
          newLeft = dragStart.left + dragStart.width - 40;
        }
      } else if (dragType === 'resize-right') {
        newWidth = dragStart.width + deltaX;
        if (newWidth < 40) {
          newWidth = 40;
        }
      }

      setPreviewPosition({ left: newLeft, width: newWidth });
    },
    [isDragging, dragType, dragStart]
  );

  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (!isDragging || !dragType) return;

      const deltaX = e.clientX - dragStart.x;

      try {
        const result = calculateDragResult(
          item.startDate || '',
          item.endDate || '',
          deltaX,
          anchorDate,
          zoomLevel,
          dragType
        );

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(async () => {
          await onUpdate(item.id, {
            startDate: result.newStartDate,
            endDate: result.newEndDate,
          });
        }, 300);
      } catch (error) {
        console.error('Failed to update item:', error);
      }

      setIsDragging(false);
      setDragType(null);
      setPreviewPosition(null);
    },
    [isDragging, dragType, dragStart, item, timeline, onUpdate]
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayLeft = previewPosition?.left ?? left;
  const displayWidth = previewPosition?.width ?? width;

  const barOpacity = item.status === 'completed' ? 'opacity-70' : 'opacity-100';

  return (
    <div
      ref={barRef}
      className={`gantt-bar absolute rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer group ${barOpacity} ${
        isDragging ? 'z-50 scale-105' : 'z-10'
      }`}
      style={{
        left: `${displayLeft}px`,
        width: `${displayWidth}px`,
        top: '8px',
        height: `${rowHeight - 16}px`,
        backgroundColor: color,
        border: isDragging ? '2px solid rgba(59, 130, 246, 0.8)' : 'none',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 z-20"
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
        title="Resize start date"
      />

      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 z-20"
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
        title="Resize end date"
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute inset-0 px-3 py-2 flex items-center gap-2 focus:outline-none"
      >
        <StatusIcon className={`w-4 h-4 ${statusConfig.color} flex-shrink-0`} />
        <span className="text-sm font-medium text-white truncate flex-1 text-left">
          {item.title}
        </span>
      </button>

      <div className="absolute top-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {statusConfig.label}
      </div>

      {isDragging && previewPosition && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
          Dragging...
        </div>
      )}
    </div>
  );
}
