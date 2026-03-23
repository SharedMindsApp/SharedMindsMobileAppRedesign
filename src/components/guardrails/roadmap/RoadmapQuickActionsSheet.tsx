/**
 * RoadmapQuickActionsSheet
 * 
 * Phase 5: Wired Quick Actions for real creation flows.
 * 
 * Provides quick access to create:
 * - Tracks (top-level)
 * - Subtracks (child tracks)
 * - Tasks
 * - Events
 * - Milestones
 * 
 * ⚠️ CRITICAL: This component is render-only. All creation happens via callbacks.
 * It launches existing modals/flows, does NOT create directly.
 */

import { BottomSheet } from '../../shared/BottomSheet';
import { PlusCircle, FolderPlus, ListPlus, CalendarPlus, Target } from 'lucide-react';

export interface RoadmapActionContext {
  projectId: string;
  defaultTrackId?: string;
  focusedTrackId?: string;
  canEdit: boolean;
}

interface RoadmapQuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actionContext: RoadmapActionContext;
  onAddTrack: () => void;
  onAddSubtrack: (parentTrackId?: string) => void;
  onAddTask: (trackId?: string) => void;
  onAddEvent: (trackId?: string) => void;
  onAddMilestone: (trackId?: string) => void;
}

export function RoadmapQuickActionsSheet({
  isOpen,
  onClose,
  actionContext,
  onAddTrack,
  onAddSubtrack,
  onAddTask,
  onAddEvent,
  onAddMilestone,
}: RoadmapQuickActionsSheetProps) {
  const { canEdit, focusedTrackId, defaultTrackId } = actionContext;
  
  // Phase 5: Permission gating - disable (don't hide) if no edit permission
  const disabledStyle = canEdit
    ? 'hover:border-blue-300 hover:bg-blue-50'
    : 'opacity-50 cursor-not-allowed bg-gray-50';
  
  const tooltipText = canEdit
    ? undefined
    : "You don't have permission to add items to this roadmap";

  const handleAddTrack = () => {
    if (!canEdit) return;
    onAddTrack();
    onClose();
  };

  const handleAddSubtrack = () => {
    if (!canEdit) return;
    // Phase 5: Use focused track as parent if available, else let modal prompt
    onAddSubtrack(focusedTrackId || defaultTrackId);
    onClose();
  };

  const handleAddTask = () => {
    if (!canEdit) return;
    onAddTask(defaultTrackId);
    onClose();
  };

  const handleAddEvent = () => {
    if (!canEdit) return;
    onAddEvent(defaultTrackId);
    onClose();
  };

  const handleAddMilestone = () => {
    if (!canEdit) return;
    onAddMilestone(defaultTrackId);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions"
      maxHeight="calc(90vh - 80px)"
      closeOnBackdrop={true}
    >
      <div className="space-y-2">
        {/* Add Track */}
        <button
          onClick={handleAddTrack}
          disabled={!canEdit}
          title={tooltipText}
          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg transition-all min-h-[44px] flex items-center gap-3 ${disabledStyle}`}
        >
          <FolderPlus size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Track</span>
        </button>

        {/* Add Subtrack */}
        <button
          onClick={handleAddSubtrack}
          disabled={!canEdit}
          title={tooltipText}
          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg transition-all min-h-[44px] flex items-center gap-3 ${disabledStyle}`}
        >
          <ListPlus size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Subtrack</span>
        </button>

        {/* Add Task */}
        <button
          onClick={handleAddTask}
          disabled={!canEdit}
          title={tooltipText}
          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg transition-all min-h-[44px] flex items-center gap-3 ${disabledStyle}`}
        >
          <PlusCircle size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Task</span>
        </button>

        {/* Add Event */}
        <button
          onClick={handleAddEvent}
          disabled={!canEdit}
          title={tooltipText}
          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg transition-all min-h-[44px] flex items-center gap-3 ${disabledStyle}`}
        >
          <CalendarPlus size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Event</span>
        </button>

        {/* Add Milestone */}
        <button
          onClick={handleAddMilestone}
          disabled={!canEdit}
          title={tooltipText}
          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg transition-all min-h-[44px] flex items-center gap-3 ${disabledStyle}`}
        >
          <Target size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Milestone</span>
        </button>
      </div>
    </BottomSheet>
  );
}
