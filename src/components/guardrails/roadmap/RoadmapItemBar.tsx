/**
 * RoadmapItemBar
 * 
 * Phase 3: Enhanced roadmap item bar with status icons and improved tooltips
 */

import { CheckCircle2, Circle, Loader2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatDateForDisplay, parseDateFromDB } from '../../../lib/guardrails/infiniteTimelineUtils';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';

interface RoadmapItemBarProps {
  item: RoadmapItem;
  startX: number;
  width: number;
  isOverdue: boolean;
  progress?: number; // Optional progress (0-100) for in_progress items
  onClick?: (item: RoadmapItem) => void; // Phase 6a: Edit entry point
}

const STATUS_COLORS = {
  not_started: { bg: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-400', border: 'border-blue-600', text: 'text-white' },
  blocked: { bg: 'bg-red-400', border: 'border-red-600', text: 'text-white' },
  completed: { bg: 'bg-green-400', border: 'border-green-600', text: 'text-white' },
  on_hold: { bg: 'bg-yellow-300', border: 'border-yellow-500', text: 'text-gray-900' },
};

function getStatusIcon(status: string, size: number = 14) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={size} className="flex-shrink-0" />;
    case 'in_progress':
      return <Loader2 size={size} className="flex-shrink-0 animate-spin" />;
    case 'blocked':
      return <AlertTriangle size={size} className="flex-shrink-0" />;
    case 'on_hold':
      return <Clock size={size} className="flex-shrink-0" />;
    case 'not_started':
    default:
      return <Circle size={size} className="flex-shrink-0" />;
  }
}

function formatTooltipContent(item: RoadmapItem): string {
  const parts: string[] = [];
  parts.push(item.title);
  
  if (item.startDate) {
    const startDate = formatDateForDisplay(parseDateFromDB(item.startDate));
    if (item.endDate) {
      const endDate = formatDateForDisplay(parseDateFromDB(item.endDate));
      parts.push(`${startDate} - ${endDate}`);
    } else {
      parts.push(`Starts: ${startDate}`);
    }
  }
  
  parts.push(`Status: ${item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
  
  return parts.join('\n');
}

export function RoadmapItemBar({ item, startX, width, isOverdue, progress, onClick }: RoadmapItemBarProps) {
  const statusColors = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_started;
  const statusIcon = getStatusIcon(item.status);
  
  // Phase 3: Progress indicator for in_progress items
  const showProgress = item.status === 'in_progress' && progress !== undefined && progress > 0;
  const progressWidth = showProgress ? `${Math.min(100, Math.max(0, progress))}%` : '0%';

  // Phase 6a: Handle click to open edit
  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className={`absolute top-2 h-10 ${statusColors.bg} ${statusColors.border} border-2 rounded px-2 flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity ${
        isOverdue ? 'ring-2 ring-red-600' : ''
      }`}
      style={{
        left: `${startX}px`,
        width: `${width}px`,
      }}
      title={formatTooltipContent(item)}
      onClick={handleClick}
    >
      {/* Phase 3: Status icon */}
      <div className={`flex-shrink-0 ${statusColors.text}`}>
        {statusIcon}
      </div>

      {/* Phase 3: Progress bar for in_progress items */}
      {showProgress && (
        <div className="absolute inset-0 rounded overflow-hidden opacity-20">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>
      )}

      {/* Item title */}
      <span className={`text-sm font-medium truncate flex-1 relative z-10 ${statusColors.text}`}>
        {item.title}
      </span>

      {/* Phase 3: Progress percentage for in_progress items */}
      {showProgress && progress !== undefined && (
        <span className={`text-xs font-medium flex-shrink-0 relative z-10 ${statusColors.text}`}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
