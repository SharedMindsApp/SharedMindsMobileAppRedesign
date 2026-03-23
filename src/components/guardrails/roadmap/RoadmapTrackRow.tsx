/**
 * RoadmapTrackRow & RoadmapSubtrackRow
 * 
 * Phase 3: Enhanced track row component with visual improvements
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Sparkles, Plus, MoreVertical, ListPlus } from 'lucide-react';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';

interface RoadmapTrackRowProps {
  id: string;
  trackId: string;
  name: string;
  color: string | null;
  isSubtrack: boolean;
  isCollapsed: boolean;
  hasChildren: boolean;
  totalItemCount: number;
  category: string;
  canEdit: boolean;
  onToggleCollapse: () => void;
  onAddItem: () => void;
  onAddSubtrack?: () => void; // Phase 5: Optional callback for adding subtrack
}

export function RoadmapTrackRow({
  id,
  trackId,
  name,
  color,
  isSubtrack,
  isCollapsed,
  hasChildren,
  totalItemCount,
  category,
  canEdit,
  onToggleCollapse,
  onAddItem,
  onAddSubtrack,
}: RoadmapTrackRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSideProject = category === 'side_project';
  const trackColor = color || '#3B82F6';

  // Phase 5: Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      className="sticky left-0 z-10 bg-white border-r border-b border-gray-200 flex items-center gap-2 px-4 group"
      style={{
        // Phase 2: Visual hierarchy - subtracks indented +20px
        paddingLeft: `${16 + (isSubtrack ? 20 : 0)}px`,
      }}
    >
      {/* Phase 3: Track color vertical stripe (full row height) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 flex-shrink-0"
        style={{ backgroundColor: trackColor }}
      />

      {/* Phase 2: Chevron for collapse/expand */}
      {hasChildren && (
        <button
          onClick={onToggleCollapse}
          className="p-0.5 hover:bg-gray-200 rounded transition-transform ml-2"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronRight size={16} className="text-gray-600" />
          ) : (
            <ChevronDown size={16} className="text-gray-600" />
          )}
        </button>
      )}

      {/* Side project indicator */}
      {isSideProject && (
        <Sparkles size={14} className="text-purple-500 flex-shrink-0" />
      )}

      {/* Track color dot (legacy, keeping for now but stripe is primary) */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: trackColor }}
      />

      {/* Track name */}
      <span className="text-sm font-medium text-gray-900 truncate flex-1">
        {name}
      </span>

      {/* Phase 2: Item count badge when collapsed */}
      {isCollapsed && totalItemCount > 0 && (
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          {totalItemCount}
        </span>
      )}

      {/* Phase 3: Add item button (desktop hover only) */}
      {canEdit && (
        <>
          <button
            onClick={onAddItem}
            className="p-1 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add roadmap item"
          >
            <Plus size={14} className="text-blue-600" />
          </button>

          {/* Phase 5: Track menu (three dots) for subtrack creation - only show on tracks (not subtracks) */}
          {!isSubtrack && onAddSubtrack && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Track menu"
              >
                <MoreVertical size={14} className="text-gray-600" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onAddSubtrack();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <ListPlus size={14} className="text-gray-600" />
                    Add Subtrack
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
