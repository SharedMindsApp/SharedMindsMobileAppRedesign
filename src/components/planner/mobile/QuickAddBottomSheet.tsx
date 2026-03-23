/**
 * QuickAddBottomSheet - Mobile quick add event bottom sheet
 * 
 * Opens when tapping a time slot on mobile.
 * Provides title input, quick duration buttons, and save action.
 * Keyboard-aware to prevent input/save button from being covered.
 */

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { createPersonalCalendarEvent } from '../../../lib/personalSpaces/calendarServiceOffline';
import { showToast } from '../../Toast';

export interface QuickAddBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  userId: string;
  date: Date;
  hour?: number;
  minute?: number;
}

export function QuickAddBottomSheet({
  isOpen,
  onClose,
  onEventCreated,
  userId,
  date,
  hour,
  minute,
}: QuickAddBottomSheetProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<30 | 60 | 120>(60); // minutes
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      // Small delay to ensure BottomSheet is fully rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDuration(60);
      setSaving(false);
    }
  }, [isOpen]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;

    setSaving(true);

    try {
      const startAt = new Date(date);
      
      // If hour/minute provided, use them; otherwise default to current time or 9 AM
      if (hour !== undefined && minute !== undefined) {
        startAt.setHours(hour, minute, 0, 0);
      } else {
        // Default to 9 AM if no time specified
        startAt.setHours(9, 0, 0, 0);
      }

      const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

      await createPersonalCalendarEvent(userId, {
        title: title.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        event_type: 'event',
      });

      // Show success feedback
      const isOnline = navigator.onLine;
      if (isOnline) {
        showToast('success', 'Event added');
      } else {
        showToast('info', 'Saved — will sync when online');
      }

      setTitle('');
      onEventCreated?.();
      onClose();
    } catch (err) {
      console.error('Error adding event:', err);
      showToast('error', 'Couldn\'t add event. It will retry when you\'re online.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate display time
  const displayTime = (() => {
    if (hour !== undefined && minute !== undefined) {
      const timeDate = new Date(date);
      timeDate.setHours(hour, minute, 0, 0);
      return formatTime(timeDate);
    }
    return null;
  })();

  const displayDate = formatDate(date);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Event"
      footer={
        <div className="pb-20">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px] flex items-center justify-center"
          >
            {saving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      }
      maxHeight="90vh"
    >
      <div className="space-y-4">
        {/* Date & Time Display */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock size={16} className="text-gray-500" />
            <div>
              <div className="font-medium">{displayDate}</div>
              {displayTime && (
                <div className="text-gray-600">at {displayTime}</div>
              )}
            </div>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Title
          </label>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && title.trim()) {
                handleSubmit();
              }
            }}
          />
        </div>

        {/* Quick Duration Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDuration(30)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                duration === 30
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 min
            </button>
            <button
              onClick={() => setDuration(60)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                duration === 60
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1 hour
            </button>
            <button
              onClick={() => setDuration(120)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                duration === 120
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              2 hours
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}


