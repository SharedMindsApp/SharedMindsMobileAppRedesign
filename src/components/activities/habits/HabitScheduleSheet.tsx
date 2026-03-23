/**
 * Habit Schedule Sheet Component
 * 
 * Calm, expressive scheduling UI for habits.
 * Allows users to define when a habit lives in their week.
 * 
 * Design Principles:
 * - Optional, not required
 * - Moment-based, not deadline-based
 * - Editable at any time
 * - No pressure language
 */

import { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, X, CheckCircle2, Sparkles } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { 
  scheduleHabit, 
  getHabitSchedule, 
  unscheduleHabit, 
  type HabitScheduleConfig,
  type HabitScheduleInfo 
} from '../../../lib/habits/habitScheduleService';
import type { Activity } from '../../../lib/activities/activityTypes';

interface HabitScheduleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Activity;
  userId: string;
  onScheduleUpdated: () => void;
  isMobile?: boolean;
}

export function HabitScheduleSheet({
  isOpen,
  onClose,
  habit,
  userId,
  onScheduleUpdated,
  isMobile = false,
}: HabitScheduleSheetProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [timeType, setTimeType] = useState<'window' | 'exact'>('window');
  const [timeWindow, setTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [exactTime, setExactTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0-6, Sunday = 0
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [existingSchedule, setExistingSchedule] = useState<HabitScheduleInfo | null>(null);

  // Day labels for display
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (isOpen) {
      loadExistingSchedule();
    }
  }, [isOpen, habit.id]);

  const loadExistingSchedule = async () => {
    try {
      const schedule = await getHabitSchedule(habit.id);
      if (schedule) {
        setExistingSchedule(schedule);
        setFrequency(schedule.frequency);
        setTimeType(schedule.timeOfDay === 'exact' ? 'exact' : 'window');
        if (schedule.timeOfDay && schedule.timeOfDay !== 'exact') {
          setTimeWindow(schedule.timeOfDay);
        }
        setExactTime(schedule.exactTime || '09:00');
        setStartDate(schedule.startDate);
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          setSelectedDays(schedule.daysOfWeek);
        } else if (schedule.frequency === 'daily') {
          // Daily means all days selected
          setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        }
      } else {
        // Reset to defaults
        setFrequency('daily');
        setTimeType('window');
        setTimeWindow('morning');
        setExactTime('09:00');
        setSelectedDays([]);
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('[HabitScheduleSheet] Error loading schedule:', error);
    }
  };

  // Generate preview text
  const previewText = useMemo(() => {
    if (frequency === 'daily') {
      if (timeType === 'exact') {
        return `This habit will appear: Every day at ${exactTime}`;
      } else {
        const windowText = timeWindow === 'morning' ? 'mornings' :
                          timeWindow === 'afternoon' ? 'afternoons' :
                          'evenings';
        return `This habit will appear: Every ${windowText}`;
      }
    } else if (frequency === 'weekly' || frequency === 'custom') {
      if (selectedDays.length === 0) {
        return 'Select days to see preview';
      }
      const days = selectedDays
        .sort((a, b) => a - b)
        .map(day => dayFullNames[day])
        .join(', ');
      
      if (timeType === 'exact') {
        return `This habit will appear: ${days} at ${exactTime}`;
      } else {
        const windowText = timeWindow === 'morning' ? 'morning' :
                          timeWindow === 'afternoon' ? 'afternoon' :
                          'evening';
        return `This habit will appear: ${days} ${windowText}`;
      }
    }
    return 'This habit will appear on your calendar';
  }, [frequency, timeType, timeWindow, exactTime, selectedDays]);

  const handleSave = async () => {
    // Validate: weekly/custom needs at least one day
    if ((frequency === 'weekly' || frequency === 'custom') && selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    setSaving(true);
    try {
      const config: HabitScheduleConfig = {
        frequency: frequency === 'custom' ? 'weekly' : frequency, // Custom is just weekly with specific days
        timeOfDay: timeType === 'exact' ? 'exact' : timeWindow,
        exactTime: timeType === 'exact' ? exactTime : undefined,
        daysOfWeek: (frequency === 'weekly' || frequency === 'custom') ? selectedDays : undefined,
        startDate,
      };

      await scheduleHabit(userId, habit.id, config);
      onScheduleUpdated();
      onClose();
    } catch (error) {
      console.error('[HabitScheduleSheet] Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove this habit from your calendar? The habit will remain, but it won\'t appear on your calendar.')) {
      return;
    }

    setSaving(true);
    try {
      await unscheduleHabit(userId, habit.id);
      onScheduleUpdated();
      onClose();
    } catch (error) {
      console.error('[HabitScheduleSheet] Error removing schedule:', error);
      alert('Failed to remove schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  // When frequency changes, update selected days
  useEffect(() => {
    if (frequency === 'daily') {
      // Daily means all days
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (frequency === 'weekly' && selectedDays.length === 0) {
      // Default to weekdays for weekly
      setSelectedDays([1, 2, 3, 4, 5]);
    }
  }, [frequency]);

  return (
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Schedule Habit"
      maxHeight="90vh"
    >
      <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
        {/* Habit Title */}
        <div>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-1`}>
            {habit.title}
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
            Add this habit to your calendar
          </p>
        </div>

        {/* Frequency Selector */}
        <div>
          <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-2`}>
            Frequency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'custom'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`
                  ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
                  rounded-lg border-2 transition-all font-medium
                  ${frequency === freq
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {freq === 'custom' ? 'Custom' : freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selection (Weekly / Custom) */}
        {(frequency === 'weekly' || frequency === 'custom') && (
          <div>
            <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-2`}>
              Days
            </label>
            <div className="flex gap-1.5">
              {dayLabels.map((label, index) => (
                <button
                  key={index}
                  onClick={() => toggleDay(index)}
                  className={`
                    flex-1
                    ${isMobile ? 'h-9 text-xs' : 'h-10 text-sm'}
                    rounded-lg border-2 transition-all font-medium
                    ${selectedDays.includes(index)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time Type Selector */}
        <div>
          <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-2`}>
            Time
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setTimeType('window')}
              className={`
                ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
                rounded-lg border-2 transition-all font-medium
                ${timeType === 'window'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Flexible
            </button>
            <button
              onClick={() => setTimeType('exact')}
              className={`
                ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
                rounded-lg border-2 transition-all font-medium
                ${timeType === 'exact'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Exact Time
            </button>
          </div>

          {/* Time Window (Flexible) */}
          {timeType === 'window' && (
            <div className="grid grid-cols-3 gap-2">
              {(['morning', 'afternoon', 'evening'] as const).map((window) => (
                <button
                  key={window}
                  onClick={() => setTimeWindow(window)}
                  className={`
                    ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
                    rounded-lg border-2 transition-all font-medium
                    ${timeWindow === window
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {window.charAt(0).toUpperCase() + window.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Exact Time */}
          {timeType === 'exact' && (
            <div>
              <input
                type="time"
                value={exactTime}
                onChange={(e) => setExactTime(e.target.value)}
                className={`
                  w-full 
                  ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-base'}
                  border border-gray-300 rounded-lg 
                  focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                `}
              />
            </div>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-2`}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={`
              w-full 
              ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-base'}
              border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            `}
          />
        </div>

        {/* Preview Line (Critical) */}
        <div className={`
          ${isMobile ? 'p-3' : 'p-4'}
          bg-gradient-to-r from-indigo-50 to-purple-50
          border border-indigo-200
          rounded-xl
        `}>
          <div className="flex items-start gap-2">
            <Sparkles size={isMobile ? 14 : 16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 leading-relaxed`}>
              {previewText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className={`
              flex-1 
              ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
              border border-gray-300 rounded-lg 
              text-gray-700 hover:bg-gray-50 
              transition-colors font-medium
            `}
          >
            Cancel
          </button>
          {existingSchedule && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className={`
                ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
                border border-gray-300 rounded-lg 
                text-gray-600 hover:bg-gray-50 
                transition-colors disabled:opacity-50 font-medium
              `}
            >
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || ((frequency === 'weekly' || frequency === 'custom') && selectedDays.length === 0)}
            className={`
              flex-1 
              ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
              bg-indigo-600 text-white rounded-lg 
              hover:bg-indigo-700 
              transition-colors 
              disabled:opacity-50 disabled:cursor-not-allowed 
              flex items-center justify-center gap-2 font-medium
            `}
          >
            {saving ? (
              <>
                <div className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} border-2 border-white border-t-transparent rounded-full animate-spin`} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={isMobile ? 14 : 18} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
