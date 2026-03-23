import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Edit2,
  Trash2,
  Palette,
  Check,
  X,
  Calendar,
} from 'lucide-react';
import type { TrackTreeNode } from '../../../lib/guardrails/tracksHierarchy';
import { TrackColorPicker } from '../tracks/TrackColorPicker';
import { TrackCalendarSyncModal } from '../settings/TrackCalendarSyncModal';
import { useActiveDataContext } from '../../../contexts/ActiveDataContext';

interface TrackTreeProps {
  tracks: TrackTreeNode[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  onCreateChildTrack: (parentId: string | null) => void;
  onRenameTrack: (trackId: string, newName: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onChangeColor: (trackId: string, color: string) => void;
  trackItemCounts: Map<string, number>;
  projectId?: string;
  projectName?: string;
}

interface TreeNodeProps {
  node: TrackTreeNode;
  level: number;
  isSelected: boolean;
  onSelect: () => void;
  onCreateChild: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onChangeColor: (color: string) => void;
  itemCount: number;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  maxDepthReached: boolean;
  renderChildren: (children: TrackTreeNode[], level: number, projId?: string, projName?: string, onOpenSync?: (trackId: string, trackName: string) => void) => React.ReactNode;
  projectId?: string;
  projectName?: string;
  onOpenCalendarSync?: (trackId: string, trackName: string) => void;
}

function TreeNode({
  node,
  level,
  isSelected,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
  onChangeColor,
  itemCount,
  expandedNodes,
  onToggleExpand,
  maxDepthReached,
  renderChildren,
  projectId,
  projectName,
  onOpenCalendarSync,
}: TreeNodeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);

  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const paddingLeft = level * 20 + 12;

  const handleRename = () => {
    if (editValue.trim() && editValue !== node.name) {
      onRename(editValue.trim());
    }
    setEditing(false);
    setMenuOpen(false);
  };

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setColorPickerPosition({ x: rect.left, y: rect.bottom + 4 });
    setColorPickerOpen(true);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors relative ${
          isSelected
            ? 'bg-blue-50 border-l-4 border-blue-600'
            : 'hover:bg-gray-50 border-l-4 border-transparent'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={onSelect}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <button
          onClick={handleColorClick}
          className="w-3 h-3 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors flex-shrink-0"
          style={{ backgroundColor: node.color || '#6B7280' }}
        />

        {editing ? (
          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                } else if (e.key === 'Escape') {
                  setEditing(false);
                  setEditValue(node.name);
                }
              }}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleRename}
              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditValue(node.name);
              }}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
              {node.description && (
                <p className="text-xs text-gray-500 truncate">{node.description}</p>
              )}
            </div>

            {itemCount > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                {itemCount}
              </span>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
              >
                <MoreHorizontal size={16} className="text-gray-600" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 size={14} />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerOpen(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColorPickerPosition({ x: rect.left, y: rect.bottom + 4 });
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Palette size={14} />
                      Change Color
                    </button>
                    {!maxDepthReached && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateChild();
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Add Child Track
                      </button>
                    )}
                    {onOpenCalendarSync && projectId && projectName && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCalendarSync(node.id, node.name);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Calendar size={14} />
                        Calendar Sync Settings
                      </button>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {colorPickerOpen && colorPickerPosition && (
        <TrackColorPicker
          onColorSelect={(color) => {
            onChangeColor(color);
            setColorPickerOpen(false);
          }}
          onClose={() => setColorPickerOpen(false)}
          position={colorPickerPosition}
        />
      )}

      {hasChildren && isExpanded && renderChildren(node.children, level + 1, projectId, projectName, onOpenCalendarSync)}
    </div>
  );
}

export function TrackTree({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onCreateChildTrack,
  onRenameTrack,
  onDeleteTrack,
  onChangeColor,
  trackItemCounts,
  projectId,
  projectName,
}: TrackTreeProps) {
  const { activeProjectId, activeProject } = useActiveDataContext();
  const [calendarSyncModal, setCalendarSyncModal] = useState<{
    trackId: string;
    trackName: string;
  } | null>(null);

  // Use props if provided, otherwise fall back to context
  const effectiveProjectId = projectId || activeProjectId || '';
  const effectiveProjectName = projectName || activeProject?.name || '';

  function handleOpenCalendarSync(trackId: string, trackName: string) {
    setCalendarSyncModal({ trackId, trackName });
  }

  function handleCloseCalendarSync() {
    setCalendarSyncModal(null);
  }
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    const expandToDepth = (nodes: TrackTreeNode[], currentDepth: number, maxDepth: number) => {
      if (currentDepth >= maxDepth) return;
      nodes.forEach((node) => {
        expanded.add(node.id);
        if (node.children.length > 0) {
          expandToDepth(node.children, currentDepth + 1, maxDepth);
        }
      });
    };
    expandToDepth(tracks, 0, 3);
    return expanded;
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const flattenTracks = (nodes: TrackTreeNode[]): TrackTreeNode[] => {
    const result: TrackTreeNode[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children.length > 0) {
        result.push(...flattenTracks(node.children));
      }
    });
    return result;
  };

  const allTracks = useMemo(() => flattenTracks(tracks), [tracks]);

  const renderTreeNodes = (
    nodes: TrackTreeNode[],
    level: number,
    projId?: string,
    projName?: string,
    onOpenSync?: (trackId: string, trackName: string) => void
  ): React.ReactNode => {
    const effectiveProjId = projId || effectiveProjectId;
    const effectiveProjName = projName || effectiveProjectName;
    const effectiveOnOpenSync = onOpenSync || handleOpenCalendarSync;
    return nodes.map((node) => (
      <TreeNode
        key={node.id}
        node={node}
        level={level}
        isSelected={node.id === selectedTrackId}
        onSelect={() => onSelectTrack(node.id)}
        onCreateChild={() => onCreateChildTrack(node.id)}
        onRename={(newName) => onRenameTrack(node.id, newName)}
        onDelete={() => onDeleteTrack(node.id)}
        onChangeColor={(color) => onChangeColor(node.id, color)}
        itemCount={trackItemCounts.get(node.id) || 0}
        expandedNodes={expandedNodes}
        onToggleExpand={toggleExpand}
        maxDepthReached={level >= 10}
        renderChildren={renderTreeNodes}
        projectId={effectiveProjId}
        projectName={effectiveProjName}
        onOpenCalendarSync={effectiveOnOpenSync}
      />
    ));
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Tracks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {allTracks.length} track{allTracks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => onCreateChildTrack(null)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} />
          Add Track
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm mb-3">No tracks yet</p>
            <button
              onClick={() => onCreateChildTrack(null)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Track
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onSelectTrack(null)}
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                selectedTrackId === null
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              All Tracks
            </button>

            {renderTreeNodes(tracks, 0, effectiveProjectId, effectiveProjectName, handleOpenCalendarSync)}
          </>
        )}
      </div>

      {/* Track Calendar Sync Modal */}
      {calendarSyncModal && effectiveProjectId && effectiveProjectName && (
        <TrackCalendarSyncModal
          isOpen={!!calendarSyncModal}
          onClose={handleCloseCalendarSync}
          projectId={effectiveProjectId}
          projectName={effectiveProjectName}
          trackId={calendarSyncModal.trackId}
          trackName={calendarSyncModal.trackName}
        />
      )}
    </div>
  );
}
