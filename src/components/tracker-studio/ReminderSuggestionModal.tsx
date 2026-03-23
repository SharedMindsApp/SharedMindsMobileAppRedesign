/**
 * Reminder Suggestion Modal
 * 
 * Shows after saving a tracker entry if no reminders are set up.
 * Offers quick options to create reminders (1h, 3h, 12h, 24h from now).
 */

import { useState } from 'react';
import { Clock, X, Bell, CheckCircle2 } from 'lucide-react';
import { createTrackerReminder } from '../../lib/trackerStudio/trackerReminderService';
import type { Tracker } from '../../lib/trackerStudio/types';

interface ReminderSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker;
  onReminderCreated?: () => void;
}

export function ReminderSuggestionModal({
  isOpen,
  onClose,
  tracker,
  onReminderCreated,
}: ReminderSuggestionModalProps) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateReminder = async (hours: number) => {
    try {
      setCreating(true);
      setError(null);

      // Calculate target time (hours from now)
      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() + hours);
      
      // Format as HH:MM
      const hoursStr = String(targetTime.getHours()).padStart(2, '0');
      const minutesStr = String(targetTime.getMinutes()).padStart(2, '0');
      const timeOfDay = `${hoursStr}:${minutesStr}`;

      // Determine which day(s) - if it's tomorrow, use that day, otherwise daily
      const now = new Date();
      const isTomorrow = targetTime.getDate() !== now.getDate();
      const days = isTomorrow 
        ? [targetTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]
        : ['daily'];

      // Create reminder
      await createTrackerReminder({
        tracker_id: tracker.id,
        reminder_kind: 'entry_prompt',
        schedule: {
          time_of_day: timeOfDay,
          days: days,
        },
        delivery_channels: ['in_app'],
        is_active: true,
      });

      setCreated(true);
      setTimeout(() => {
        onReminderCreated?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
      console.error('Failed to create reminder:', err);
    } finally {
      setCreating(false);
    }
  };

  const formatTimeFromNow = (hours: number): string => {
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + hours);
    
    const isTomorrow = targetTime.getDate() !== new Date().getDate();
    const timeStr = targetTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return isTomorrow 
      ? `Tomorrow at ${timeStr}`
      : `Today at ${timeStr}`;
  };

  const quickOptions = [
    { hours: 1, label: '1 hour', shortLabel: '1h' },
    { hours: 3, label: '3 hours', shortLabel: '3h' },
    { hours: 12, label: '12 hours', shortLabel: '12h' },
    { hours: 24, label: '24 hours', shortLabel: '24h' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Set a Reminder?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Get reminded to log another entry for <span className="font-medium">{tracker.name}</span>
              </p>
            </div>
          </div>
          {!created && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {created ? (
          /* Success State */
          <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">Reminder created successfully!</p>
          </div>
        ) : (
          <>
            {/* Quick Options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Remind me in:</p>
              <div className="grid grid-cols-2 gap-3">
                {quickOptions.map((option) => (
                  <button
                    key={option.hours}
                    onClick={() => handleCreateReminder(option.hours)}
                    disabled={creating}
                    className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="h-5 w-5 text-gray-600" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatTimeFromNow(option.hours)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Skip Button */}
            <button
              onClick={onClose}
              disabled={creating}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
