/**
 * SideProjectMobileCard - Mobile-optimized side project card
 * 
 * Features:
 * - Swipe left → Promote to Master Project
 * - Swipe right → Archive Side Project
 * - Long-press → Action menu (Edit, Promote, Archive, Delete)
 * - Collapsed (default) and expanded states
 * - Heavier than Offshoot Ideas, lighter than Master Projects
 */

import { useState, useRef } from 'react';
import { Sparkles, ArrowUp, Archive, MoreVertical, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import type { TrackWithStats } from '../../../lib/guardrails/trackService';

interface SideProjectMobileCardProps {
  project: TrackWithStats;
  onPromoteToMaster: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (project: TrackWithStats) => void;
  onClick?: () => void;
}

const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger action
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity (px/ms)

export function SideProjectMobileCard({
  project,
  onPromoteToMaster,
  onArchive,
  onDelete,
  onEdit,
  onClick,
}: SideProjectMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const getStatusLabel = () => {
    if (project.status === 'archived') return 'Archived';
    if (project.totalItemsCount > 0) return 'Active';
    return 'Dormant';
  };

  const getStatusColor = () => {
    if (project.status === 'archived') return 'bg-gray-100 text-gray-700 border-gray-300';
    if (project.totalItemsCount > 0) return 'bg-green-100 text-green-700 border-green-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  const getTimeAgo = () => {
    const now = new Date();
    const updated = new Date(project.updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays}d ago`;
    return new Date(project.updatedAt).toLocaleDateString();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long-press timer
    const timer = setTimeout(() => {
      setShowMenu(true);
      setIsSwiping(false);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // Cancel long-press if moving
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      setIsSwiping(true);
      const clampedOffset = Math.max(-150, Math.min(150, deltaX));
      setSwipeOffset(clampedOffset);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

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
      if (swipeOffset < 0) {
        // Swipe left → Promote to Master Project
        onPromoteToMaster(project.id);
      } else {
        // Swipe right → Archive Side Project
        onArchive(project.id);
      }
    }

    // Reset
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  return (
    <>
      <div
        ref={cardRef}
        className="relative bg-white rounded-lg border border-gray-200 shadow-sm"
        style={{
          transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
          opacity: showMenu ? 0.7 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe action indicators */}
        {isSwiping && (
          <>
            {swipeOffset < 0 && (
              <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 bg-blue-50 rounded-l-lg">
                <div className="flex flex-col items-center gap-1">
                  <ArrowUp size={16} className="text-blue-600" />
                  <span className="text-blue-600 text-xs font-medium">Promote</span>
                </div>
              </div>
            )}
            {swipeOffset > 0 && (
              <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 bg-amber-50 rounded-r-lg">
                <div className="flex flex-col items-center gap-1">
                  <Archive size={16} className="text-amber-600" />
                  <span className="text-amber-600 text-xs font-medium">Archive</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Card content */}
        <div
          className="p-4"
          onClick={() => {
            if (!isSwiping && !showMenu && onClick) {
              onClick();
            }
          }}
        >
          {/* Header: Title, Status, and Item Count */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-purple-500 flex-shrink-0" />
                <h4 className="font-semibold text-base text-gray-900 leading-tight">
                  {project.name}
                </h4>
              </div>
              {project.description && isExpanded && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {project.totalItemsCount} {project.totalItemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{getTimeAgo()}</span>
            </div>
            {project.description && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={12} />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} />
                      <span>Show description</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Expanded: Content breakdown */}
          {isExpanded && project.totalItemsCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-purple-50 rounded p-2">
                  <div className="font-semibold text-purple-900">{project.roadmapItemsCount}</div>
                  <div className="text-purple-700">Roadmap</div>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <div className="font-semibold text-purple-900">{project.nodesCount}</div>
                  <div className="text-purple-700">Nodes</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Left border accent (muted purple) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg opacity-60"
          style={{ backgroundColor: project.color || '#A855F7' }}
        />
      </div>

      {/* Long-press menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-2">
              <button
                onClick={() => {
                  onEdit(project);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-3"
              >
                <MoreVertical size={16} className="text-gray-600" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  onPromoteToMaster(project.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-3"
              >
                <ArrowUp size={16} className="text-blue-600" />
                <span>Promote to Master Project</span>
              </button>
              <button
                onClick={() => {
                  onArchive(project.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-amber-50 rounded-lg flex items-center gap-3 text-amber-600"
              >
                <Archive size={16} />
                <span>Archive</span>
              </button>
              <button
                onClick={() => {
                  onDelete(project.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 rounded-lg flex items-center gap-3 text-red-600"
              >
                <MoreVertical size={16} />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-4 py-3 text-center text-sm text-gray-600 hover:bg-gray-100 rounded-lg mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

