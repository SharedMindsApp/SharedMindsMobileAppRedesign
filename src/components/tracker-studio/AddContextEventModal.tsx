import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import {
  createContextEvent,
  updateContextEvent,
  type ContextEvent,
} from '../../lib/trackerStudio/contextEventService';
import {
  type ContextEventType,
  type ContextEventSeverity,
  CONTEXT_EVENT_TYPE_LABELS,
  CONTEXT_EVENT_SEVERITY_LABELS,
} from '../../lib/trackerStudio/contextEventTypes';
import { showToast } from '../Toast';

interface AddContextEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEvent?: ContextEvent | null;
}

export function AddContextEventModal({
  isOpen,
  onClose,
  existingEvent,
}: AddContextEventModalProps) {
  const [type, setType] = useState<ContextEventType>('custom');
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [severity, setSeverity] = useState<ContextEventSeverity | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        // Edit mode
        setType(existingEvent.type);
        setLabel(existingEvent.label);
        setStartDate(existingEvent.start_date);
        setEndDate(existingEvent.end_date || '');
        setHasEndDate(!!existingEvent.end_date);
        setSeverity(existingEvent.severity);
        setNotes(existingEvent.notes || '');
      } else {
        // Create mode
        const today = new Date().toISOString().split('T')[0];
        setType('custom');
        setLabel('');
        setStartDate(today);
        setEndDate('');
        setHasEndDate(false);
        setSeverity(null);
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, existingEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Label is required');
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

    setSaving(true);
    try {
      if (existingEvent) {
        await updateContextEvent(existingEvent.id, {
          type,
          label: label.trim(),
          start_date: startDate,
          end_date: hasEndDate ? (endDate || null) : null,
          severity,
          notes: notes.trim() || null,
        });
        showToast('success', 'Context event updated');
      } else {
        await createContextEvent({
          type,
          label: label.trim(),
          start_date: startDate,
          end_date: hasEndDate ? (endDate || null) : null,
          severity,
          notes: notes.trim() || null,
        });
        showToast('success', 'Context event created');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save context event');
    } finally {
      setSaving(false);
    }
  };

  const contextTypes: ContextEventType[] = ['illness', 'recovery', 'travel', 'injury', 'stress', 'custom'];
  const severityLevels: (ContextEventSeverity | null)[] = [null, 'low', 'medium', 'high'];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={existingEvent ? 'Edit Context Event' : 'Add Context Event'}
      maxHeight="90vh"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Type */}
        <div>
          <label htmlFor="context-type" className="block text-sm font-medium text-gray-700 mb-1.5">
            Type
          </label>
          <select
            id="context-type"
            value={type}
            onChange={(e) => setType(e.target.value as ContextEventType)}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
            required
            disabled={saving}
          >
            {contextTypes.map(t => (
              <option key={t} value={t}>
                {CONTEXT_EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <label htmlFor="context-label" className="block text-sm font-medium text-gray-700 mb-1.5">
            Label *
          </label>
          <input
            id="context-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Flu recovery, Italy trip, High stress period"
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
            required
            disabled={saving}
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="context-start-date" className="block text-sm font-medium text-gray-700 mb-1.5">
            Start Date *
          </label>
          <input
            id="context-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
            required
            disabled={saving}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="flex items-center gap-2 mb-1.5 min-h-[44px] sm:min-h-0 py-1">
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
              className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed flex-shrink-0"
            />
            <span className="text-sm sm:text-base font-medium text-gray-700">Has End Date</span>
          </label>
          {hasEndDate && (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px] mt-2"
              disabled={saving}
            />
          )}
          {!hasEndDate && (
            <p className="text-xs text-gray-500 mt-1">Leave unchecked for ongoing context</p>
          )}
        </div>

        {/* Severity (Optional) */}
        <div>
          <label htmlFor="context-severity" className="block text-sm font-medium text-gray-700 mb-1.5">
            Severity (Optional)
          </label>
          <select
            id="context-severity"
            value={severity || ''}
            onChange={(e) => setSeverity(e.target.value ? (e.target.value as ContextEventSeverity) : null)}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
            disabled={saving}
          >
            {severityLevels.map(level => (
              <option key={level || 'none'} value={level || ''}>
                {level ? CONTEXT_EVENT_SEVERITY_LABELS[level] : 'Not specified'}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="context-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            id="context-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any additional context or explanation..."
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base sm:text-sm min-h-[80px]"
            disabled={saving}
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium min-h-[44px] text-base sm:text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 font-medium min-h-[44px] text-base sm:text-sm"
            disabled={saving}
          >
            {saving ? 'Saving...' : existingEvent ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
