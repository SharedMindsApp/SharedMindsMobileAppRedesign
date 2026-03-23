import { useState, useEffect } from 'react';
import { X, MapPin, Users, Trash2, Calendar, Clock, Share2 } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '../../lib/calendar';
import type { CalendarEventWithMembers, EventColor, CreateEventData, UpdateEventData, CalendarEventType } from '../../lib/calendarTypes';
import { formatDateTimeForInput, parseDateTimeInput } from '../../lib/calendarUtils';
import { syncToPersonalSpace, removeFromPersonalSpace } from '../../lib/spacesSync';
import { ShareToSpaceModal } from '../shared/ShareToSpaceModal';
import { EventTypeSelector } from './EventTypeSelector';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: CalendarEventWithMembers | null;
  householdId: string | null;
  householdMembers: Array<{ id: string; full_name: string; email: string }>;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  event,
  householdId,
  householdMembers,
  initialDate,
  initialStartTime,
  initialEndTime
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<EventColor>('blue');
  const [eventType, setEventType] = useState<CalendarEventType>('event');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      const startFormatted = formatDateTimeForInput(start);
      const endFormatted = formatDateTimeForInput(end);
      setStartDate(startFormatted.date);
      setStartTime(startFormatted.time);
      setEndDate(endFormatted.date);
      setEndTime(endFormatted.time);
      setAllDay(event.all_day);
      setLocation(event.location || '');
      setColor(event.color);
      setEventType(event.event_type || 'event');
      setSelectedMembers(event.members?.map(m => m.member_profile_id) || []);
    } else if (initialDate) {
      const formatted = formatDateTimeForInput(initialDate);
      setStartDate(formatted.date);
      setEndDate(formatted.date);
      if (initialStartTime) setStartTime(initialStartTime);
      if (initialEndTime) setEndTime(initialEndTime);
    }
  }, [event, initialDate, initialStartTime, initialEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const startDateTime = allDay
        ? new Date(startDate + 'T00:00:00')
        : parseDateTimeInput(startDate, startTime);

      const endDateTime = allDay
        ? new Date(endDate + 'T23:59:59')
        : parseDateTimeInput(endDate, endTime);

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      if (event) {
        const updates: UpdateEventData = {
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          all_day: allDay,
          location,
          color,
          event_type: eventType,
          member_ids: selectedMembers
        };

        await updateEvent(event.id, updates);

        await syncToPersonalSpace('calendar_event', event.id, {
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          all_day: allDay,
          location,
          color,
        });
      } else {
        if (!householdId) {
          setError('You need to be part of a household to create events');
          setLoading(false);
          return;
        }

        const newEvent: CreateEventData = {
          household_id: householdId,
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          all_day: allDay,
          location,
          color,
          event_type: eventType,
          member_ids: selectedMembers
        };

        const createdEvent = await createEvent(newEvent);

        await syncToPersonalSpace('calendar_event', createdEvent.id, {
          title,
          description,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          all_day: allDay,
          location,
          color,
        });
      }

      onSave();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    setLoading(true);

    try {
      await deleteEvent(event.id);
      await removeFromPersonalSpace('calendar_event', event.id);
      onSave();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('10:00');
    setAllDay(false);
    setLocation('');
    setColor('blue');
    setEventType('event');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const colors: EventColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink'];

  const colorStyles: Record<EventColor, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Team meeting, Birthday party, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add details about the event..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              All-day event
            </label>
          </div>

          <EventTypeSelector
            value={eventType}
            onChange={setEventType}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock size={16} />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add location (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg ${colorStyles[c]} ${
                    color === c ? 'ring-2 ring-gray-900 ring-offset-2' : ''
                  } hover:scale-110 transition-transform`}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} />
              Assign Members
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {householdMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No household members available</p>
              ) : (
                householdMembers.map(member => (
                  <label key={member.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {event && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} />
                  Delete Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Share2 size={18} />
                  Share
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {event && (
        <ShareToSpaceModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          itemType="calendar_event"
          itemId={event.id}
          itemTitle={event.title}
        />
      )}
    </div>
  );
}
