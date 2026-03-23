import { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, X, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getTrackerReminders,
  createTrackerReminder,
  updateTrackerReminder,
  disableTrackerReminder,
  deleteTrackerReminder,
  type TrackerReminder,
  type TrackerReminderKind,
  type DeliveryChannel,
  type TrackerReminderSchedule,
} from '../../lib/trackerStudio/trackerReminderService';
import { showToast } from '../Toast';
import type { Tracker } from '../../lib/trackerStudio/types';

interface TrackerReminderSettingsProps {
  tracker: Tracker;
  canEdit: boolean;
}

export function TrackerReminderSettings({ tracker, canEdit }: TrackerReminderSettingsProps) {
  const [reminders, setReminders] = useState<TrackerReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (canEdit) {
      loadReminders();
    }
  }, [tracker.id, canEdit]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrackerReminders(tracker.id);
      setReminders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async (kind: TrackerReminderKind, schedule: TrackerReminderSchedule, channels: DeliveryChannel[]) => {
    try {
      await createTrackerReminder({
        tracker_id: tracker.id,
        reminder_kind: kind,
        schedule,
        delivery_channels: channels,
        is_active: true,
      });
      showToast('success', 'Reminder created');
      setShowCreateForm(false);
      await loadReminders();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create reminder');
    }
  };

  const handleToggleActive = async (reminderId: string, isActive: boolean) => {
    try {
      await updateTrackerReminder(reminderId, { is_active: !isActive });
      showToast('success', isActive ? 'Reminder disabled' : 'Reminder enabled');
      await loadReminders();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update reminder');
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      await deleteTrackerReminder(reminderId);
      showToast('success', 'Reminder deleted');
      await loadReminders();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete reminder');
    }
  };

  if (!canEdit) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
        <p>Only owners and editors can manage reminders for this tracker.</p>
      </div>
    );
  }

  const activeReminders = reminders.filter(r => r.is_active);
  const hasEntryPrompt = activeReminders.some(r => r.reminder_kind === 'entry_prompt');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Reminders</h3>
        </div>
        {!showCreateForm && !hasEntryPrompt && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Add Reminder
          </button>
        )}
      </div>

      {showCreateForm && (
        <CreateReminderForm
          tracker={tracker}
          onSave={handleCreateReminder}
          onCancel={() => setShowCreateForm(false)}
          existingKinds={activeReminders.map(r => r.reminder_kind)}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading reminders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bell size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No reminders configured</p>
          <p className="text-xs mt-1">Reminders help you remember to log entries</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(reminder => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              tracker={tracker}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderCard({
  reminder,
  tracker,
  onToggleActive,
  onDelete,
}: {
  reminder: TrackerReminder;
  tracker: Tracker;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const formatSchedule = (schedule: TrackerReminderSchedule | null): string => {
    if (!schedule) return 'Anytime';

    const parts: string[] = [];

    if (schedule.time_of_day) {
      parts.push(`at ${schedule.time_of_day}`);
    }

    if (schedule.days) {
      if (schedule.days.includes('daily')) {
        parts.push('daily');
      } else if (schedule.days.includes('weekdays')) {
        parts.push('weekdays');
      } else {
        parts.push(schedule.days.join(', '));
      }
    }

    return parts.length > 0 ? parts.join(' ') : 'Anytime';
  };

  const kindLabel = reminder.reminder_kind === 'entry_prompt' ? 'Entry Prompt' : 'Reflection';

  return (
    <div className={`p-4 rounded-lg border ${reminder.is_active ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">{kindLabel}</span>
            {!reminder.is_active && (
              <span className="text-xs text-gray-500">(Disabled)</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatSchedule(reminder.schedule)}
            </span>
            <span className="flex items-center gap-1">
              <Bell size={12} />
              {reminder.delivery_channels.join(', ')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleActive(reminder.id, reminder.is_active)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title={reminder.is_active ? 'Disable' : 'Enable'}
          >
            {reminder.is_active ? (
              <ToggleRight size={20} className="text-blue-600" />
            ) : (
              <ToggleLeft size={20} />
            )}
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateReminderForm({
  tracker,
  onSave,
  onCancel,
  existingKinds,
}: {
  tracker: Tracker;
  onSave: (kind: TrackerReminderKind, schedule: TrackerReminderSchedule, channels: DeliveryChannel[]) => Promise<void>;
  onCancel: () => void;
  existingKinds: TrackerReminderKind[];
}) {
  const [kind, setKind] = useState<TrackerReminderKind>('entry_prompt');
  const [timeOfDay, setTimeOfDay] = useState('20:00');
  const [days, setDays] = useState<string[]>(['daily']);
  const [channels, setChannels] = useState<DeliveryChannel[]>(['in_app']);
  const [saving, setSaving] = useState(false);

  const availableKinds: TrackerReminderKind[] = ['entry_prompt', 'reflection'].filter(
    k => !existingKinds.includes(k)
  ) as TrackerReminderKind[];

  if (availableKinds.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm mb-4">
        <p>All reminder types are already configured for this tracker.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const schedule: TrackerReminderSchedule = {
      time_of_day: timeOfDay,
      days: days,
      quiet_hours: {
        start: '22:00',
        end: '07:00',
      },
    };

    try {
      await onSave(kind, schedule, channels);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reminder Type
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TrackerReminderKind)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {availableKinds.map(k => (
            <option key={k} value={k}>
              {k === 'entry_prompt' ? 'Entry Prompt (remind to log entry)' : 'Reflection (remind to add notes)'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time of Day
        </label>
        <input
          type="time"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Days
        </label>
        <select
          value={days[0] || 'daily'}
          onChange={(e) => setDays([e.target.value])}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekdays">Weekdays</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Channels
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channels.includes('in_app')}
              onChange={(e) => {
                if (e.target.checked) {
                  setChannels([...channels, 'in_app']);
                } else {
                  setChannels(channels.filter(c => c !== 'in_app'));
                }
              }}
            />
            <span className="text-sm text-gray-700">In-App Notification</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channels.includes('push')}
              onChange={(e) => {
                if (e.target.checked) {
                  setChannels([...channels, 'push']);
                } else {
                  setChannels(channels.filter(c => c !== 'push'));
                }
              }}
            />
            <span className="text-sm text-gray-700">Push Notification</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={saving || channels.length === 0}
        >
          {saving ? 'Creating...' : 'Create Reminder'}
        </button>
      </div>
    </form>
  );
}
