/**
 * RoadmapBucketBottomSheet Component
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * Phase 2d: Roadmap Bucket Drill-Down Bottom Sheet
 * 
 * Read-only inspection surface that displays items in a specific time bucket,
 * grouped by track/subtrack. Allows navigation to workspaces but does not
 * mutate domain data.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display items for a specific bucket (filtered by bucket date range)
 * - ✅ Group items by track/subtrack
 * - ✅ Navigate to track/subtrack workspaces (via callbacks)
 * - ✅ Display read-only item information
 * 
 * What this component MUST NOT do:
 * - ❌ Create/edit/delete roadmap items
 * - ❌ Query Supabase directly
 * - ❌ Mutate domain data
 * - ❌ Filter tracks/subtracks based on item presence
 * - ❌ Recalculate buckets independently
 * - ❌ Replace workspace functionality
 * 
 * This component exists to answer: "What's happening here in time?"
 * It is NOT a replacement for workspaces - it's a navigation gateway.
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, List } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import { doesItemOverlapBucket, type TimeBucket } from '../../../lib/guardrails/roadmapTimeline';
import { formatDateForDisplay, parseDateFromDB } from '../../../lib/guardrails/infiniteTimelineUtils';

interface RoadmapBucketBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bucket: TimeBucket | null;
  projection: RoadmapProjection;
  onNavigateToTrack?: (trackId: string) => void;
  onNavigateToSubtrack?: (subtrackId: string, parentTrackId: string) => void;
}

interface GroupedItems {
  trackId: string;
  trackName: string;
  trackColor: string | null;
  items: RoadmapItem[];
  subtracks: Array<{
    subtrackId: string;
    subtrackName: string;
    subtrackColor: string | null;
    items: RoadmapItem[];
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  event: 'Event',
  milestone: 'Milestone',
  goal: 'Goal',
  habit: 'Habit',
  note: 'Note',
  document: 'Document',
  photo: 'Photo',
  grocery_list: 'Grocery List',
  review: 'Review',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  blocked: { bg: 'bg-red-100', text: 'text-red-700' },
  on_hold: { bg: 'bg-yellow-100', text: 'text-yellow-900' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function RoadmapBucketBottomSheet({
  isOpen,
  onClose,
  bucket,
  projection,
  onNavigateToTrack,
  onNavigateToSubtrack,
}: RoadmapBucketBottomSheetProps) {
  const navigate = useNavigate();

  // Format date range label
  const dateRangeLabel = useMemo(() => {
    if (!bucket) return '';
    
    const startDate = bucket.startDate;
    const endDate = bucket.endDate;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (bucket.viewMode === 'day') {
      return `${months[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()}`;
    } else if (bucket.viewMode === 'week') {
      const startStr = `${months[startDate.getMonth()]} ${startDate.getDate()}`;
      const endStr = `${months[endDate.getMonth()]} ${endDate.getDate()}`;
      return `Week of ${startStr}–${endStr}`;
    } else if (bucket.viewMode === 'month') {
      return `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
    }
    return '';
  }, [bucket]);

  // Get view mode label
  const viewModeLabel = useMemo(() => {
    if (!bucket) return '';
    return bucket.viewMode === 'day' ? 'Day' : bucket.viewMode === 'week' ? 'Week' : 'Month';
  }, [bucket]);

  // Filter and group items by track/subtrack (memoized)
  const groupedItems = useMemo((): GroupedItems[] => {
    if (!bucket) return [];

    const result: Map<string, GroupedItems> = new Map();

    // Iterate through projection tracks
    projection.tracks.forEach(track => {
      // Filter track items that overlap this bucket
      const trackItemsInBucket = track.items.filter(item =>
        doesItemOverlapBucket(item, bucket)
      );

      // Filter subtrack items that overlap this bucket
      const subtrackGroups: Array<{
        subtrackId: string;
        subtrackName: string;
        subtrackColor: string | null;
        items: RoadmapItem[];
      }> = [];

      track.subtracks.forEach(subtrack => {
        const subtrackItemsInBucket = subtrack.items.filter(item =>
          doesItemOverlapBucket(item, bucket)
        );

        if (subtrackItemsInBucket.length > 0) {
          subtrackGroups.push({
            subtrackId: subtrack.track.id,
            subtrackName: subtrack.track.name,
            subtrackColor: subtrack.track.color,
            items: subtrackItemsInBucket,
          });
        }
      });

      // Only include track if it has items in this bucket OR if it has subtracks with items
      if (trackItemsInBucket.length > 0 || subtrackGroups.length > 0) {
        result.set(track.track.id, {
          trackId: track.track.id,
          trackName: track.track.name,
          trackColor: track.track.color,
          items: trackItemsInBucket,
          subtracks: subtrackGroups,
        });
      }
    });

    return Array.from(result.values());
  }, [bucket, projection.tracks]);

  // Calculate total item count
  const totalItemCount = useMemo(() => {
    return groupedItems.reduce((sum, group) => {
      return sum + group.items.length + group.subtracks.reduce((subSum, sub) => subSum + sub.items.length, 0);
    }, 0);
  }, [groupedItems]);

  // Phase 3.0: Handle track navigation (navigate to workspace)
  const handleTrackClick = useCallback((trackId: string) => {
    if (onNavigateToTrack) {
      onNavigateToTrack(trackId);
    } else {
      // Phase 3.0: Navigate to track workspace
      // Get masterProjectId from projection (first track's masterProjectId)
      const masterProjectId = projection.tracks[0]?.track.masterProjectId;
      if (masterProjectId) {
        navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${trackId}`);
      } else {
        console.error('[RoadmapBucketBottomSheet] Cannot navigate: masterProjectId not found in projection');
      }
    }
    onClose();
  }, [onNavigateToTrack, projection, navigate, onClose]);

  // Phase 3.0: Handle subtrack navigation (navigate to workspace)
  const handleSubtrackClick = useCallback((subtrackId: string, parentTrackId: string) => {
    if (onNavigateToSubtrack) {
      onNavigateToSubtrack(subtrackId, parentTrackId);
    } else {
      // Phase 3.0: Navigate to subtrack workspace
      // Get masterProjectId from projection (first track's masterProjectId)
      const masterProjectId = projection.tracks[0]?.track.masterProjectId;
      if (masterProjectId) {
        navigate(`/guardrails/projects/${masterProjectId}/workspace/track/${parentTrackId}/subtrack/${subtrackId}`);
      } else {
        console.error('[RoadmapBucketBottomSheet] Cannot navigate: masterProjectId not found in projection');
      }
    }
    onClose();
  }, [onNavigateToSubtrack, projection, navigate, onClose]);

  // Format item date(s) for display
  const formatItemDates = (item: RoadmapItem): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (item.startDate && item.endDate) {
      const startDate = parseDateFromDB(item.startDate);
      const endDate = parseDateFromDB(item.endDate);
      const startStr = `${months[startDate.getMonth()]} ${startDate.getDate()}`;
      const endStr = `${months[endDate.getMonth()]} ${endDate.getDate()}`;
      return `${startStr} - ${endStr}`;
    } else if (item.endDate) {
      const date = parseDateFromDB(item.endDate);
      return `${months[date.getMonth()]} ${date.getDate()}`;
    } else if (item.startDate) {
      const date = parseDateFromDB(item.startDate);
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    return 'No date';
  };

  if (!bucket) return null;

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{dateRangeLabel}</h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {viewModeLabel}
        </span>
      </div>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      header={header}
      maxHeight="90vh"
      closeOnBackdrop={true}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {/* Summary */}
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{totalItemCount}</span> item{totalItemCount !== 1 ? 's' : ''} in this {viewModeLabel.toLowerCase()}
          </p>
        </div>

        {/* Grouped Items */}
        {groupedItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <List size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900 mb-1">No items in this {viewModeLabel.toLowerCase()}</p>
              <p className="text-xs text-gray-500">This bucket is empty</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {groupedItems.map(group => (
              <div key={group.trackId} className="border-b border-gray-200 last:border-b-0">
                {/* Track Header */}
                <button
                  onClick={() => handleTrackClick(group.trackId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.trackColor || '#e5e7eb' }}
                    />
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {group.trackName}
                    </span>
                    {group.items.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>

                {/* Track Items (if any) */}
                {group.items.length > 0 && (
                  <div className="pl-4 pr-4 pb-3 space-y-2">
                    {group.items.map(item => {
                      const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.not_started;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500">
                                {TYPE_LABELS[item.type] || item.type}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors.bg} ${statusColors.text}`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">{item.title}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>{formatItemDates(item)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtrack Groups */}
                {group.subtracks.map(subtrack => (
                  <div key={subtrack.subtrackId} className="pl-4 border-l-2 border-gray-200">
                    {/* Subtrack Header */}
                    <button
                      onClick={() => handleSubtrackClick(subtrack.subtrackId, group.trackId)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subtrack.subtrackColor || '#d1d5db' }}
                        />
                        <span className="text-sm text-gray-700 truncate">
                          {subtrack.subtrackName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {subtrack.items.length} item{subtrack.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {/* Subtrack Items */}
                    <div className="pl-4 pr-4 pb-3 space-y-2">
                      {subtrack.items.map(item => {
                        const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.not_started;
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-500">
                                  {TYPE_LABELS[item.type] || item.type}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors.bg} ${statusColors.text}`}>
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">{item.title}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar size={12} />
                                <span>{formatItemDates(item)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
