import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, X } from 'lucide-react';
import {
  listContextEvents,
  archiveContextEvent,
  type ContextEvent,
} from '../../lib/trackerStudio/contextEventService';
import {
  CONTEXT_EVENT_TYPE_LABELS,
  CONTEXT_EVENT_SEVERITY_LABELS,
  getContextEventTypeColor,
} from '../../lib/trackerStudio/contextEventTypes';
import { showToast } from '../Toast';
import { AddContextEventModal } from './AddContextEventModal';

interface ContextTimelinePanelProps {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export function ContextTimelinePanel({ startDate, endDate }: ContextTimelinePanelProps) {
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ContextEvent | null>(null);

  useEffect(() => {
    loadContextEvents();
  }, [startDate, endDate]);

  const loadContextEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const events = startDate && endDate
        ? await listContextEvents({ start_date: startDate, end_date: endDate })
        : await listContextEvents();
      setContextEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const handleEdit = (event: ContextEvent) => {
    setEditingEvent(event);
    setShowAddModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to remove this context event?')) {
      return;
    }

    try {
      await archiveContextEvent(eventId);
      showToast('success', 'Context event removed');
      await loadContextEvents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove context event');
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingEvent(null);
    loadContextEvents();
  };

  const formatDateRange = (event: ContextEvent): string => {
    const start = new Date(event.start_date).toLocaleDateString();
    if (event.end_date) {
      const end = new Date(event.end_date).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return `${start} (ongoing)`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} sm:size={20} className="text-gray-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Life Context</h3>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 font-medium min-h-[44px] sm:min-h-0"
        >
          <Plus size={16} />
          Add Context
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading context events...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      ) : contextEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No context events</p>
          <p className="text-xs mt-1">Add context to explain periods that affected your tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contextEvents.map(event => (
            <div
              key={event.id}
              className={`p-3 sm:p-4 rounded-lg border ${getContextEventTypeColor(event.type)}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm sm:text-base">{event.label}</span>
                    <span className="text-xs opacity-75">
                      {CONTEXT_EVENT_TYPE_LABELS[event.type]}
                    </span>
                    {event.severity && (
                      <span className="text-xs opacity-75">
                        • {CONTEXT_EVENT_SEVERITY_LABELS[event.severity]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm opacity-90 mb-2">{formatDateRange(event)}</p>
                  {event.notes && (
                    <p className="text-xs sm:text-sm opacity-80 italic break-words">{event.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto sm:ml-4">
                  <button
                    onClick={() => handleEdit(event)}
                    className="p-2 sm:p-1.5 hover:bg-black/10 active:bg-black/20 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Edit"
                    aria-label="Edit context event"
                  >
                    <Edit size={18} sm:size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 sm:p-1.5 hover:bg-black/10 active:bg-black/20 rounded transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Remove"
                    aria-label="Remove context event"
                  >
                    <Trash2 size={18} sm:size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddContextEventModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          existingEvent={editingEvent}
        />
      )}
    </div>
  );
}
