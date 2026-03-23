/**
 * Mind Mesh V2 Toolbar - Action Affordance Layer
 *
 * Makes existing canvas actions discoverable without adding new logic.
 *
 * Responsibilities:
 * - Display available actions clearly
 * - Emit existing intents only
 * - Show disabled state when actions unavailable
 * - Never infer or mutate state directly
 *
 * Rules:
 * - Text labels required (no icons-only)
 * - Errors shown verbatim
 * - No automatic retries
 * - No new behavior
 */

import { useState } from 'react';
import { RotateCcw, Info, HelpCircle, Link, Plus, Layers, FolderTree, ChevronDown } from 'lucide-react';

export type HierarchyViewMode = 'tracks_and_subtracks' | 'tracks_only';

interface MindMeshToolbarProps {
  onRollback: () => void;
  onShowHelp: () => void;
  onToggleRelationshipMode: () => void;
  onToggleContainerCreationMode: () => void;
  onToggleTrackCreationMode: () => void;
  onToggleSubtrackCreationMode: () => void;
  onHierarchyViewChange?: (mode: HierarchyViewMode) => void;
  hierarchyViewMode?: HierarchyViewMode;
  hiddenContainerCount?: number;
  canRollback: boolean;
  executing: boolean;
  canEdit: boolean;
  relationshipCreationMode: boolean;
  containerCreationMode: boolean;
  trackCreationMode: boolean;
  subtrackCreationMode: boolean;
  containerCount: number;
  nodeCount: number;
}

