import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Calendar, Tag } from 'lucide-react';
import {
  listInterpretations,
  archiveInterpretation,
  type TrackerInterpretation,
} from '../../lib/trackerStudio/trackerInterpretationNoteService';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import { getContextEvent } from '../../lib/trackerStudio/contextEventService';
import type { Tracker } from '../../lib/trackerStudio/types';
import type { ContextEvent } from '../../lib/trackerStudio/contextEventTypes';
import { showToast } from '../Toast';
import { AddInterpretationModal } from './AddInterpretationModal';

interface InterpretationTimelinePanelProps {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  trackerId?: string; // Filter by tracker
  contextEventId?: string; // Filter by context event
  onInterpretationCreated?: () => void;
}

export function InterpretationTimelinePanel({
  startDate,
  endDate,
  trackerId,
  contextEventId,
  onInterpretationCreated,
}: InterpretationTimelinePanelProps) {
  const [interpretations, setInterpretations] = useState<TrackerInterpretation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInterpretation, setEditingInterpretation] = useState<TrackerInterpretation | null>(null);
  const [trackerCache, setTrackerCache] = useState<Map<string, Tracker>>(new Map());
  const [contextCache, setContextCache] = useState<Map<string, ContextEvent>>(new Map());

  useEffect(() => {
    loadInterpretations();
  }, [startDate, endDate, trackerId, contextEventId]);

  const loadInterpretations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listInterpretations({
        start_date: startDate,
        end_date: endDate,
        tracker_id: trackerId,
        context_event_id: contextEventId,
        include_archived: false,
      });
      setInterpretations(data);

      // Load tracker and context names
      const trackerIds = new Set<string>();
      const contextIds = new Set<string>();
      data.forEach(interp => {
        if (interp.tracker_ids) {
          interp.tracker_ids.forEach(id => trackerIds.add(id));
        }
        if (interp.context_event_id) {
          contextIds.add(interp.context_event_id);
        }
      });

      // Load trackers
      for (const id of trackerIds) {
        if (!trackerCache.has(id)) {
          try {
            const tracker = await getTracker(id);
            if (tracker) {
              setTrackerCache(prev => new Map(prev).set(id, tracker));
            }
          } catch (err) {
            console.error(`Failed to load tracker ${id}:`, err);
          }
        }
      }

      // Load context events
      for (const id of contextIds) {
        if (!contextCache.has(id)) {
          try {
            const context = await getContextEvent(id);
            if (context) {
              setContextCache(prev => new Map(prev).set(id, context));
            }
          } catch (err) {
            console.error(`Failed to load context ${id}:`, err);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interpretations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingInterpretation(null);
    setShowAddModal(true);
  };

  const handleEdit = (interpretation: TrackerInterpretation) => {
    setEditingInterpretation(interpretation);
    setShowAddModal(true);
  };

  const handleDelete = async (interpretationId: string) => {
    if (!window.confirm('Are you sure you want to remove this interpretation?')) {
      return;
    }

    try {
      await archiveInterpretation(interpretationId);
      showToast('success', 'Interpretation removed');
      await loadInterpretations();
      onInterpretationCreated?.();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove interpretation');
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingInterpretation(null);
    loadInterpretations();
    onInterpretationCreated?.();
  };

  const formatDateRange = (interp: TrackerInterpretation): string => {
    const start = new Date(interp.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (interp.end_date) {
      const end = new Date(interp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} sm:size={20} className="text-gray-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Notes</h3>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 font-medium min-h-[44px] sm:min-h-0"
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading interpretations...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      ) : interpretations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BookOpen size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No interpretations yet</p>
          <p className="text-xs mt-1">Add a note to reflect on this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interpretations.map(interp => (
            <div
              key={interp.id}
              className="p-3 sm:p-4 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {interp.title && (
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{interp.title}</h4>
                  )}
                  <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words">{interp.body}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto sm:ml-4">
                  <button
                    onClick={() => handleEdit(interp)}
                    className="p-2 sm:p-1.5 hover:bg-black/10 active:bg-black/20 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Edit"
                    aria-label="Edit interpretation"
                  >
                    <Edit size={18} sm:size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(interp.id)}
                    className="p-2 sm:p-1.5 hover:bg-black/10 active:bg-black/20 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Remove"
                    aria-label="Remove interpretation"
                  >
                    <Trash2 size={18} sm:size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDateRange(interp)}
                </span>
                {interp.tracker_ids && interp.tracker_ids.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    <span className="break-words">
                      {interp.tracker_ids.map(id => {
                        const tracker = trackerCache.get(id);
                        return tracker ? tracker.name : 'Unknown';
                      }).join(', ')}
                    </span>
                  </span>
                )}
                {interp.context_event_id && (
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    {contextCache.get(interp.context_event_id)?.label || 'Unknown context'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddInterpretationModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          existingInterpretation={editingInterpretation}
          initialTrackerIds={trackerId ? [trackerId] : []}
          initialContextEventId={contextEventId || null}
          initialDateRange={startDate && endDate ? { start: startDate, end: endDate } : undefined}
        />
      )}
    </div>
  );
}
