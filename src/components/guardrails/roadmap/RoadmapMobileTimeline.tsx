/**
 * Roadmap Mobile Timeline
 * 
 * Phase 1: Projection Pipeline Rebuild (Read-Only, Hierarchy-Correct)
 * 
 * Mobile-first vertical timeline view for roadmap items.
 * Replaces Gantt chart on mobile with a native vertical scrolling experience.
 * 
 * Features:
 * - Vertical timeline (no horizontal scrolling)
 * - Grouped by phase/month
 * - Sticky "Today" indicator
 * - Track filter tabs
 * - Compact item cards with swipe actions
 * - Bottom sheet for item details
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Render projection data (tracks, subtracks, items)
 * - ✅ Filter items by track (user selection)
 * - ✅ Group items by time period
 * - ✅ Display timeline visualization
 * 
 * What this component MUST NOT do:
 * - ❌ Filter tracks/subtracks based on item presence
 * - ❌ Hide tracks/subtracks when items.length === 0
 * - ❌ Mutate domain data
 * - ❌ Query Supabase directly
 * 
 * Phase 1: Empty State Validity
 * - Tracks/subtracks render even with zero items
 * - Items filtering is for display only (tracks still visible in filter tabs)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useRoadmapProjection } from '../../../hooks/useRoadmapProjection';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import { parseDateFromDB, formatDateForDisplay } from '../../../lib/guardrails/infiniteTimelineUtils';
import { ItemDrawer } from './ItemDrawer';
import { showToast } from '../../Toast';
import { updateRoadmapItem } from '../../../lib/guardrails';
import { RoadmapEmptyState, isProjectionEmpty } from './RoadmapEmptyState';

interface RoadmapMobileTimelineProps {
  masterProjectId: string;
}

interface GroupedItems {
  period: string; // e.g., "Q1 2025" or "January 2025"
  startDate: Date;
  items: RoadmapItem[];
}

const STATUS_COLORS = {
  not_started: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
  blocked: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' },
  completed: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
  on_hold: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900' },
};

export function RoadmapMobileTimeline({ masterProjectId }: RoadmapMobileTimelineProps) {
  // Phase 2: Use projection adapter instead of direct service calls
  const projection = useRoadmapProjection(masterProjectId);
  
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null); // null = "All Tracks"
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [swipingItemId, setSwipingItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const todayRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number>(0);
  const swipeStartY = useRef<number>(0);

  const today = useMemo(() => new Date(), []);

  // Scroll to today on load
  useEffect(() => {
    if (!projection.loading && todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [projection.loading]);

  // Phase 2: Get all items from projection (flatten tracks and subtracks)
  // Only include items from expanded tracks/subtracks (respect collapse state)
  const allRoadmapItems = useMemo(() => {
    const items: RoadmapItem[] = [];
    projection.tracks.forEach(track => {
      // Add track items only if track is expanded
      if (!track.uiState.collapsed) {
        items.push(...track.items);
        // Add subtrack items only if subtrack is expanded
        track.subtracks.forEach(subtrack => {
          if (!subtrack.uiState.collapsed) {
            items.push(...subtrack.items);
          }
        });
      }
    });
    return items;
  }, [projection.tracks]);

  // Phase 2: Get flat list of tracks for filter tabs from projection
  const flatTracks = useMemo(() => {
    const result: Array<{ id: string; name: string; color: string | null }> = [];
    
    projection.tracks.forEach(track => {
      result.push({
        id: track.track.id,
        name: track.track.name,
        color: track.track.color,
      });
      // Include subtracks in filter list
      track.subtracks.forEach(subtrack => {
        result.push({
          id: subtrack.track.id,
          name: subtrack.track.name,
          color: subtrack.track.color,
        });
      });
    });
    
    return result;
  }, [projection.tracks]);

  // Phase 2: Filter items by selected track from projection data
  const filteredItems = useMemo(() => {
    if (!selectedTrackId) return allRoadmapItems;
    return allRoadmapItems.filter(item => item.trackId === selectedTrackId);
  }, [allRoadmapItems, selectedTrackId]);

  // Group items by month/quarter
  const groupedItems = useMemo((): GroupedItems[] => {
    const groups = new Map<string, GroupedItems>();

    filteredItems.forEach(item => {
      if (!item.startDate) return;
      
      const itemDate = parseDateFromDB(item.startDate);
      const period = getPeriodLabel(itemDate);
      
      if (!groups.has(period)) {
        groups.set(period, {
          period,
          startDate: startOfMonth(itemDate),
          items: [],
        });
      }
      
      groups.get(period)!.items.push(item);
    });

    // Sort items within each group by start date
    Array.from(groups.values()).forEach(group => {
      group.items.sort((a, b) => {
        const dateA = a.startDate ? parseDateFromDB(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseDateFromDB(b.startDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    // Sort groups by start date
    return Array.from(groups.values()).sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
  }, [filteredItems]);

  // Handle swipe gestures for item cards
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    const touch = e.touches[0];
    swipeStartX.current = touch.clientX;
    swipeStartY.current = touch.clientY;
    setSwipingItemId(itemId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingItemId) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const deltaY = Math.abs(touch.clientY - swipeStartY.current);
    
    // Only allow horizontal swipes (ignore vertical scrolling)
    if (deltaY > 30) {
      setSwipingItemId(null);
      setSwipeOffset(0);
      return;
    }
    
    e.preventDefault(); // Prevent scrolling during swipe
    setSwipeOffset(Math.max(-100, Math.min(100, deltaX)));
  };

  const handleTouchEnd = async () => {
    if (!swipingItemId) return;

    const item = roadmapItems.find(i => i.id === swipingItemId);
    if (!item) {
      setSwipingItemId(null);
      setSwipeOffset(0);
      swipeStartX.current = 0;
      swipeStartY.current = 0;
      return;
    }

    // Swipe left (negative) = Complete
    if (swipeOffset < -50 && item.status !== 'completed') {
      try {
        await updateRoadmapItem(swipingItemId, { status: 'completed' });
        showToast('success', 'Marked as completed');
        await projection.refresh();
      } catch (error) {
        console.error('Failed to update item:', error);
        showToast('error', 'Failed to update item');
      }
    }
    // Swipe right (positive) = Block
    else if (swipeOffset > 50 && item.status !== 'blocked') {
      try {
        await updateRoadmapItem(swipingItemId, { status: 'blocked' });
        showToast('success', 'Marked as blocked');
        await projection.refresh();
      } catch (error) {
        console.error('Failed to update item:', error);
        showToast('error', 'Failed to update item');
      }
    }

    setSwipingItemId(null);
    setSwipeOffset(0);
    swipeStartX.current = 0;
    swipeStartY.current = 0;
  };

  const toggleGroup = (period: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  const handleItemClick = (item: RoadmapItem) => {
    setSelectedItem(item);
  };

  const handleItemUpdate = async () => {
    await projection.refresh();
  };

  if (projection.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  if (projection.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Error loading roadmap: {projection.error.message}</p>
        </div>
      </div>
    );
  }

  // Phase 9: Show empty state if projection is empty
  if (isProjectionEmpty(projection)) {
    return (
      <RoadmapEmptyState
        masterProjectId={masterProjectId}
        projection={projection}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Track Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setSelectedTrackId(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
              selectedTrackId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Tracks
          </button>
          {flatTracks.map(track => (
            <button
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center gap-2 ${
                selectedTrackId === track.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              {track.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative px-4 py-6">
          {/* Sticky Today Indicator */}
          <div
            ref={todayRef}
            className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-red-50 border-y border-red-300 mb-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-red-600 rounded-full" />
              <span className="text-sm font-semibold text-red-900">Today</span>
              <span className="text-xs text-red-700">
                {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Timeline Groups */}
          {groupedItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No items found</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTrackId ? 'Try selecting a different track' : 'Add items to your roadmap to see them here'}
              </p>
            </div>
          ) : (
            groupedItems.map((group, groupIdx) => {
              const isExpanded = expandedGroups.has(group.period);
              const isTodayPeriod = isPeriodToday(group.startDate, today);

              return (
                <div key={group.period} className="mb-6">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.period)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-colors min-h-[44px] ${
                      isTodayPeriod
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-1 h-8 rounded-full ${
                          isTodayPeriod ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{group.period}</h3>
                        <p className="text-xs text-gray-500">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-500" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="space-y-2 ml-4 pl-6 border-l-2 border-gray-200">
                      {group.items.map((item, itemIdx) => {
                        const track = flatTracks.find(t => t.id === item.trackId);
                        const statusColors = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_started;
                        const isOverdue = item.endDate && new Date(item.endDate) < today && item.status !== 'completed';
                        const isSwiping = swipingItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`relative transition-transform ${
                              isSwiping ? 'z-20' : ''
                            }`}
                            style={{
                              transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                            }}
                            onTouchStart={(e) => handleTouchStart(e, item.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            {/* Swipe Action Hints */}
                            {swipeOffset < -30 && (
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-600 text-xs font-medium">
                                Complete →
                              </div>
                            )}
                            {swipeOffset > 30 && (
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-600 text-xs font-medium">
                                ← Block
                              </div>
                            )}

                            {/* Item Card */}
                            <button
                              onClick={() => handleItemClick(item)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all min-h-[64px] ${
                                statusColors.border
                              } ${
                                isOverdue ? 'bg-red-50' : statusColors.bg
                              } ${
                                isSwiping ? 'shadow-lg' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {track && (
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: track.color }}
                                      />
                                    )}
                                    <h4 className={`font-semibold truncate ${statusColors.text}`}>
                                      {item.title}
                                    </h4>
                                  </div>
                                  
                                  {item.startDate && (
                                    <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                                      <Calendar size={12} />
                                      <span>
                                        {formatDateForDisplay(parseDateFromDB(item.startDate))}
                                        {item.endDate && ` - ${formatDateForDisplay(parseDateFromDB(item.endDate))}`}
                                      </span>
                                    </div>
                                  )}

                                  {isOverdue && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-red-600 text-white text-xs font-medium rounded">
                                      Overdue
                                    </span>
                                  )}
                                </div>

                                <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors.text} ${statusColors.bg} border ${statusColors.border}`}>
                                  {item.status.replace('_', ' ')}
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Item Detail - Use ItemDrawer which will handle mobile/desktop */}
      {selectedItem && (
        <ItemDrawer
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          tracks={flatTracks}
        />
      )}
    </div>
  );
}

// Helper functions

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getPeriodLabel(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

function isTodayOrNearby(itemDate: Date, today: Date): boolean {
  const diffDays = Math.abs((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7; // Within 7 days
}

function isPeriodToday(periodStart: Date, today: Date): boolean {
  return (
    periodStart.getFullYear() === today.getFullYear() &&
    periodStart.getMonth() === today.getMonth()
  );
}

