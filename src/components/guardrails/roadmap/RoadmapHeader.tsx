/**
 * RoadmapHeader
 * 
 * Phase 3: Desktop-only header component with zoom controls and bulk actions
 */

import { Calendar, ZoomIn, ZoomOut, Sparkles, Eye, EyeOff, Maximize2 } from 'lucide-react';
import type { ZoomLevel } from '../../../lib/guardrails/infiniteTimelineUtils';

interface RoadmapHeaderProps {
  zoomLevel: ZoomLevel;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToItems: () => void;
  showSideProjects: boolean;
  onToggleSideProjects: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function RoadmapHeader({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitToItems,
  showSideProjects,
  onToggleSideProjects,
  onExpandAll,
  onCollapseAll,
}: RoadmapHeaderProps) {
  const zoomLabels = {
    day: 'Daily View',
    week: 'Weekly View',
    month: 'Monthly View',
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Project Roadmap</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm">
          <Calendar size={16} className="text-gray-600" />
          <span className="text-gray-700 font-medium">{zoomLabels[zoomLevel]}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Phase 2: Bulk actions */}
        <button
          onClick={onExpandAll}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expand All Tracks"
        >
          Expand All
        </button>
        <button
          onClick={onCollapseAll}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Collapse All Tracks"
        >
          Collapse All
        </button>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* Side Projects Toggle */}
        <button
          onClick={onToggleSideProjects}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            showSideProjects
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
        >
          {showSideProjects ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className="text-sm font-medium">Side Projects</span>
        </button>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* Phase 3: Zoom Controls */}
        <button
          onClick={onFitToItems}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Fit to Items (Cmd/Ctrl + 0)"
        >
          <Maximize2 size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onZoomOut}
          disabled={zoomLevel === 'month'}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out (Cmd/Ctrl + -)"
        >
          <ZoomOut size={18} className="text-gray-600" />
        </button>
        <button
          onClick={onZoomIn}
          disabled={zoomLevel === 'day'}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom In (Cmd/Ctrl + +)"
        >
          <ZoomIn size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