export function MindMeshToolbar({
  onRollback,
  onShowHelp,
  onToggleRelationshipMode,
  onToggleContainerCreationMode,
  onToggleTrackCreationMode,
  onToggleSubtrackCreationMode,
  onHierarchyViewChange,
  hierarchyViewMode = 'tracks_and_subtracks',
  hiddenContainerCount = 0,
  canRollback,
  executing,
  canEdit,
  relationshipCreationMode,
  containerCreationMode,
  trackCreationMode,
  subtrackCreationMode,
  containerCount,
  nodeCount,
}: MindMeshToolbarProps) {
  const anyCreationMode = containerCreationMode || trackCreationMode || subtrackCreationMode || relationshipCreationMode;
  const [showHierarchyDropdown, setShowHierarchyDropdown] = useState(false);

  const hierarchyViewLabel = hierarchyViewMode === 'tracks_only' ? 'Show Tracks Only' : 'Show Tracks + Subtracks';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
      {/* Canvas Info */}
      <div className="flex items-center gap-2 pr-3 border-r border-gray-300">
        <Info size={16} className="text-gray-400" />
        <div className="text-sm text-gray-600">
          <span className="font-medium">{containerCount}</span> containers
          <span className="mx-1.5">•</span>
          <span className="font-medium">{nodeCount}</span> nodes
          {hiddenContainerCount > 0 && (
            <span className="ml-2 text-xs text-gray-500">({hiddenContainerCount} hidden)</span>
          )}
        </div>
      </div>

      {/* Hierarchy View Dropdown */}
      {onHierarchyViewChange && (
        <div className="relative">
          <button
            onClick={() => setShowHierarchyDropdown(!showHierarchyDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100"
            title="Change hierarchy view"
          >
            <Layers size={16} />
            {hierarchyViewLabel}
            <ChevronDown size={14} className={`transition-transform ${showHierarchyDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showHierarchyDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHierarchyDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    onHierarchyViewChange('tracks_and_subtracks');
                    setShowHierarchyDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    hierarchyViewMode === 'tracks_and_subtracks' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Show Tracks + Subtracks
                  {hierarchyViewMode === 'tracks_and_subtracks' && (
                    <div className="text-xs text-gray-500 mt-0.5">Full hierarchy visible</div>
                  )}
                </button>
                <button
                  onClick={() => {
                    onHierarchyViewChange('tracks_only');
                    setShowHierarchyDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-t border-gray-200 ${
                    hierarchyViewMode === 'tracks_only' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Show Tracks Only
                  {hierarchyViewMode === 'tracks_only' && (
                    <div className="text-xs text-gray-500 mt-0.5">Subtracks hidden</div>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Create Container Mode Toggle */}
        <button
          onClick={onToggleContainerCreationMode}
          disabled={!canEdit || executing || (anyCreationMode && !containerCreationMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            containerCreationMode
              ? 'bg-blue-100 text-blue-700 border-blue-400 hover:bg-blue-200'
              : 'text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100'
          }`}
          title={
            !canEdit
              ? 'Acquire canvas lock to create containers'
              : anyCreationMode && !containerCreationMode
              ? 'Exit current creation mode first'
              : containerCreationMode
              ? 'Exit container creation mode'
              : 'Create new idea or note container'
          }
        >
          <Plus size={16} />
          {containerCreationMode ? 'Exit Create Mode' : 'Add Idea / Note'}
        </button>

        {/* Add Connection Mode Toggle */}
        <button
          onClick={onToggleRelationshipMode}
          disabled={!canEdit || executing || (anyCreationMode && !relationshipCreationMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            relationshipCreationMode
              ? 'bg-green-100 text-green-700 border-green-400 hover:bg-green-200 shadow-md'
              : 'text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100'
          }`}
          title={
            !canEdit
              ? 'Acquire canvas lock to create connections'
              : anyCreationMode && !relationshipCreationMode
              ? 'Exit current creation mode first'
              : relationshipCreationMode
              ? 'Click to exit connection mode and return to normal editing'
              : 'Click output port, then click input port to connect'
          }
        >
          <Link size={16} className={relationshipCreationMode ? 'animate-pulse' : ''} />
          {relationshipCreationMode ? 'Exit Connection Mode (ESC)' : 'Add Connection'}
        </button>
      </div>

      {/* Integrated Creation Section */}
      <div className="flex items-center gap-2 pl-3 border-l border-gray-300">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add Integrated</span>

        {/* Create Track Button */}
        <button
          onClick={onToggleTrackCreationMode}
          disabled={!canEdit || executing || (anyCreationMode && !trackCreationMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            trackCreationMode
              ? 'bg-purple-100 text-purple-700 border-purple-400 hover:bg-purple-200'
              : 'text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100'
          }`}
          title={
            !canEdit
              ? 'Acquire canvas lock to create tracks'
              : anyCreationMode && !trackCreationMode
              ? 'Exit current creation mode first'
              : trackCreationMode
              ? 'Exit track creation mode'
              : 'Create new track synced with Roadmap'
          }
        >
          <Layers size={16} />
          {trackCreationMode ? 'Exit Track Mode' : 'Add Track'}
        </button>

        {/* Create Subtrack Button */}
        <button
          onClick={onToggleSubtrackCreationMode}
          disabled={!canEdit || executing || (anyCreationMode && !subtrackCreationMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            subtrackCreationMode
              ? 'bg-indigo-100 text-indigo-700 border-indigo-400 hover:bg-indigo-200'
              : 'text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100'
          }`}
          title={
            !canEdit
              ? 'Acquire canvas lock to create subtracks'
              : anyCreationMode && !subtrackCreationMode
              ? 'Exit current creation mode first'
              : subtrackCreationMode
              ? 'Exit subtrack creation mode'
              : 'Create new subtrack under existing track'
          }
        >
          <FolderTree size={16} />
          {subtrackCreationMode ? 'Exit Subtrack Mode' : 'Add Subtrack'}
        </button>
      </div>

      {/* Other Actions */}
      <div className="flex items-center gap-2 pl-3 border-l border-gray-300">

        {/* Rollback Action */}
        <button
          onClick={onRollback}
          disabled={!canRollback || executing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
          title={canRollback ? 'Undo last action' : 'No actions to undo'}
        >
          <RotateCcw size={16} />
          Undo Last Action
        </button>

        {/* Help Button */}
        <button
          onClick={onShowHelp}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100"
          title="Show available actions"
        >
          <HelpCircle size={16} />
          Help
        </button>
      </div>

      {/* Edit State Indicator */}
      {!canEdit && (
        <div className="pl-3 border-l border-gray-300">
          <div className="text-xs text-amber-600 font-medium">
            Canvas locked - Acquire lock to edit
          </div>
        </div>
      )}

      {/* Container Creation Mode Indicator */}
      {containerCreationMode && (
        <div className="pl-3 border-l border-gray-300">
          <div className="text-xs text-blue-600 font-medium">
            Click on canvas to create new container
          </div>
        </div>
      )}

      {/* Port Connection Mode Indicator */}
      {relationshipCreationMode && (
        <div className="pl-3 border-l border-gray-300">
          <div className="text-xs text-green-600 font-medium">
            Click output port, then click input port to connect
          </div>
        </div>
      )}

      {/* Track Creation Mode Indicator */}
      {trackCreationMode && (
        <div className="pl-3 border-l border-gray-300">
          <div className="text-xs text-purple-600 font-medium">
            Click on canvas to place new Track
          </div>
        </div>
      )}

      {/* Subtrack Creation Mode Indicator */}
      {subtrackCreationMode && (
        <div className="pl-3 border-l border-gray-300">
          <div className="text-xs text-indigo-600 font-medium">
            Click a Track container to add a Subtrack
          </div>
        </div>
      )}
    </div>
  );
}
