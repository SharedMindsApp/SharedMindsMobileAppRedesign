import { useState, useEffect } from 'react';
import { BottomSheet } from '../shared/BottomSheet';
import {
  createInterpretation,
  updateInterpretation,
  type TrackerInterpretation,
} from '../../lib/trackerStudio/trackerInterpretationNoteService';
import { listTrackers } from '../../lib/trackerStudio/trackerService';
import { listContextEvents } from '../../lib/trackerStudio/contextEventService';
import type { Tracker } from '../../lib/trackerStudio/types';
import type { ContextEvent } from '../../lib/trackerStudio/contextEventTypes';
import { showToast } from '../Toast';

interface AddInterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingInterpretation?: TrackerInterpretation | null;
  initialTrackerIds?: string[];
  initialContextEventId?: string | null;
  initialDateRange?: { start: string; end: string };
}

export function AddInterpretationModal({
  isOpen,
  onClose,
  existingInterpretation,
  initialTrackerIds = [],
  initialContextEventId = null,
  initialDateRange,
}: AddInterpretationModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<string[]>(initialTrackerIds);
  const [selectedContextEventId, setSelectedContextEventId] = useState<string | null>(initialContextEventId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (existingInterpretation) {
        // Edit mode
        setTitle(existingInterpretation.title || '');
        setBody(existingInterpretation.body);
        setStartDate(existingInterpretation.start_date);
        setEndDate(existingInterpretation.end_date || '');
        setHasEndDate(!!existingInterpretation.end_date);
        setSelectedTrackerIds(existingInterpretation.tracker_ids || []);
        setSelectedContextEventId(existingInterpretation.context_event_id);
      } else {
        // Create mode
        const today = new Date().toISOString().split('T')[0];
        setTitle('');
        setBody('');
        setStartDate(initialDateRange?.start || today);
        setEndDate(initialDateRange?.end || '');
        setHasEndDate(!!initialDateRange?.end);
        setSelectedTrackerIds(initialTrackerIds);
        setSelectedContextEventId(initialContextEventId);
      }
      setError(null);
    }
  }, [isOpen, existingInterpretation, initialTrackerIds, initialContextEventId, initialDateRange]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [trackersData, contextsData] = await Promise.all([
        listTrackers(false),
        listContextEvents(),
      ]);
      setTrackers(trackersData);
      setContextEvents(contextsData);
    } catch (err) {
      console.error('Failed to load options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError('Body is required');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (hasEndDate && endDate && endDate < startDate) {
      setError('End date cannot be before start date');
      return;
    }

    // Validate that at least one anchor exists
    const hasTrackerIds = selectedTrackerIds.length > 0;
    const hasContextEvent = selectedContextEventId !== null;
    const hasDateRange = startDate && (hasEndDate ? endDate : true);

    if (!hasTrackerIds && !hasContextEvent && !hasDateRange) {
      setError('Please select at least one tracker, context event, or provide a date range');
      return;
    }

    setSaving(true);
    try {
      if (existingInterpretation) {
        await updateInterpretation(existingInterpretation.id, {
          title: title.trim() || null,
          body: body.trim(),
          start_date: startDate,
          end_date: hasEndDate ? (endDate || null) : null,
          tracker_ids: selectedTrackerIds.length > 0 ? selectedTrackerIds : null,
          context_event_id: selectedContextEventId,
        });
        showToast('success', 'Interpretation updated');
      } else {
        await createInterpretation({
          title: title.trim() || null,
          body: body.trim(),
          start_date: startDate,
          end_date: hasEndDate ? (endDate || null) : null,
          tracker_ids: selectedTrackerIds.length > 0 ? selectedTrackerIds : null,
          context_event_id: selectedContextEventId,
        });
        showToast('success', 'Interpretation created');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save interpretation');
    } finally {
      setSaving(false);
    }
  };

  const handleTrackerToggle = (trackerId: string) => {
    setSelectedTrackerIds(prev => {
      if (prev.includes(trackerId)) {
        return prev.filter(id => id !== trackerId);
      } else {
        return [...prev, trackerId];
      }
    });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={existingInterpretation ? 'Edit Interpretation' : 'Add Interpretation'}
      maxHeight="90vh"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Helper text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
          <p className="font-medium mb-1">Your personal reflection</p>
          <p className="text-xs">This note is for your understanding — not analysis. It won't affect your data or reminders.</p>
        </div>

        {/* Title (Optional) */}
        <div>
          <label htmlFor="interpretation-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title (Optional)
          </label>
          <input
            id="interpretation-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Recovery period reflection"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          />
        </div>

        {/* Body (Required) */}
        <div>
          <label htmlFor="interpretation-body" className="block text-sm font-medium text-gray-700 mb-1">
            Your Reflection *
          </label>
          <textarea
            id="interpretation-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Write your thoughts about this period..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
            disabled={saving}
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="space-y-2">
            <div>
              <label htmlFor="interpretation-start-date" className="block text-xs text-gray-600 mb-1">
                Start Date *
              </label>
              <input
                id="interpretation-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => {
                    setHasEndDate(e.target.checked);
                    if (!e.target.checked) {
                      setEndDate('');
                    }
                  }}
                  disabled={saving}
                />
                <span className="text-sm text-gray-700">Has End Date</span>
              </label>
              {hasEndDate && (
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tracker Selection (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link to Trackers (Optional)
          </label>
          {loadingOptions ? (
            <p className="text-sm text-gray-500">Loading trackers...</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {trackers.length === 0 ? (
                <p className="text-xs text-gray-500">No trackers available</p>
              ) : (
                trackers.map(tracker => (
                  <label
                    key={tracker.id}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTrackerIds.includes(tracker.id)}
                      onChange={() => handleTrackerToggle(tracker.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={saving}
                    />
                    <span className="text-sm text-gray-900">{tracker.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Context Event Selection (Optional) */}
        <div>
          <label htmlFor="interpretation-context" className="block text-sm font-medium text-gray-700 mb-2">
            Link to Context Event (Optional)
          </label>
          {loadingOptions ? (
            <p className="text-sm text-gray-500">Loading context events...</p>
          ) : (
            <select
              id="interpretation-context"
              value={selectedContextEventId || ''}
              onChange={(e) => setSelectedContextEventId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              <option value="">None</option>
              {contextEvents.map(context => (
                <option key={context.id} value={context.id}>
                  {context.label} ({context.start_date} {context.end_date ? `- ${context.end_date}` : 'ongoing'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : existingInterpretation ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
