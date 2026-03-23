/**
 * ReminderSelector Component
 * 
 * UI component for selecting reminders for events or tasks.
 * Allows users to:
 * - Add multiple reminders with preset offsets
 * - Toggle owner-only or include attendees
 * - Remove reminders
 */

import { useState, useEffect, useRef } from 'react';
import { X, Clock, Plus, Bell } from 'lucide-react';
import {
  getRemindersForEntity,
  createReminder,
  updateReminder,
  deleteReminder,
  REMINDER_PRESETS,
  formatReminderOffset,
  type Reminder,
} from '../../lib/reminders/reminderService';
import { useAuth } from '../../contexts/AuthContext';

interface ReminderSelectorProps {
  entityType: 'event' | 'task';
  entityId: string | null; // null for new entities
  disabled?: boolean;
  pendingReminders?: Array<{ offset_minutes: number; notify_owner: boolean; notify_attendees: boolean }>;
  onPendingRemindersChange?: (reminders: Array<{ offset_minutes: number; notify_owner: boolean; notify_attendees: boolean }>) => void;
  onRemindersChange?: (reminders: Array<{ id: string; offset_minutes: number; notify_owner: boolean; notify_attendees: boolean }>) => void; // Callback when existing reminders change
}

export function ReminderSelector({
  entityType,
  entityId,
  disabled = false,
  pendingReminders: externalPendingReminders,
  onPendingRemindersChange,
  onRemindersChange,
}: ReminderSelectorProps) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousRemindersRef = useRef<string>(''); // Track previous reminders to prevent loops

  // Internal pending reminders state (used if no external state provided)
  const [internalPendingReminders, setInternalPendingReminders] = useState<Array<{
    offset_minutes: number;
    notify_owner: boolean;
    notify_attendees: boolean;
  }>>([]);

  // Use external pending reminders if provided, otherwise use internal
  const pendingReminders = externalPendingReminders ?? internalPendingReminders;
  const setPendingReminders = onPendingRemindersChange ?? setInternalPendingReminders;

  // Load existing reminders when entity exists
  useEffect(() => {
    if (entityId && user) {
      loadReminders();
    } else {
      setReminders([]);
    }
  }, [entityId, user]);

  // Notify parent when reminders change (only for existing entities, with memoization to prevent loops)
  useEffect(() => {
    if (entityId && onRemindersChange) {
      // Create stable reminder data structure
      const reminderData = reminders.map(r => ({
        id: r.id,
        offset_minutes: r.offset_minutes,
        notify_owner: r.notify_owner,
        notify_attendees: r.notify_attendees,
      }));
      
      // Create a stable string representation to compare
      const remindersKey = JSON.stringify(reminderData);
      
      // Only call callback if reminders actually changed (prevent infinite loops)
      if (previousRemindersRef.current !== remindersKey) {
        previousRemindersRef.current = remindersKey;
        onRemindersChange(reminderData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // onRemindersChange is a stable callback from parent, so we don't need it in deps
  }, [reminders, entityId]); // Track reminders array changes

  const loadReminders = async () => {
    if (!entityId || !user) return;

    try {
      setLoading(true);
      setError(null);
      const loadedReminders = await getRemindersForEntity(entityType, entityId);
      setReminders(loadedReminders);
    } catch (err) {
      console.error('[ReminderSelector] Error loading reminders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (offsetMinutes: number) => {
    if (!user || !entityId || disabled) return;

    // Check if reminder already exists
    if (reminders.some(r => r.offset_minutes === offsetMinutes)) {
      return;
    }

    try {
      setError(null);
      const newReminder = await createReminder(user.id, {
        entity_type: entityType,
        entity_id: entityId,
        offset_minutes: offsetMinutes,
        notify_owner: true,
        notify_attendees: false,
      });
      setReminders([...reminders, newReminder].sort((a, b) => a.offset_minutes - b.offset_minutes));
    } catch (err) {
      console.error('[ReminderSelector] Error creating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to add reminder');
    }
  };

  const handleToggleNotifyAttendees = async (reminderId: string, currentValue: boolean) => {
    if (!user || disabled) return;

    try {
      setError(null);
      const updated = await updateReminder(reminderId, {
        notify_attendees: !currentValue,
      });
      setReminders(reminders.map(r => r.id === reminderId ? updated : r));
    } catch (err) {
      console.error('[ReminderSelector] Error updating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to update reminder');
    }
  };

  const handleToggleNotifyOwner = async (reminderId: string, currentValue: boolean) => {
    if (!user || disabled) return;

    try {
      setError(null);
      const updated = await updateReminder(reminderId, {
        notify_owner: !currentValue,
      });
      setReminders(reminders.map(r => r.id === reminderId ? updated : r));
    } catch (err) {
      console.error('[ReminderSelector] Error updating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to update reminder');
    }
  };

  const handleRemoveReminder = async (reminderId: string) => {
    if (!user || disabled) return;

    try {
      setError(null);
      await deleteReminder(reminderId);
      setReminders(reminders.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('[ReminderSelector] Error deleting reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove reminder');
    }
  };

  // Reset pending reminders when entityId is set (entity created)
  useEffect(() => {
    if (entityId && pendingReminders.length > 0) {
      // Clear pending reminders once entity is created
      setPendingReminders([]);
      // Load actual reminders
      loadReminders();
    }
  }, [entityId]);

  const handleAddPendingReminder = (offsetMinutes: number) => {
    if (pendingReminders.some(r => r.offset_minutes === offsetMinutes)) {
      return;
    }
    setPendingReminders([
      ...pendingReminders,
      { offset_minutes: offsetMinutes, notify_owner: true, notify_attendees: false },
    ].sort((a, b) => a.offset_minutes - b.offset_minutes));
  };

  const handleTogglePendingNotifyAttendees = (offsetMinutes: number) => {
    setPendingReminders(
      pendingReminders.map(r =>
        r.offset_minutes === offsetMinutes
          ? { ...r, notify_attendees: !r.notify_attendees }
          : r
      )
    );
  };

  const handleTogglePendingNotifyOwner = (offsetMinutes: number) => {
    setPendingReminders(
      pendingReminders.map(r =>
        r.offset_minutes === offsetMinutes
          ? { ...r, notify_owner: !r.notify_owner }
          : r
      )
    );
  };

  const handleRemovePendingReminder = (offsetMinutes: number) => {
    setPendingReminders(pendingReminders.filter(r => r.offset_minutes !== offsetMinutes));
  };


  const displayReminders = entityId ? reminders : pendingReminders.map((r, idx) => ({
    id: `pending-${idx}`,
    offset_minutes: r.offset_minutes,
    notify_owner: r.notify_owner,
    notify_attendees: r.notify_attendees,
  })) as Array<{ id: string; offset_minutes: number; notify_owner: boolean; notify_attendees: boolean }>;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Existing Reminders */}
      {displayReminders.length > 0 && (
        <div className="space-y-2">
          {displayReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-gray-900">
                {formatReminderOffset(reminder.offset_minutes)}
              </span>

              {/* Notify Owner Toggle */}
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={reminder.notify_owner}
                  onChange={() => {
                    if (entityId) {
                      handleToggleNotifyOwner(reminder.id, reminder.notify_owner);
                    } else {
                      handleTogglePendingNotifyOwner(reminder.offset_minutes);
                    }
                  }}
                  disabled={disabled}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Owner</span>
              </label>

              {/* Notify Attendees Toggle */}
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={reminder.notify_attendees}
                  onChange={() => {
                    if (entityId) {
                      handleToggleNotifyAttendees(reminder.id, reminder.notify_attendees);
                    } else {
                      handleTogglePendingNotifyAttendees(reminder.offset_minutes);
                    }
                  }}
                  disabled={disabled}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Attendees</span>
              </label>

              {!disabled && (
                <button
                  type="button"
                  onClick={() => {
                    if (entityId) {
                      handleRemoveReminder(reminder.id);
                    } else {
                      handleRemovePendingReminder(reminder.offset_minutes);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  aria-label="Remove reminder"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder Presets */}
      {!disabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Reminder
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REMINDER_PRESETS.map((preset) => {
              const exists = displayReminders.some(r => r.offset_minutes === preset.value);
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    if (entityId) {
                      handleAddReminder(preset.value);
                    } else {
                      handleAddPendingReminder(preset.value);
                    }
                  }}
                  disabled={exists}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                    exists
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!disabled && (
        <p className="text-xs text-gray-500">
          Reminders notify you (and optionally attendees) before events or tasks start. By default, only the owner receives reminders.
        </p>
      )}
    </div>
  );
}

