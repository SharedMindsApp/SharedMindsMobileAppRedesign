import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, ExternalLink } from 'lucide-react';
import { useTracker } from '../../../hooks/trackerStudio/useTracker';
import { useTrackerEntryForDate } from '../../../hooks/trackerStudio/useTrackerEntries';
import type { TrackerContent, SizeMode } from '../../../lib/fridgeCanvasTypes';

interface TrackerCanvasWidgetProps {
  content: TrackerContent;
  viewMode: SizeMode;
}

export function TrackerCanvasWidget({ content, viewMode }: TrackerCanvasWidgetProps) {
  const navigate = useNavigate();
  const { tracker, loading, error } = useTracker(content.tracker_id);
  const today = new Date().toISOString().split('T')[0];
  const { entry: todayEntry } = useTrackerEntryForDate(content.tracker_id, today);

  const handleOpenTracker = () => {
    navigate(`/tracker-studio/tracker/${content.tracker_id}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Failed to load tracker</p>
          <p className="text-xs text-gray-500">{error || 'Tracker not found'}</p>
        </div>
      </div>
    );
  }

  // Check if tracker is archived
  if (tracker.archived_at) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Tracker archived</p>
          <p className="text-xs text-gray-500">This tracker is no longer active</p>
        </div>
      </div>
    );
  }

  const formatFieldValue = (fieldId: string, value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
      if (field?.type === 'rating') {
        return `${value}/5`;
      }
      return value.toString();
    }
    return String(value);
  };

  // Icon mode - minimal display
  if (viewMode === 'icon') {
    return (
      <div
        onClick={handleOpenTracker}
        className="h-full flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
      >
        <Calendar size={24} className="text-blue-600 mb-1" />
        <p className="text-xs font-medium text-gray-900 text-center line-clamp-2">
          {tracker.name}
        </p>
      </div>
    );
  }

  // Mini/Large/XLarge modes - show today's entry if exists
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
              {tracker.name}
            </h3>
            {tracker.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {tracker.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {todayEntry ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <Calendar size={14} />
              <span>Today</span>
            </div>
            {tracker.field_schema_snapshot.map(field => {
              const value = todayEntry.field_values[field.id];
              return (
                <div key={field.id} className="text-sm">
                  <span className="font-medium text-gray-700">{field.label}:</span>{' '}
                  <span className="text-gray-900">
                    {formatFieldValue(field.id, value)}
                  </span>
                </div>
              );
            })}
            {todayEntry.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">{todayEntry.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-2">No entry for today</p>
            <button
              onClick={handleOpenTracker}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add Entry
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleOpenTracker}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          Open Tracker
        </button>
      </div>
    </div>
  );
}
