/**
 * RoadmapViewSwitcher Component
 * 
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * 
 * Segmented control for switching between Day, Week, and Month views.
 * Persists selection in localStorage via useRoadmapUIState.
 */

import type { RoadmapViewMode } from '../../../lib/guardrails/roadmapTimeline';

interface RoadmapViewSwitcherProps {
  viewMode: RoadmapViewMode;
  onViewModeChange: (viewMode: RoadmapViewMode) => void;
}

export function RoadmapViewSwitcher({ viewMode, onViewModeChange }: RoadmapViewSwitcherProps) {
  const views: Array<{ mode: RoadmapViewMode; label: string }> = [
    { mode: 'day', label: 'Day' },
    { mode: 'week', label: 'Week' },
    { mode: 'month', label: 'Month' },
  ];

  return (
    <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
      {views.map(view => (
        <button
          key={view.mode}
          onClick={() => onViewModeChange(view.mode)}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-150 ease-out min-h-[44px] ${
            viewMode === view.mode
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          } active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
          aria-label={`Switch to ${view.label} view`}
          aria-current={viewMode === view.mode ? 'page' : undefined}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
