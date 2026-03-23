/**
 * RoadmapTimeline
 * 
 * Phase 3: Timeline grid component with weekend shading and enhanced today indicator
 */

import { isToday } from '../../../lib/guardrails/infiniteTimelineUtils';
import type { TimelineColumn } from '../../../lib/guardrails/infiniteTimelineUtils';
import { RoadmapTrackRow } from './RoadmapTrackRow';
import { RoadmapItemBar } from './RoadmapItemBar';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import type { FlatTrackRow } from './InfiniteRoadmapView';

interface RoadmapTimelineProps {
  visibleTracks: FlatTrackRow[];
  columns: TimelineColumn[];
  today: Date;
  todayX: number;
  timelineWidth: number;
  columnWidth: number;
  zoomLevel: 'day' | 'week' | 'month';
  sidebarWidth: number;
  rowHeight: number;
  onToggleCollapse: (trackId: string, isSubtrack: boolean) => void;
  onAddItem: (trackId: string, trackName: string) => void;
  onAddSubtrack?: (trackId: string) => void; // Phase 5: Optional callback for adding subtrack
  onItemClick?: (item: RoadmapItem) => void; // Phase 6a: Edit entry point
  dateToPosition: (date: Date, zoom: 'day' | 'week' | 'month', colWidth: number, today: Date) => number;
  parseDateFromDB: (dateStr: string) => Date;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function RoadmapTimeline({
  visibleTracks,
  columns,
  today,
  todayX,
  timelineWidth,
  columnWidth,
  zoomLevel,
  sidebarWidth,
  rowHeight,
  onToggleCollapse,
  onAddItem,
  onAddSubtrack,
  onItemClick,
  dateToPosition,
  parseDateFromDB,
}: RoadmapTimelineProps) {
  // Phase 3: Detect weekend columns for shading
  const weekendColumns = new Set<number>();
  columns.forEach((col, idx) => {
    if (isWeekend(col.date)) {
      weekendColumns.add(idx);
    }
  });

  return (
    <div className="relative" style={{ height: `${visibleTracks.length * rowHeight}px` }}>
      {/* Phase 3: Enhanced Today indicator with subtle pulse animation */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-20"
        style={{ left: `${sidebarWidth + todayX}px` }}
      >
        {/* Subtle pulse effect using opacity animation */}
        <div className="absolute inset-0 bg-blue-600 opacity-75 animate-pulse" />
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded whitespace-nowrap shadow-md z-10">
          Today
        </div>
      </div>

      {/* Timeline Header */}
      <div className="sticky top-0 left-0 z-30 bg-white border-b border-gray-300 h-12 flex">
        <div
          className="sticky left-0 z-40 bg-white border-r border-gray-300 flex items-center px-4 font-semibold text-gray-700"
          style={{ width: `${sidebarWidth}px` }}
        >
          Tracks
        </div>
        <div className="relative" style={{ width: `${timelineWidth}px` }}>
          {columns.map((col, idx) => {
            const isTodayColumn = isToday(col.date, today);
            const isWeekendCol = weekendColumns.has(idx);
            
            return (
              <div
                key={idx}
                className={`absolute top-0 h-full border-r flex items-center justify-center ${
                  isTodayColumn 
                    ? 'border-blue-400 bg-blue-50' 
                    : isWeekendCol
                    ? 'border-gray-200 bg-gray-50' // Phase 3: Weekend shading
                    : 'border-gray-200 bg-white'
                }`}
                style={{
                  left: `${col.x}px`,
                  width: `${col.width}px`,
                }}
              >
                <span className={`text-xs ${
                  isTodayColumn 
                    ? 'text-blue-700 font-semibold' 
                    : isWeekendCol
                    ? 'text-gray-500' // Phase 3: Weekend text color
                    : 'text-gray-600'
                }`}>
                  {col.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Track Rows */}
      {/* Phase 1: All tracks/subtracks render, items shown only when expanded */}
      {visibleTracks.map((flatTrack, rowIdx) => {
        // Phase 1: Hide items when collapsed, but track/subtrack always renders
        // Empty items array is valid (track/subtrack renders with empty timeline)
        const displayItems = flatTrack.isCollapsed ? [] : flatTrack.items;

        return (
          <div
            key={flatTrack.id}
            className="absolute left-0 right-0 flex hover:bg-gray-50 transition-colors group"
            style={{
              top: `${rowIdx * rowHeight}px`,
              height: `${rowHeight}px`,
            }}
          >
            {/* Track Row Sidebar */}
            <RoadmapTrackRow
              id={flatTrack.id}
              trackId={flatTrack.trackId}
              name={flatTrack.name}
              color={flatTrack.color}
              isSubtrack={flatTrack.isSubtrack}
              isCollapsed={flatTrack.isCollapsed}
              hasChildren={flatTrack.hasChildren}
              totalItemCount={flatTrack.totalItemCount}
              category={flatTrack.category}
              canEdit={flatTrack.canEdit}
              onToggleCollapse={() => onToggleCollapse(flatTrack.trackId, flatTrack.isSubtrack)}
              onAddItem={() => onAddItem(flatTrack.trackId, flatTrack.name)}
              onAddSubtrack={onAddSubtrack ? () => onAddSubtrack(flatTrack.trackId) : undefined}
            />

            {/* Timeline Grid */}
            <div 
              className="relative flex-1 border-b border-gray-200" 
              style={{ width: `${timelineWidth}px` }}
            >
              {/* Phase 3: Weekend background columns */}
              {columns.map((col, idx) => {
                const isWeekendCol = weekendColumns.has(idx);
                if (!isWeekendCol) return null;
                
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 bg-gray-50 opacity-50"
                    style={{
                      left: `${col.x}px`,
                      width: `${col.width}px`,
                    }}
                  />
                );
              })}

              {/* Grid columns */}
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-r border-gray-100"
                  style={{
                    left: `${col.x}px`,
                    width: `${col.width}px`,
                  }}
                />
              ))}

              {/* Phase 3: Render items with enhanced bars */}
              {displayItems.map(item => {
                if (!item.startDate) return null;

                const startDate = parseDateFromDB(item.startDate);
                const endDate = item.endDate ? parseDateFromDB(item.endDate) : null;
                const startX = dateToPosition(startDate, zoomLevel, columnWidth, today);
                const endX = endDate
                  ? dateToPosition(endDate, zoomLevel, columnWidth, today)
                  : startX + columnWidth * 0.8;
                const width = Math.max(endX - startX, 40);
                const isOverdue = endDate ? endDate < today && item.status !== 'completed' : false;

                return (
                  <RoadmapItemBar
                    key={item.id}
                    item={item}
                    startX={startX}
                    width={width}
                    isOverdue={isOverdue}
                    onClick={onItemClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
