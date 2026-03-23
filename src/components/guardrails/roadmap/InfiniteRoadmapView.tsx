import { useState, useEffect, useRef, useMemo } from 'react';
import { useRoadmapProjection, useRoadmapUIState } from '../../../hooks/useRoadmapProjection';
import { useRoadmapViewPreferences } from '../../../hooks/useRoadmapViewPreferences';
import { createRoadmapItem, type RoadmapItem } from '../../../lib/guardrails/roadmapService';
import {
  generateTimelineColumns,
  dateToPosition,
  getColumnWidth,
  parseDateFromDB,
  getTodayIndicatorPosition,
  type ZoomLevel,
} from '../../../lib/guardrails/infiniteTimelineUtils';
import { RoadmapItemModal } from './RoadmapItemModal';
import { RoadmapHeader } from './RoadmapHeader';
import { RoadmapTimeline } from './RoadmapTimeline';
import { RoadmapEmptyState, isProjectionEmpty } from './RoadmapEmptyState';
import type { RoadmapProjectionTrack } from '../../../lib/guardrails/roadmapProjectionTypes';

interface InfiniteRoadmapViewProps {
  masterProjectId: string;
  // Phase 4: Optional callbacks for settings control
  onZoomLevelReady?: (setZoom: (zoom: ZoomLevel) => void, getZoom: () => ZoomLevel) => void;
  onProjectionReady?: (refresh: () => Promise<void>) => void;
  // Phase 5: Optional callbacks for creation (for architectural compliance)
  onAddSubtrack?: (parentTrackId: string) => void;
  // Phase 6a: Optional callback for editing items
  onItemClick?: (item: RoadmapItem) => void;
}

const ROW_HEIGHT = 48;
const SIDEBAR_WIDTH = 300;

// Phase 3: Export FlatTrackRow type for use in RoadmapTimeline
export interface FlatTrackRow {
  id: string;
  trackId: string;
  name: string;
  color: string | null;
  depth: number; // 0 = track, 1+ = subtrack
  isSubtrack: boolean;
  isCollapsed: boolean;
  hasChildren: boolean;
  itemCount: number;
  totalItemCount: number;
  items: RoadmapItem[];
  category: string;
  canEdit: boolean;
  isVisible: boolean; // Based on parent collapse state
}


