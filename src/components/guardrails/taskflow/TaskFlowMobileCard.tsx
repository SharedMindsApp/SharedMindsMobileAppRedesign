/**
 * TaskFlowMobileCard - Mobile-optimized task card with swipe gestures
 * 
 * Features:
 * - Swipe left → Mark Complete
 * - Swipe right → Mark Blocked
 * - Tap status badge → Cycle status
 * - Long-press → Status menu (future enhancement)
 * - Collapsed (default) and expanded states
 */

import { useState, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { RoadmapItem } from '../../../lib/guardrailsTypes';
import { formatDateRange } from '../../../lib/ganttUtils';
import {
  deriveTaskStatus,
  deriveEventStatus,
  getTaskStatusDisplay,
  getEventStatusDisplay,
} from '../../../lib/taskEventViewModel';

interface TaskFlowMobileCardProps {
  item: RoadmapItem;
  sectionName: string;
  onStatusChange: (itemId: string, newStatus: RoadmapItem['status']) => void;
  onClick: () => void;
}

// Status cycle: when clicking status badge, cycle through in this order
const STATUS_CYCLE: Record<RoadmapItem['status'], RoadmapItem['status'][]> = {
  not_started: ['in_progress', 'blocked', 'completed'],
  in_progress: ['blocked', 'completed', 'not_started'],
  blocked: ['in_progress', 'completed', 'not_started'],
  completed: ['not_started', 'in_progress', 'blocked'],
};

// Get next status in cycle
function getNextStatus(currentStatus: RoadmapItem['status']): RoadmapItem['status'] {
  const cycle = STATUS_CYCLE[currentStatus];
  return cycle[0]; // Always move to first option in cycle
}

const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger action
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity (px/ms)

export function TaskFlowMobileCard({
  item,
  sectionName,
  onStatusChange,
  onClick,
}: TaskFlowMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      setIsSwiping(true);
      // Clamp swipe offset to reasonable bounds
      const clampedOffset = Math.max(-150, Math.min(150, deltaX));
      setSwipeOffset(clampedOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !isSwiping) {
      touchStartRef.current = null;
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    const touchDuration = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(swipeOffset) / touchDuration;

    // Determine swipe action
    if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (swipeOffset > 0) {
        // Swipe right → Mark Blocked
        if (item.status !== 'blocked') {
          onStatusChange(item.id, 'blocked');
        }
      } else {
        // Swipe left → Mark Complete
        if (item.status !== 'completed') {
          onStatusChange(item.id, 'completed');
        }
      }
    }

    // Reset
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handleStatusBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(item.status);
    onStatusChange(item.id, nextStatus);
  };

  const getStatusDisplay = () => {
    // Type-safe check for item.type and item.metadata (they may not exist on all RoadmapItem types)
    const itemType = (item as any).type;
    const itemMetadata = (item as any).metadata;

    if (itemType === 'task') {
      const status = deriveTaskStatus(item.status);
      return getTaskStatusDisplay(status);
    }
    if (itemType === 'event' && itemMetadata?.startsAt) {
      const status = deriveEventStatus(
        itemMetadata.startsAt,
        itemMetadata.endsAt || item.end_date
      );
      return getEventStatusDisplay(status);
    }
    // Fallback for basic status
    const statusConfig: Record<RoadmapItem['status'], { icon: string; label: string; bgColor: string; color: string; borderColor: string }> = {
      not_started: { icon: '○', label: 'Not Started', bgColor: 'bg-gray-100', color: 'text-gray-700', borderColor: 'border-gray-300' },
      in_progress: { icon: '◐', label: 'In Progress', bgColor: 'bg-blue-100', color: 'text-blue-700', borderColor: 'border-blue-300' },
      blocked: { icon: '⚠', label: 'Blocked', bgColor: 'bg-red-100', color: 'text-red-700', borderColor: 'border-red-300' },
      completed: { icon: '✓', label: 'Done', bgColor: 'bg-green-100', color: 'text-green-700', borderColor: 'border-green-300' },
    };
    return statusConfig[item.status];
  };

  const statusDisplay = getStatusDisplay();
  const isOverdue = item.end_date && new Date(item.end_date) < new Date() && item.status !== 'completed';
  const isDueToday = item.end_date && new Date(item.end_date).toDateString() === new Date().toDateString();

  return (
    <div
      ref={cardRef}
      className="relative bg-white rounded-lg border border-gray-200 shadow-sm"
      style={{
        transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe action indicators */}
      {isSwiping && (
        <>
          {swipeOffset > 0 && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 bg-red-50 rounded-l-lg">
              <span className="text-red-600 text-sm font-medium">Block</span>
            </div>
          )}
          {swipeOffset < 0 && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 bg-green-50 rounded-r-lg">
              <span className="text-green-600 text-sm font-medium">Done</span>
            </div>
          )}
        </>
      )}

      {/* Card content */}
      <div
        className="p-4"
        onClick={() => {
          if (!isSwiping) {
            onClick();
          }
        }}
      >
        {/* Header: Title and Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base text-gray-900 leading-tight mb-1">
              {item.title}
            </h4>
            {item.description && isExpanded && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                {item.description}
              </p>
            )}
          </div>
          <button
            onClick={handleStatusBadgeClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0 min-h-[44px] ${statusDisplay.bgColor} ${statusDisplay.color} ${statusDisplay.borderColor} active:scale-95 transition-transform`}
          >
            <span>{statusDisplay.icon}</span>
            <span>{statusDisplay.label}</span>
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span
              className={isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-orange-600 font-medium' : ''}
            >
              {formatDateRange(item.start_date, item.end_date)}
            </span>
          </div>
          <span className="text-gray-300">•</span>
          <span>{sectionName}</span>
        </div>

        {/* Expand/Collapse button */}
        {item.description && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Show description</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Left border accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: item.color || '#3b82f6' }}
      />
    </div>
  );
}

