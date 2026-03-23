import { Link2, LayoutGrid, Maximize2, Tag, Lightbulb } from 'lucide-react';

interface NodesToolbarProps {
  isLinkMode: boolean;
  onToggleLinkMode: () => void;
  onAutoLayout: () => void;
  onResetView: () => void;
  showSectionLabels: boolean;
  onToggleSectionLabels: () => void;
  onAddSideIdea: () => void;
}

export function NodesToolbar({
  isLinkMode,
  onToggleLinkMode,
  onAutoLayout,
  onResetView,
  showSectionLabels,
  onToggleSectionLabels,
  onAddSideIdea,
}: NodesToolbarProps) {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 space-y-1">
        <button
          onClick={onToggleLinkMode}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLinkMode
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Link Mode - Click nodes to create connections"
        >
          <Link2 size={18} />
          <span>Link Mode</span>
        </button>

        <button
          onClick={onAutoLayout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title="Auto-arrange nodes"
        >
          <LayoutGrid size={18} />
          <span>Auto Layout</span>
        </button>

        <button
          onClick={onResetView}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title="Reset view to center"
        >
          <Maximize2 size={18} />
          <span>Reset View</span>
        </button>

        <button
          onClick={onToggleSectionLabels}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showSectionLabels
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Toggle section labels"
        >
          <Tag size={18} />
          <span>Section Labels</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <button
          onClick={onAddSideIdea}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          title="Add a new side idea"
        >
          <Lightbulb size={18} />
          <span>Add Side Idea</span>
        </button>
      </div>

      {isLinkMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs">
          <p className="text-xs text-blue-900 font-medium mb-1">Link Mode Active</p>
          <p className="text-xs text-blue-700">
            Click a source node, then click a target node to create a link.
          </p>
        </div>
      )}
    </div>
  );
}