/**
 * InfiniteRoadmapView Component
 * 
 * Phase 0 Architectural Lock-In: Desktop Roadmap Visualization
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Render projection data (tracks, subtracks, items)
 * - ✅ Handle UI state (collapse, highlight, focus via localStorage)
 * - ✅ Visualize time relationships
 * - ✅ Navigate to workspaces (via callbacks)
 * - ✅ Display timeline with zoom controls
 * 
 * What this component MUST NOT do:
 * - ❌ Mutate domain data
 * - ❌ Create/edit/delete tracks or items
 * - ❌ Filter tracks based on item presence
 * - ❌ Access workspace data directly
 * - ❌ Apply business logic
 * - ❌ Persist UI state to database
 * 
 * Empty State Validity:
 * - Empty is a valid state — tracks/subtracks render even with zero items
 * - Empty state check only verifies track existence, not item presence
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */
export function InfiniteRoadmapView({ masterProjectId, onZoomLevelReady, onProjectionReady, onAddSubtrack, onItemClick }: InfiniteRoadmapViewProps) {
  // Phase 2: Use projection adapter instead of direct service calls
  const projection = useRoadmapProjection(masterProjectId);
  const { toggleTrackCollapse, toggleSubtrackCollapse, expandAllTracks, collapseAllTracks } = useRoadmapUIState(masterProjectId);
  
  // Phase 4: Initialize zoom level from preferences or default
  const { viewPrefs } = useRoadmapViewPreferences();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(viewPrefs.defaultZoomLevel);

  // Phase 4: Expose zoom controls to parent via callback
  useEffect(() => {
    if (onZoomLevelReady) {
      onZoomLevelReady(setZoomLevel, () => zoomLevel);
    }
  }, [onZoomLevelReady, zoomLevel]);

  // Phase 4: Expose projection refresh to parent
  useEffect(() => {
    if (onProjectionReady) {
      onProjectionReady(projection.refresh);
    }
  }, [onProjectionReady, projection.refresh]);
  const [scrollX, setScrollX] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [showSideProjects, setShowSideProjects] = useState(true);
  const [addItemModal, setAddItemModal] = useState<{
    open: boolean;
    trackId: string | null;
    trackName: string;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const hasInitializedScroll = useRef(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (timelineRef.current && !hasInitializedScroll.current && !projection.loading) {
      const columnWidth = getColumnWidth(zoomLevel);
      const todayX = getTodayIndicatorPosition(zoomLevel, columnWidth);
      const centerOffset = viewportWidth / 2;
      timelineRef.current.scrollLeft = todayX + (viewportWidth / 2) - centerOffset;
      hasInitializedScroll.current = true;
    }
  }, [projection.loading, zoomLevel, viewportWidth]);

  useEffect(() => {
    const handleResize = () => {
      if (timelineRef.current) {
        setViewportWidth(timelineRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Phase 3: Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modKey) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleFitToItems();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: Flatten projection tracks into renderable rows
  const flatTracks = useMemo((): FlatTrackRow[] => {
    const result: FlatTrackRow[] = [];

    function processTrack(
      projectionTrack: RoadmapProjectionTrack,
      depth: number,
      parentVisible: boolean
    ): void {
      // Filter out side projects if needed
      if (!showSideProjects && projectionTrack.track.category === 'side_project') {
        return;
      }

      const isVisible = parentVisible && !projectionTrack.uiState.collapsed;
      
      // Add track row
      result.push({
        id: projectionTrack.track.id,
        trackId: projectionTrack.track.id,
        name: projectionTrack.track.name,
        color: projectionTrack.track.color,
        depth,
        isSubtrack: false,
        isCollapsed: projectionTrack.uiState.collapsed,
        hasChildren: projectionTrack.subtracks.length > 0,
        itemCount: projectionTrack.itemCount,
        totalItemCount: projectionTrack.totalItemCount,
        items: projectionTrack.items,
        category: projectionTrack.track.category,
        canEdit: projectionTrack.canEdit,
        isVisible,
      });

      // Add subtrack rows if track is expanded
      if (!projectionTrack.uiState.collapsed && projectionTrack.subtracks.length > 0) {
        projectionTrack.subtracks.forEach(subtrack => {
          const subtrackVisible = isVisible && !subtrack.uiState.collapsed;
          
          result.push({
            id: subtrack.track.id,
            trackId: subtrack.track.id,
            name: subtrack.track.name,
            color: subtrack.track.color,
            depth: depth + 1,
            isSubtrack: true,
            isCollapsed: subtrack.uiState.collapsed,
            hasChildren: false,
            itemCount: subtrack.itemCount,
            totalItemCount: subtrack.itemCount,
            items: subtrack.items,
            category: subtrack.track.category,
            canEdit: subtrack.canEdit,
            isVisible: subtrackVisible,
          });
        });
      }
    }

    projection.tracks.forEach(track => {
      processTrack(track, 0, true);
    });

    return result;
  }, [projection.tracks, showSideProjects]);

  const visibleTracks = useMemo(() => {
    return flatTracks.filter(t => t.isVisible);
  }, [flatTracks]);

  const columns = useMemo((): TimelineColumn[] => {
    const columnWidth = getColumnWidth(zoomLevel);
    return generateTimelineColumns({
      zoomLevel,
      columnWidth,
      today,
      scrollX,
      viewportWidth,
    });
  }, [zoomLevel, scrollX, viewportWidth, today]);

  // Phase 2: Handle collapse via UI state hook
  function handleToggleCollapse(trackId: string, isSubtrack: boolean) {
    if (isSubtrack) {
      toggleSubtrackCollapse(trackId);
    } else {
      toggleTrackCollapse(trackId);
    }
  }

  // Phase 2: Bulk actions (desktop only)
  function handleExpandAll() {
    expandAllTracks();
  }

  function handleCollapseAll() {
    const topLevelTrackIds = projection.tracks.map(t => t.track.id);
    collapseAllTracks(topLevelTrackIds);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    setScrollX(e.currentTarget.scrollLeft);
  }

  function handleZoomIn() {
    setZoomLevel(prev => {
      if (prev === 'month') return 'week';
      if (prev === 'week') return 'day';
      return prev;
    });
  }

  function handleZoomOut() {
    setZoomLevel(prev => {
      if (prev === 'day') return 'week';
      if (prev === 'week') return 'month';
      return prev;
    });
  }

  // Phase 3: Fit to Items - calculate optimal zoom and scroll position
  function handleFitToItems() {
    if (visibleTracks.length === 0 || !timelineRef.current) return;

    // Collect all item dates
    const allDates: Date[] = [];
    visibleTracks.forEach(track => {
      if (!track.isCollapsed) {
        track.items.forEach(item => {
          if (item.startDate) {
            allDates.push(parseDateFromDB(item.startDate));
          }
          if (item.endDate) {
            allDates.push(parseDateFromDB(item.endDate));
          }
        });
      }
    });

    if (allDates.length === 0) return;

    // Find date range
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Calculate optimal zoom level
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    let optimalZoom: ZoomLevel = 'month';
    
    if (daysDiff <= 14) {
      optimalZoom = 'day';
    } else if (daysDiff <= 90) {
      optimalZoom = 'week';
    }

    setZoomLevel(optimalZoom);

    // Scroll to show the range (with some padding)
    setTimeout(() => {
      if (timelineRef.current) {
        const columnWidth = getColumnWidth(optimalZoom);
        const minX = dateToPosition(minDate, optimalZoom, columnWidth, today);
        const padding = viewportWidth * 0.1; // 10% padding on each side
        timelineRef.current.scrollLeft = Math.max(0, minX - padding);
      }
    }, 0);
  }

  async function handleAddItem(trackId: string, data: { type: string; title: string; startDate?: string; endDate?: string; status?: string }) {
    try {
      await createRoadmapItem({
        masterProjectId,
        trackId,
        type: data.type as any,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: (data.status as any) || 'not_started',
      });
      await projection.refresh();
      setAddItemModal(null);
    } catch (error: any) {
      console.error('Failed to create roadmap item:', error);
      alert(error.message || 'Failed to create roadmap item');
    }
  }

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

  const columnWidth = getColumnWidth(zoomLevel);
  const todayX = getTodayIndicatorPosition(zoomLevel, columnWidth);
  const timelineWidth = Math.max(viewportWidth * 3, columns.length * columnWidth);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Phase 3: Extracted header component */}
      <RoadmapHeader
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToItems={handleFitToItems}
        showSideProjects={showSideProjects}
        onToggleSideProjects={() => setShowSideProjects(!showSideProjects)}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-x-auto overflow-y-auto"
          ref={timelineRef}
          onScroll={handleScroll}
        >
          {/* Phase 3: Extracted timeline component */}
          <RoadmapTimeline
            visibleTracks={visibleTracks}
            columns={columns}
            today={today}
            todayX={todayX}
            timelineWidth={timelineWidth}
            columnWidth={columnWidth}
            zoomLevel={zoomLevel}
            sidebarWidth={SIDEBAR_WIDTH}
            rowHeight={ROW_HEIGHT}
            onToggleCollapse={handleToggleCollapse}
            onAddItem={(trackId, trackName) => setAddItemModal({ open: true, trackId, trackName })}
            onAddSubtrack={onAddSubtrack}
            onItemClick={onItemClick}
            dateToPosition={dateToPosition}
            parseDateFromDB={parseDateFromDB}
          />
        </div>
      </div>

      {addItemModal && (
        <RoadmapItemModal
          open={addItemModal.open}
          trackId={addItemModal.trackId!}
          trackName={addItemModal.trackName}
          onClose={() => setAddItemModal(null)}
          onSubmit={handleAddItem}
        />
      )}
    </div>
  );
}
