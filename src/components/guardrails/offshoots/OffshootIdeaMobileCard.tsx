/**
 * OffshootIdeaMobileCard - Mobile-optimized offshoot idea card
 * 
 * Features:
 * - Swipe left → Promote to Roadmap
 * - Swipe right → Convert to Side Project
 * - Long-press → Action menu (Edit, Archive, Promote, Convert)
 * - Collapsed (default) and expanded states
 * - Lightweight, temporary appearance
 */

import { useState, useRef } from 'react';
import { Zap, ArrowRight, Sparkles, MoreVertical, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import type { UnifiedOffshoot } from '../../../lib/guardrails/offshoots';

interface OffshootIdeaMobileCardProps {
  offshoot: UnifiedOffshoot;
  onPromoteToRoadmap: (id: string, type: string) => void;
  onConvertToSideProject: (id: string, type: string) => void;
  onArchive: (id: string, type: string) => void;
  onClick?: () => void;
}

const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger action
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity (px/ms)

export function OffshootIdeaMobileCard({
  offshoot,
  onPromoteToRoadmap,
  onConvertToSideProject,
  onArchive,
  onClick,
}: OffshootIdeaMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const getSourceLabel = () => {
    switch (offshoot.source_type) {
      case 'node':
        return 'Mind Mesh';
      case 'roadmap_item':
        return 'Roadmap';
      case 'side_idea':
        return 'Side Idea';
      default:
        return 'Unknown';
    }
  };

  const getSourceBadgeColor = () => {
    switch (offshoot.source_type) {
      case 'node':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'roadmap_item':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'side_idea':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTimeAgo = () => {
    const now = new Date();
    const created = new Date(offshoot.created_at);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
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
      if (swipeOffset > 0) {
        // Swipe right → Convert to Side Project
        onConvertToSideProject(offshoot.id, offshoot.source_type);
      } else {
        // Swipe left → Promote to Roadmap
        onPromoteToRoadmap(offshoot.id, offshoot.source_type);
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
                  <ArrowRight size={16} className="text-blue-600" />
                  <span className="text-blue-600 text-xs font-medium">Roadmap</span>
                </div>
              </div>
            )}
            {swipeOffset > 0 && (
              <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 bg-purple-50 rounded-r-lg">
                <div className="flex flex-col items-center gap-1">
                  <Sparkles size={16} className="text-purple-600" />
                  <span className="text-purple-600 text-xs font-medium">Side Project</span>
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
          {/* Header: Title and Source */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-amber-500 flex-shrink-0" />
                <h4 className="font-semibold text-base text-gray-900 leading-tight">
                  {offshoot.title}
                </h4>
              </div>
              {offshoot.description && isExpanded && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                  {offshoot.description}
                </p>
              )}
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ${getSourceBadgeColor()}`}
            >
              {getSourceLabel()}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{getTimeAgo()}</span>
            </div>
            {offshoot.description && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
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
        </div>

        {/* Left border accent (muted) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-40"
          style={{ backgroundColor: offshoot.color || '#FF7F50' }}
        />
      </div>

      {/* Long-press menu */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-2">
              <button
                onClick={() => {
                  onPromoteToRoadmap(offshoot.id, offshoot.source_type);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-3"
              >
                <ArrowRight size={16} className="text-blue-600" />
                <span>Promote to Roadmap</span>
              </button>
              <button
                onClick={() => {
                  onConvertToSideProject(offshoot.id, offshoot.source_type);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 rounded-lg flex items-center gap-3"
              >
                <Sparkles size={16} className="text-purple-600" />
                <span>Convert to Side Project</span>
              </button>
              <button
                onClick={() => {
                  onArchive(offshoot.id, offshoot.source_type);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 rounded-lg flex items-center gap-3 text-red-600"
              >
                <MoreVertical size={16} />
                <span>Archive</span>
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

