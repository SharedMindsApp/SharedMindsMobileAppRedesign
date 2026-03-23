import { useState, useEffect } from 'react';
import { X, Clock, MapPin, Users, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import type { CalendarEventWithMembers, EventColor } from '../../lib/calendarTypes';
import { createEvent, updateEvent, deleteEvent } from '../../lib/calendar';
import { supabase } from '../../lib/supabase';

interface EventModalProps {
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
  onEventChange: () => void;
  initialDate?: Date;
  initialHour?: number;
  event?: CalendarEventWithMembers;
}

interface HouseholdMemberForEvent {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

const EVENT_COLORS: { value: EventColor; label: string; class: string }[] = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
];

export function EventModalCompact({
  householdId,
  isOpen,
  onClose,
  onEventChange,
  initialDate,
  initialHour,
  event
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<EventColor>('blue');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [members, setMembers] = useState<HouseholdMemberForEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMembers();

      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        const start = new Date(event.start_at);
        const end = new Date(event.end_at);
        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(end.toTimeString().slice(0, 5));
        setAllDay(event.all_day);
        setLocation(event.location || '');
        setColor(event.color);
        setSelectedMembers(event.members?.map(m => m.member_profile_id) || []);
      } else if (initialDate) {
        const dateStr = initialDate.toISOString().split('T')[0];
        setStartDate(dateStr);
        setEndDate(dateStr);

        if (initialHour !== undefined) {
          const startHourStr = initialHour.toString().padStart(2, '0') + ':00';
          const endHour = initialHour + 1;
          const endHourStr = endHour.toString().padStart(2, '0') + ':00';
          setStartTime(startHourStr);
          setEndTime(endHourStr);
        } else {
          const now = new Date();
          const roundedHour = Math.ceil(now.getHours());
          setStartTime(`${roundedHour.toString().padStart(2, '0')}:00`);
          setEndTime(`${(roundedHour + 1).toString().padStart(2, '0')}:00`);
        }
      }
    }
  }, [isOpen, event, initialDate, initialHour]);

  const loadMembers = async () => {
    try {
      // Query space_members and profiles separately to avoid ambiguity
      // space_members has both user_id and invited_by referencing profiles
      const { data: membersData, error: membersError } = await supabase
        .from('space_members')
        .select('id, user_id, email')
        .eq('space_id', householdId)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Get profile info separately
      const userIds = (membersData || []).filter(m => m.user_id).map(m => m.user_id);
      const { data: profilesData } = userIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds) : { data: [] };

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      setMembers((membersData || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: profilesMap.get(m.user_id)?.full_name || m.email,
        email: m.email
      })));
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const startDateTime = allDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();

      const endDateTime = allDay
        ? new Date(endDate).toISOString()
        : new Date(`${endDate}T${endTime}`).toISOString();

      if (event) {
        await updateEvent(event.id, {
          title,
          description,
          start_at: startDateTime,
          end_at: endDateTime,
          all_day: allDay,
          location,
          color,
          member_ids: selectedMembers
        });
      } else {
        await createEvent({
          household_id: householdId,
          title,
          description,
          start_at: startDateTime,
          end_at: endDateTime,
          all_day: allDay,
          location,
          color,
          member_ids: selectedMembers
        });
      }

      onEventChange();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save event:', err);
      setError('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this event?')) return;

    setLoading(true);
    setError(null);

    try {
      await deleteEvent(event.id);
      onEventChange();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setAllDay(false);
    setLocation('');
    setColor('blue');
    setSelectedMembers([]);
    setError(null);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add details..."
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
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <MapPin size={14} />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add location"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.class} ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Users size={14} />
              Participants
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No members available</p>
              ) : (
                members.map(member => (
                  <label
                    key={member.user_id}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.user_id)}
                      onChange={() => toggleMember(member.user_id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{member.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {event && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
