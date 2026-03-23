/**
 * RoadmapBucketCell Component
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * 
 * Reusable bucket cell component that displays aggregated item counts and opens
 * a BottomSheet drill-down on click/tap.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ Renders bucket aggregation (counts, badges, priority indicator)
 * - ✅ Handles click/tap to open drill-down BottomSheet
 * - ❌ Does not mutate domain data
 * - ❌ Does not query Supabase directly
 */

import { AlertCircle } from 'lucide-react';
import type { BucketAggregation, RoadmapViewMode } from '../../../lib/guardrails/roadmapTimeline';

interface RoadmapBucketCellProps {
  aggregation: BucketAggregation;
  viewMode: RoadmapViewMode;
  isEmpty: boolean;
  onClick: () => void;
}

export function RoadmapBucketCell({ aggregation, viewMode, isEmpty, onClick }: RoadmapBucketCellProps) {
  const { total, hasPriority } = aggregation;

  return (
    <button
      onClick={onClick}
      className={`
        w-full h-full min-h-[48px] px-2 py-2 rounded border transition-all duration-150 ease-out
        flex flex-col items-center justify-center gap-1
        ${isEmpty
          ? 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 active:bg-gray-200'
          : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 active:bg-blue-200 active:scale-[0.98]'
        }
      `}
      aria-label={`${total} item${total !== 1 ? 's' : ''} in this ${viewMode}`}
    >
      {isEmpty ? (
        <span className="text-xs text-gray-400 opacity-50">Nothing scheduled yet</span>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{total}</span>
            {hasPriority && (
              <AlertCircle size={12} className="text-orange-600" aria-label="Priority items" />
            )}
          </div>
          {/* Optional: Show type/status badges for week/month views */}
          {viewMode !== 'day' && total > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {aggregation.byType.task > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {aggregation.byType.task}
                </span>
              )}
              {aggregation.byType.event > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                  {aggregation.byType.event}
                </span>
              )}
              {aggregation.byType.milestone > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                  {aggregation.byType.milestone}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </button>
  );
}
