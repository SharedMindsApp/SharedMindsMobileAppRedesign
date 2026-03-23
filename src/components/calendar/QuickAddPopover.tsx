/**
 * QuickAddPopover - Quick add event popover
 * 
 * Opens when clicking empty day cell or quick add button
 * Creates personal event with title, optional time
 */

import { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { createPersonalCalendarEvent, type CalendarEventType } from '../../lib/personalSpaces/calendarService';
import { EventTypeSelector } from './EventTypeSelector';

export interface QuickAddPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultDate: Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
  onEventCreated?: () => void;
}

export function QuickAddPopover({
  isOpen,
  onClose,
  userId,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onEventCreated,
}: QuickAddPopoverProps) {
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(!defaultStartTime);
  const [startTime, setStartTime] = useState(defaultStartTime || '09:00');
  const [endTime, setEndTime] = useState(defaultEndTime || '10:00');
  const [eventType, setEventType] = useState<CalendarEventType>('event');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      let startAt: string;
      let endAt: string;

      if (allDay) {
        const dateStr = defaultDate.toISOString().split('T')[0];
        startAt = `${dateStr}T00:00:00Z`;
        endAt = `${dateStr}T23:59:59Z`;
      } else {
        const dateStr = defaultDate.toISOString().split('T')[0];
        const [startHour, startMin] = startTime.split(':');
        const [endHour, endMin] = endTime.split(':');
        
        startAt = new Date(
          defaultDate.getFullYear(),
          defaultDate.getMonth(),
          defaultDate.getDate(),
          parseInt(startHour),
          parseInt(startMin)
        ).toISOString();
        
        endAt = new Date(
          defaultDate.getFullYear(),
          defaultDate.getMonth(),
          defaultDate.getDate(),
          parseInt(endHour),
          parseInt(endMin)
        ).toISOString();
      }

      await createPersonalCalendarEvent(userId, {
        title: title.trim(),
        startAt,
        endAt,
        allDay,
        event_type: eventType,
      });

      setTitle('');
      onEventCreated?.();
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setEventType('event');
    setError(null);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={handleClose}
      />
      <div
        className="fixed z-40 bg-white rounded-lg shadow-xl border-2 border-gray-300 p-4 min-w-[300px] max-w-md"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Add Event</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700 flex items-center gap-1">
              <Calendar size={14} />
              All-day event
            </label>
          </div>

          <EventTypeSelector
            value={eventType}
            onChange={setEventType}
            className="mt-2"
          />

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Clock size={12} />
                  Start
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

