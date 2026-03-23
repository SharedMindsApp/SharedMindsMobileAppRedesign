/**
 * RoadmapWeekView Component
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * Phase 3.9: Zoomable Time Navigation & Rolling Windows
 * 
 * Weekly view - Primary roadmap visualization experience.
 * Displays exactly 4 weeks horizontally with tracks/subtracks as rows.
 * Each week is a bucket that aggregates items.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Render projection data (tracks, subtracks, items)
 * - ✅ Aggregate items into weekly buckets
 * - ✅ Handle UI interactions (bucket clicks, track focus)
 * - ✅ Navigate week window (Previous/Next)
 * - ✅ Switch to Day view when clicking week header
 * - ✅ Persist UI state to localStorage
 * 
 * What this component MUST NOT do:
 * - ❌ Mutate domain data
 * - ❌ Query Supabase directly
 * - ❌ Filter tracks/subtracks based on item presence
 * - ❌ Hide tracks/subtracks when items.length === 0
 * - ❌ Create/edit/delete tracks or items
 * 
 * Phase 3.9 Rules:
 * - ✅ Always shows exactly 4 weeks
 * - ✅ Week headers are clickable (switches to Day view)
 * - ✅ Navigation buttons shift window week-by-week
 * - ✅ Tracks/subtracks render even with zero items
 * - ✅ Empty buckets render with placeholder
 * - ✅ Bucket aggregation is memoized
 * - ✅ No data mutations (projection only)
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, MoreVertical, Shield, UserPlus } from 'lucide-react';
import { ENABLE_ENTITY_GRANTS } from '../../../../lib/featureFlags';
import { AssignTrackModal } from '../AssignTrackModal';
import { useOrientation } from '../../../../hooks/ui/useOrientation';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import {
  getBuckets,
  doesItemOverlapBucket,
  aggregateBucket,
  startOfWeek,
  type TimeBucket,
  type BucketAggregation,
} from '../../../../lib/guardrails/roadmapTimeline';
import { RoadmapBucketCell } from '../RoadmapBucketCell';
import { useRoadmapUIState } from '../../../../hooks/useRoadmapProjection';

interface RoadmapWeekViewProps {
  projection: RoadmapProjection;
  anchorDate: Date;
  masterProjectId: string;
  onBucketClick?: (bucket: TimeBucket, scope: { type: 'track' | 'subtrack'; id: string; name: string }) => void;
  onWeekHeaderClick?: (weekStartDate: string) => void; // Phase 3.9: Callback when week header is clicked
  onNavigateWeek?: (weeks: number) => void; // Phase 3.9: Callback for week navigation
  onNavigateToToday?: () => void; // Phase 4.0: Callback to navigate to today
}

const WEEKS_TO_DISPLAY = 4; // Phase 3.9: Exactly 4 weeks visible
const ROW_HEIGHT = 72; // Phase 3.9 UI Polish: Increased from 64px for better readability
const SIDEBAR_WIDTH_COLLAPSED = 120; // Collapsed sidebar width - just enough for truncated names
const SIDEBAR_WIDTH_EXPANDED = 240; // Expanded sidebar width - full track names visible (Phase 4.0: Increased from 200px)
const BUCKET_WIDTH = 140; // Phase 3.9 UI Polish: Increased from 120px for better readability

export function RoadmapWeekView({ projection, anchorDate, masterProjectId, onBucketClick, onWeekHeaderClick, onNavigateWeek, onNavigateToToday }: RoadmapWeekViewProps) {
  const navigate = useNavigate();
  const { isLandscape } = useOrientation();
  
  // Get UI state management for collapse/expand
  const { toggleTrackCollapse } = useRoadmapUIState(masterProjectId);
  
  // Phase 8.1: Orientation-aware sidebar - auto-expand in landscape for streamlined UI
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  // Auto-expand sidebar in landscape mode
  useEffect(() => {
    if (isLandscape) {
      setIsSidebarExpanded(true);
    }
  }, [isLandscape]);
  
  const sidebarWidth = isSidebarExpanded 
    ? SIDEBAR_WIDTH_EXPANDED 
    : SIDEBAR_WIDTH_COLLAPSED;
  
  // Phase 8.1: Orientation-aware bucket width (significantly wider in landscape for professional appearance)
  const bucketWidth = isLandscape ? Math.round(BUCKET_WIDTH * 1.2) : BUCKET_WIDTH;
  
  // Menu state (track which row's menu is open)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Assign modal state
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    entityType: 'track' | 'subtrack';
    entityId: string;
    entityName: string;
  }>({
    isOpen: false,
    entityType: 'track',
    entityId: '',
    entityName: '',
  });
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId) {
        const menuEl = menuRefs.current.get(openMenuId);
        if (menuEl && !menuEl.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    }
    
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);
  
  // Phase 3.9: Handle week header click (switch to Day view)
  const handleWeekHeaderClick = useCallback((weekStartDate: string) => {
    if (onWeekHeaderClick) {
      onWeekHeaderClick(weekStartDate);
    }
  }, [onWeekHeaderClick]);
  
  // Phase 3.9: Handle week navigation
  const handlePreviousWeek = useCallback(() => {
    if (onNavigateWeek) {
      onNavigateWeek(-1);
    }
  }, [onNavigateWeek]);
  
  const handleNextWeek = useCallback(() => {
    if (onNavigateWeek) {
      onNavigateWeek(1);
    }
  }, [onNavigateWeek]);

  // Phase 4.0: Handle "Today" button
  const handleToday = useCallback(() => {
    if (onNavigateToToday) {
      onNavigateToToday();
    }
  }, [onNavigateToToday]);

  // Generate weekly buckets (memoized)
  const buckets = useMemo(() => {
    return getBuckets('week', anchorDate, WEEKS_TO_DISPLAY);
  }, [anchorDate]);

  // Handle bucket click (stub for now if BottomSheet not ready)
  const handleBucketClick = useCallback((
    bucket: TimeBucket,
    scope: { type: 'track' | 'subtrack'; id: string; name: string }
  ) => {
    if (onBucketClick) {
      onBucketClick(bucket, scope);
    } else {
      // Stub: Log bucket metadata for now
      console.log('[RoadmapWeekView] Bucket clicked:', {
        bucket: bucket.key,
        dateRange: `${bucket.startDate.toISOString().split('T')[0]} to ${bucket.endDate.toISOString().split('T')[0]}`,
        scope,
      });
    }
  }, [onBucketClick]);

  // Flatten tracks and subtracks for rendering (preserves hierarchy visually)
  // Filter subtracks based on parent track collapse state
  const rows = useMemo(() => {
    const result: Array<{
      id: string;
      name: string;
      color: string | null;
      isSubtrack: boolean;
      parentTrackId?: string;
      hasChildren: boolean;
      isCollapsed: boolean;
      canEdit: boolean;
      items: Array<{ id: string; trackId: string; subtrackId?: string | null; [key: string]: any }>;
    }> = [];

    projection.tracks.forEach(track => {
      const hasChildren = track.subtracks.length > 0;
      const isCollapsed = track.uiState.collapsed;

      // Add track row (even if it has subtracks - tracks always render)
      result.push({
        id: track.track.id,
        name: track.track.name,
        color: track.track.color,
        isSubtrack: false,
        hasChildren,
        isCollapsed,
        canEdit: track.canEdit,
        items: track.items,
      });

      // Add subtrack rows only if track is not collapsed
      if (!isCollapsed) {
        track.subtracks.forEach(subtrack => {
          result.push({
            id: subtrack.track.id,
            name: subtrack.track.name,
            color: subtrack.track.color,
            isSubtrack: true,
            parentTrackId: track.track.id,
            hasChildren: false,
            isCollapsed: false,
            canEdit: subtrack.canEdit,
            items: subtrack.items,
          });
        });
      }
    });

    return result;
  }, [projection.tracks]);

  // Calculate bucket aggregations for each row (memoized)
  const bucketAggregations = useMemo(() => {
    const aggregations = new Map<string, Map<string, BucketAggregation>>();

    rows.forEach(row => {
      const rowBuckets = new Map<string, BucketAggregation>();

      buckets.forEach(bucket => {
        // Get items that overlap this bucket
        const overlappingItems = row.items.filter(item =>
          doesItemOverlapBucket(item, bucket)
        );

        // Aggregate the items
        const aggregation = aggregateBucket(overlappingItems);
        rowBuckets.set(bucket.key, aggregation);
      });

      aggregations.set(row.id, rowBuckets);
    });

    return aggregations;
  }, [rows, buckets]);

  // Phase 3.0: Handle track/subtrack name click (navigate to workspace)
  const handleRowNameClick = useCallback((rowId: string, isSubtrack: boolean, parentTrackId?: string) => {
    // Phase 3.0: Navigate to workspace
    if (isSubtrack && parentTrackId) {
      // Navigate to subtrack workspace
      navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${parentTrackId}/subtrack/${rowId}`);
    } else {
      // Navigate to track workspace
      navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${rowId}`);
    }
  }, [masterProjectId, navigate]);

  // Phase 3.9: Get current week start for highlighting (must be before early returns)
  const today = useMemo(() => new Date(), []);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);

  // Phase 4.0: Skeleton loading state
  if (projection.loading) {
    const skeletonTimelineWidth = WEEKS_TO_DISPLAY * bucketWidth;
    const skeletonTotalWidth = sidebarWidth + skeletonTimelineWidth;
    
    return (
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Navigation skeleton */}
        {(onNavigateWeek || onWeekHeaderClick || onNavigateToToday) && (
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="w-20 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="w-32 h-5 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-10 bg-gray-200 rounded-lg"></div>
          </div>
        )}
        
        {/* Timeline skeleton */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: `${skeletonTotalWidth}px` }}>
            {/* Header skeleton */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-300 flex" style={{ width: `${skeletonTotalWidth}px` }}>
              <div
                className="sticky left-0 z-40 bg-white border-r border-gray-300 flex items-center px-5"
                style={{ width: `${sidebarWidth}px`, height: '52px' }}
              >
                <div className="ml-5 w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="relative flex" style={{ width: `${skeletonTimelineWidth}px` }}>
                {Array.from({ length: WEEKS_TO_DISPLAY }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r border-gray-300 flex items-center justify-center bg-white"
                    style={{ width: `${bucketWidth}px`, height: '52px' }}
                  >
                    <div className="w-20 h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rows skeleton */}
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="flex border-b border-gray-200"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                <div
                  className="sticky left-0 z-20 bg-white border-r border-gray-300 flex items-center px-5"
                  style={{ width: `${sidebarWidth}px` }}
                >
                  <div className="w-5 h-5 bg-gray-200 rounded mr-2"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="relative flex" style={{ width: `${skeletonTimelineWidth}px` }}>
                  {Array.from({ length: WEEKS_TO_DISPLAY }).map((_, bucketIdx) => (
                    <div
                      key={bucketIdx}
                      className="flex-1 border-r border-gray-200 flex items-center justify-center"
                      style={{ width: `${bucketWidth}px` }}
                    >
                      <div className="w-12 h-8 bg-gray-100 rounded border border-gray-200"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (projection.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">Error loading roadmap: {projection.error.message}</p>
        </div>
      </div>
    );
  }

  // Phase 8.1: Calculate timeline width with orientation-aware bucket width
  const timelineWidth = buckets.length * bucketWidth;
  const totalWidth = sidebarWidth + timelineWidth;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Phase 4.0: Time Navigation Controls */}
      {(onNavigateWeek || onWeekHeaderClick || onNavigateToToday) && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={handlePreviousWeek}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150 ease-out min-h-[44px] active:bg-gray-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="text-sm text-gray-600 font-medium">
              {buckets.length > 0 && `${buckets[0].label} - ${buckets[buckets.length - 1].label}`}
            </span>
            {onNavigateToToday && (
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all duration-150 ease-out active:bg-blue-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                aria-label="Go to today"
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={handleNextWeek}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150 ease-out min-h-[44px] active:bg-gray-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Next week"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon size={16} />
          </button>
        </div>
      )}
      
      {/* Scrollable Content with Synchronized Header */}
      {/* Phase 4.0: Scroll affordance indicators (faded edge gradients) */}
      <div className="flex-1 relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10" />
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10" />
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: `${totalWidth}px`, minHeight: `${rows.length * ROW_HEIGHT}px` }}>
          {/* Timeline Header - Inside scrollable container for sync */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-300 flex" style={{ width: `${totalWidth}px` }}>
            {/* Sidebar header */}
            <div
              className="sticky left-0 z-40 bg-white border-r border-gray-300 flex items-center px-3 font-semibold text-gray-800"
              style={{ width: `${sidebarWidth}px`, height: '52px' }}
            >
              {/* Sidebar toggle button */}
              <button
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                className="p-1.5 hover:bg-gray-100 rounded transition-all duration-150 ease-out flex-shrink-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {isSidebarExpanded ? (
                  <ChevronLeft size={16} className="text-gray-600" />
                ) : (
                  <ChevronRight size={16} className="text-gray-600" />
                )}
              </button>
              <span className="ml-2 flex-1 truncate">Tracks</span>
            </div>
            {/* Week headers - Phase 3.9: Clickable to switch to Day view */}
            {/* Phase 3.9 UI Polish: Today indicator and improved styling */}
            <div className="relative flex" style={{ width: `${timelineWidth}px` }}>
              {buckets.map(bucket => {
                const weekStartStr = bucket.startDate.toISOString().split('T')[0];
                const isCurrentWeek = bucket.startDate.getTime() === currentWeekStart.getTime();
                const isClickable = !!onWeekHeaderClick;
                
                return (
                  <button
                    key={bucket.key}
                    onClick={() => isClickable && handleWeekHeaderClick(weekStartStr)}
                    className={`flex-1 border-r border-gray-300 flex items-center justify-center bg-white transition-all duration-150 ease-out ${
                      isClickable ? 'hover:bg-gray-50 cursor-pointer active:bg-gray-100' : ''
                    } ${isCurrentWeek ? 'bg-blue-50 border-b-2 border-b-blue-500' : ''}`}
                    style={{ width: `${bucketWidth}px`, height: '52px' }}
                    title={isClickable ? 'Click to view days in this week' : undefined}
                  >
                    <span className={`text-xs font-medium text-center px-2 py-1 ${isCurrentWeek ? 'text-blue-700' : 'text-gray-800'}`}>
                      {bucket.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Track/Subtrack Rows */}
          {rows.map((row, rowIdx) => {
            const rowBuckets = bucketAggregations.get(row.id) || new Map();
            const isSubtrack = row.isSubtrack;
            
            // Phase 4.0: Calculate total item count for collapsed tracks
            let totalItemCount = 0;
            if (!isSubtrack && row.isCollapsed) {
              rowBuckets.forEach(aggregation => {
                totalItemCount += aggregation.total;
              });
            }

            return (
              <div
                key={row.id}
                className="flex border-b border-gray-200 hover:bg-gray-50 transition-all duration-150 ease-out group"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {/* Track/Subtrack Name (Sidebar) */}
                {/* Phase 3.9 UI Polish: Improved padding and subtrack visual differentiation */}
                <div
                  className={`sticky left-0 z-20 bg-white border-r border-gray-300 flex items-center px-5 ${
                    isSubtrack ? 'border-l-2 border-l-gray-200' : ''
                  }`}
                  style={{ width: `${sidebarWidth}px` }}
                >
                  {/* Collapse/Expand Button (only for tracks with children) */}
                  {!isSubtrack && row.hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackCollapse(row.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-all duration-150 ease-out mr-2 flex-shrink-0 active:scale-[0.98]"
                      title={row.isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {row.isCollapsed ? (
                        <ChevronRight size={16} className="text-gray-600" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-600" />
                      )}
                    </button>
                  )}
                  {(!row.hasChildren || isSubtrack) && (
                    <span className="w-5 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => handleRowNameClick(row.id, isSubtrack, row.parentTrackId)}
                    className="flex items-center gap-2 flex-1 text-left hover:text-blue-600 transition-all duration-150 ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                  >
                    {isSubtrack && (
                      <span className="text-gray-400 text-xs" style={{ width: '16px' }}>
                        └
                      </span>
                    )}
                    <span
                      className={`text-sm truncate ${isSubtrack ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}
                      style={{ 
                        color: row.color || undefined,
                      }}
                    >
                      {row.name}
                    </span>
                    {/* Phase 4.0: Item count badge for collapsed tracks */}
                    {!isSubtrack && row.isCollapsed && totalItemCount > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded flex-shrink-0">
                        {totalItemCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Permissions menu (when feature enabled and user can edit) */}
                  {ENABLE_ENTITY_GRANTS && row.canEdit && (
                    <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={(el) => { if (el) menuRefs.current.set(row.id, el); }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === row.id ? null : row.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Track options"
                      >
                        <MoreVertical size={14} className="text-gray-600" />
                      </button>
                      
                      {openMenuId === row.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setAssignModal({
                                isOpen: true,
                                entityType: row.isSubtrack ? 'subtrack' : 'track',
                                entityId: row.id,
                                entityName: row.name,
                              });
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          >
                            <UserPlus size={14} />
                            Assign to...
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/projects/${masterProjectId}/tracks/${row.id}/permissions`);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors border-t border-gray-100"
                          >
                            <Shield size={14} />
                            Permissions
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Week Buckets */}
                <div className="flex" style={{ width: `${timelineWidth}px` }}>
                  {buckets.map(bucket => {
                    const aggregation = rowBuckets.get(bucket.key) || aggregateBucket([]);
                    const isEmpty = aggregation.total === 0;

                    return (
                      <div
                        key={bucket.key}
                        className="border-r border-gray-200"
                        style={{ width: `${bucketWidth}px` }}
                      >
                        <RoadmapBucketCell
                          aggregation={aggregation}
                          viewMode="week"
                          isEmpty={isEmpty}
                          onClick={() => handleBucketClick(bucket, {
                            type: isSubtrack ? 'subtrack' : 'track',
                            id: row.id,
                            name: row.name,
                          })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
