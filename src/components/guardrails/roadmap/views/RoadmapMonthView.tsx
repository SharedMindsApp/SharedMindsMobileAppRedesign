/**
 * RoadmapMonthView Component
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * Phase 2e: Monthly Roadmap View (Aggregation-First Projection)
 * 
 * Monthly view - Aggregation-first overview designed to answer:
 * "Where is effort and risk concentrated over time?"
 * 
 * This view:
 * - Shows patterns, not detail
 * - Favors density and signals over individual items
 * - Delegates detail to the Bucket Bottom Sheet
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Render projection data (tracks, subtracks, items)
 * - ✅ Aggregate items into monthly buckets
 * - ✅ Handle UI interactions (bucket clicks, track focus)
 * - ✅ Persist UI state to localStorage
 * 
 * What this component MUST NOT do:
 * - ❌ Show individual roadmap items inline
 * - ❌ Mutate domain data
 * - ❌ Query Supabase directly
 * - ❌ Filter tracks/subtracks based on item presence
 * - ❌ Hide tracks/subtracks when items.length === 0
 * - ❌ Create/edit/delete tracks or items
 * - ❌ Collapse tracks based on emptiness
 * - ❌ Introduce new aggregation logic
 * 
 * Phase 2 Rules:
 * - ✅ Tracks/subtracks render even with zero items
 * - ✅ Empty buckets render with placeholder
 * - ✅ Bucket aggregation is memoized
 * - ✅ No data mutations (projection only)
 * - ✅ Uses existing bucket utilities
 * - ✅ Reuses RoadmapBucketCell
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useOrientation } from '../../../../hooks/ui/useOrientation';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import {
  getBuckets,
  doesItemOverlapBucket,
  aggregateBucket,
  startOfMonth,
  type TimeBucket,
  type BucketAggregation,
} from '../../../../lib/guardrails/roadmapTimeline';
import { RoadmapBucketCell } from '../RoadmapBucketCell';
import { useRoadmapUIState } from '../../../../hooks/useRoadmapProjection';

interface RoadmapMonthViewProps {
  projection: RoadmapProjection;
  anchorDate: Date;
  masterProjectId: string;
  onBucketClick?: (bucket: TimeBucket, scope: { type: 'track' | 'subtrack'; id: string; name: string }) => void;
  onMonthClick?: (monthStartDate: string) => void; // Phase 3.9: Callback when month header is clicked
  onNavigateMonth?: (months: number) => void; // Phase 4.0: Callback for month navigation
  onNavigateToToday?: () => void; // Phase 4.0: Callback to navigate to today
}

const MONTHS_TO_DISPLAY = 6; // Past 1 month + current + next 4 months (configurable)
const ROW_HEIGHT = 72; // Phase 3.9 UI Polish: Increased from 64px for better readability
const SIDEBAR_WIDTH_COLLAPSED = 120; // Collapsed sidebar width - just enough for truncated names
const SIDEBAR_WIDTH_EXPANDED = 240; // Expanded sidebar width - full track names visible (Phase 4.0: Increased from 200px)
const BUCKET_WIDTH = 180; // Phase 3.9 UI Polish: Increased from 150px for better readability

export function RoadmapMonthView({ projection, anchorDate, masterProjectId, onBucketClick, onMonthClick, onNavigateMonth, onNavigateToToday }: RoadmapMonthViewProps) {
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

  // Phase 3.9: Handle month header click (switch to Week view)
  const handleMonthClick = useCallback((monthStartDate: string) => {
    if (onMonthClick) {
      onMonthClick(monthStartDate);
    }
  }, [onMonthClick]);

  // Phase 4.0: Handle month navigation
  const handlePreviousMonth = useCallback(() => {
    if (onNavigateMonth) {
      onNavigateMonth(-1);
    }
  }, [onNavigateMonth]);

  const handleNextMonth = useCallback(() => {
    if (onNavigateMonth) {
      onNavigateMonth(1);
    }
  }, [onNavigateMonth]);

  // Phase 4.0: Handle "Today" button
  const handleToday = useCallback(() => {
    if (onNavigateToToday) {
      onNavigateToToday();
    }
  }, [onNavigateToToday]);

  // Generate monthly buckets (memoized)
  // Start from 1 month before anchor date to show past context
  const bucketStartDate = useMemo(() => {
    const start = new Date(anchorDate);
    start.setMonth(start.getMonth() - 1);
    return start;
  }, [anchorDate]);

  const buckets = useMemo(() => {
    return getBuckets('month', bucketStartDate, MONTHS_TO_DISPLAY);
  }, [bucketStartDate]);

  // Handle bucket click (opens Bottom Sheet)
  const handleBucketClick = useCallback((
    bucket: TimeBucket,
    scope: { type: 'track' | 'subtrack'; id: string; name: string }
  ) => {
    if (onBucketClick) {
      onBucketClick(bucket, scope);
    } else {
      // Stub: Log bucket metadata for now
      console.log('[RoadmapMonthView] Bucket clicked:', {
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
      items: RoadmapItem[];
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

        // Aggregate the items using existing logic
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

  // Phase 3.9 UI Polish: Get current month for Today indicator (must be before early returns)
  const today = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => startOfMonth(today), [today]);

  // Phase 4.0: Skeleton loading state
  if (projection.loading) {
    const skeletonTimelineWidth = MONTHS_TO_DISPLAY * bucketWidth;
    const skeletonTotalWidth = sidebarWidth + skeletonTimelineWidth;
    
    return (
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Navigation skeleton */}
        {(onNavigateMonth || onMonthClick || onNavigateToToday) && (
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="w-20 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="w-40 h-5 bg-gray-200 rounded"></div>
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
                {Array.from({ length: MONTHS_TO_DISPLAY }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r border-gray-300 flex items-center justify-center bg-white"
                    style={{ width: `${bucketWidth}px`, height: '52px' }}
                  >
                    <div className="w-24 h-3 bg-gray-200 rounded"></div>
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
                  {Array.from({ length: MONTHS_TO_DISPLAY }).map((_, bucketIdx) => (
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
      {(onNavigateMonth || onMonthClick || onNavigateToToday) && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={handlePreviousMonth}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150 ease-out min-h-[44px] active:bg-gray-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Previous month"
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
            onClick={handleNextMonth}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150 ease-out min-h-[44px] active:bg-gray-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Next month"
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
            {/* Month headers - Phase 3.9: Clickable to zoom to Week View */}
            {/* Phase 3.9 UI Polish: Today indicator and improved styling */}
            <div className="relative flex" style={{ width: `${timelineWidth}px` }}>
              {buckets.map(bucket => {
                const monthStartStr = bucket.startDate.toISOString().split('T')[0];
                const isClickable = !!onMonthClick;
                const bucketMonthStart = startOfMonth(bucket.startDate);
                const isCurrentMonth = bucketMonthStart.getTime() === currentMonthStart.getTime();
                
                return (
                  <button
                    key={bucket.key}
                    onClick={() => isClickable && handleMonthClick(monthStartStr)}
                    className={`flex-1 border-r border-gray-300 flex items-center justify-center bg-white transition-all duration-150 ease-out ${
                      isClickable ? 'hover:bg-gray-50 cursor-pointer active:bg-gray-100' : ''
                    } ${isCurrentMonth ? 'bg-blue-50 border-b-2 border-b-blue-500' : ''}`}
                    style={{ width: `${bucketWidth}px`, height: '52px' }}
                    title={isClickable ? 'Click to view weeks in this month' : undefined}
                  >
                    <span className={`text-xs font-medium text-center px-2 py-1 ${isCurrentMonth ? 'text-blue-700' : 'text-gray-800'}`}>
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
                      className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-blue-600 transition-all duration-150 ease-out active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                    >
                      {isSubtrack && (
                        <span className="text-gray-400 text-xs flex-shrink-0" style={{ width: '16px' }}>
                          └
                        </span>
                      )}
                      <span
                        className={`text-sm truncate flex-1 min-w-0 ${isSubtrack ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}
                        style={{ 
                          color: row.color || undefined,
                        }}
                        title={row.name}
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

                {/* Month Buckets */}
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
                          viewMode="month"
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

      <AssignTrackModal
        entityType={assignModal.entityType}
        entityId={assignModal.entityId}
        entityName={assignModal.entityName}
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal({ ...assignModal, isOpen: false })}
      />
    </div>
  );
}
