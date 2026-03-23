/**
 * CreateRoadmapItemSheet
 * 
 * Phase 5: Creation flow for Roadmap Items (Tasks, Events, Milestones)
 * Phase 6a: Edit mode support
 * 
 * ⚠️ CRITICAL: This component is render-only. All creation/editing happens via onSubmit callback.
 * It receives projection data to enable track/subtrack selection.
 */

import { useState, useEffect } from 'react';
import { BottomSheet } from '../../shared/BottomSheet';
import type { RoadmapItemType, RoadmapItem } from '../../../lib/guardrails/coreTypes';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';
import { X } from 'lucide-react';

interface CreateRoadmapItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projection: RoadmapProjection;
  preselectTrackId?: string;
  preselectType?: RoadmapItemType;
  canEdit: boolean;
  mode?: 'create' | 'edit';
  initialValues?: RoadmapItem;
  onSubmit: (data: {
    trackId: string;
    subtrackId?: string;
    type: RoadmapItemType;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => Promise<void>;
}

const TYPE_OPTIONS: Array<{ value: RoadmapItemType; label: string; requiresStartDate: boolean }> = [
  { value: 'task', label: 'Task', requiresStartDate: false },
  { value: 'event', label: 'Event', requiresStartDate: true },
  { value: 'milestone', label: 'Milestone', requiresStartDate: true },
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export function CreateRoadmapItemSheet({
  isOpen,
  onClose,
  projection,
  preselectTrackId,
  preselectType,
  canEdit,
  mode = 'create',
  initialValues,
  onSubmit,
}: CreateRoadmapItemSheetProps) {
  const [type, setType] = useState<RoadmapItemType>(preselectType || 'task');
  const [trackId, setTrackId] = useState<string>(preselectTrackId || '');
  const [subtrackId, setSubtrackId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('not_started');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase 6a: Reset form when modal opens/closes or initialValues change
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialValues) {
        // Edit mode: populate from initialValues
        setType(initialValues.type);
        setTrackId(initialValues.trackId);
        setSubtrackId(initialValues.subtrackId || '');
        setTitle(initialValues.title || '');
        setDescription(initialValues.description || '');
        setStartDate(initialValues.startDate ? initialValues.startDate.split('T')[0] : '');
        setEndDate(initialValues.endDate ? initialValues.endDate.split('T')[0] : '');
        setStatus(initialValues.status || 'not_started');
      } else {
        // Create mode: reset to defaults
        setType(preselectType || 'task');
        setTrackId(preselectTrackId || '');
        setSubtrackId('');
        setTitle('');
        setDescription('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setStatus('not_started');
      }
    }
  }, [isOpen, mode, initialValues, preselectType, preselectTrackId]);

  // Reset subtrack when track changes
  useEffect(() => {
    setSubtrackId('');
  }, [trackId]);

  const selectedTypeOption = TYPE_OPTIONS.find(opt => opt.value === type);
  const requiresStartDate = selectedTypeOption?.requiresStartDate || false;

  // Get available tracks from projection (only visible tracks)
  const availableTracks = projection.tracks.filter(t => t.instance?.includeInRoadmap !== false);

  // Get available subtracks for selected track
  const selectedTrack = availableTracks.find(t => t.track.id === trackId);
  const availableSubtracks = selectedTrack?.subtracks || [];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !trackId || isSubmitting || !canEdit) return;

    if (requiresStartDate && !startDate) {
      alert(`Item type '${type}' requires a start date`);
      return;
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        trackId,
        subtrackId: subtrackId || undefined,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
      });
      onClose();
    } catch (error: any) {
      console.error(`Failed to ${mode} roadmap item:`, error);
      alert(error.message || `Failed to ${mode} roadmap item`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderFormContent = () => (
    <div className="space-y-4">
      {/* Type Selector - hide if preselected */}
      {!preselectType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RoadmapItemType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
            disabled={isSubmitting || !canEdit}
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.requiresStartDate ? '(requires dates)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Track Selection - required */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Track <span className="text-red-500">*</span>
        </label>
        {availableTracks.length === 0 ? (
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500 min-h-[44px] flex items-center">
            No tracks available. Create a track first.
          </div>
        ) : (
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
            required
            disabled={isSubmitting || !canEdit || !!preselectTrackId}
          >
            <option value="">Select a track...</option>
            {availableTracks.map(track => (
              <option key={track.track.id} value={track.track.id}>
                {track.track.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Subtrack Selection - optional, only shown if track has subtracks */}
      {trackId && availableSubtracks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subtrack <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <select
            value={subtrackId}
            onChange={(e) => setSubtrackId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
            disabled={isSubmitting || !canEdit}
          >
            <option value="">None (add to track directly)</option>
            {availableSubtracks.map(subtrack => (
              <option key={subtrack.track.id} value={subtrack.track.id}>
                {subtrack.track.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title - required */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter item title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
          required
          disabled={isSubmitting || !canEdit}
          autoFocus
        />
      </div>

      {/* Description - optional */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          disabled={isSubmitting || !canEdit}
        />
      </div>

      {/* Dates - conditional based on type */}
      {(requiresStartDate || startDate || endDate) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date {requiresStartDate && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
              required={requiresStartDate}
              disabled={isSubmitting || !canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
              disabled={isSubmitting || !canEdit}
              min={startDate || undefined}
            />
          </div>
        </div>
      )}

      {/* Status - optional */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px]"
          disabled={isSubmitting || !canEdit}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {!canEdit && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {mode === 'edit' 
            ? "You don't have permission to edit this item."
            : "You don't have permission to create items in this project."}
        </div>
      )}
    </div>
  );

  // Phase 6a: Determine header title based on mode
  const headerTitle = mode === 'edit' 
    ? `Edit ${TYPE_OPTIONS.find(t => t.value === type)?.label || 'Item'}`
    : `Add ${preselectType ? TYPE_OPTIONS.find(t => t.value === preselectType)?.label || 'Item' : 'Roadmap Item'}`;

  // Mobile: Bottom Sheet
  if (isMobile) {
    const header = (
      <h2 className="text-lg font-semibold text-gray-900">
        {headerTitle}
      </h2>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!title.trim() || !trackId || isSubmitting || !canEdit}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {mode === 'edit' ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            mode === 'edit' ? 'Save' : 'Create'
          )}
        </button>
      </div>
    );

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        header={header}
        footer={footer}
        maxHeight="90vh"
        closeOnBackdrop={!isSubmitting}
        preventClose={isSubmitting}
      >
        <div className="px-4 py-4 overflow-y-auto">
          {renderFormContent()}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {headerTitle}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderFormContent()}
        </form>

        <div className="flex gap-3 p-4 md:p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!title.trim() || !trackId || isSubmitting || !canEdit}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'edit' ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              mode === 'edit' ? 'Save Changes' : 'Create Item'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}