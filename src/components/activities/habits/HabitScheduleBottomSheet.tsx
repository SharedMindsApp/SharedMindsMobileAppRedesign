/**
 * HabitScheduleBottomSheet Component
 * 
 * Lightweight bottom sheet for scheduling a habit on the calendar.
 * Allows users to choose frequency, time of day, and start date.
 * 
 * Design:
 * - No wizard, no forced steps
 * - One-tap save
 * - Advanced options hidden by default
 */

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { scheduleHabit, getHabitSchedule, unscheduleHabit, type HabitScheduleConfig, formatScheduleDisplay } from '../../../lib/habits/habitScheduleService';
import type { Activity } from '../../../lib/activities/activityTypes';

interface HabitScheduleBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Activity;
  userId: string;
  onScheduleUpdated: () => void;
}

export function HabitScheduleBottomSheet({
  isOpen,
  onClose,
  habit,
  userId,
  onScheduleUpdated,
}: HabitScheduleBottomSheetProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'exact'>('morning');
  const [exactTime, setExactTime] = useState('09:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingSchedule, setExistingSchedule] = useState<any>(null);

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
        setTimeOfDay(schedule.timeOfDay || 'morning');
        setExactTime(schedule.exactTime || '09:00');
        setStartDate(schedule.startDate);
        if (schedule.daysOfWeek) {
          setSelectedDays(schedule.daysOfWeek);
        }
      }
    } catch (error) {
      console.error('[HabitScheduleBottomSheet] Error loading schedule:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: HabitScheduleConfig = {
        frequency,
        timeOfDay: timeOfDay === 'exact' ? 'exact' : timeOfDay,
        exactTime: timeOfDay === 'exact' ? exactTime : undefined,
        daysOfWeek: frequency === 'weekly' ? selectedDays : undefined,
        startDate,
      };

      await scheduleHabit(userId, habit.id, config);
      onScheduleUpdated();
      onClose();
    } catch (error) {
      console.error('[HabitScheduleBottomSheet] Error saving schedule:', error);
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
      console.error('[HabitScheduleBottomSheet] Error removing schedule:', error);
      alert('Failed to remove schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Schedule Habit">
      <div className="p-6 space-y-6">
        {/* Habit Title */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{habit.title}</h3>
          <p className="text-sm text-gray-500">Add this habit to your calendar</p>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'custom'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`
                  px-4 py-2.5 rounded-lg border-2 transition-all
                  ${frequency === freq
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Time of Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
          <div className="grid grid-cols-4 gap-2">
            {(['morning', 'afternoon', 'evening', 'exact'] as const).map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className={`
                  px-3 py-2 rounded-lg border-2 transition-all text-sm
                  ${timeOfDay === time
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {time === 'exact' ? 'Exact' : time.charAt(0).toUpperCase() + time.slice(1)}
              </button>
            ))}
          </div>
          {timeOfDay === 'exact' && (
            <div className="mt-3">
              <input
                type="time"
                value={exactTime}
                onChange={(e) => setExactTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Days of Week (for weekly) */}
        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (selectedDays.includes(index)) {
                      setSelectedDays(selectedDays.filter(d => d !== index));
                    } else {
                      setSelectedDays([...selectedDays, index].sort());
                    }
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg border-2 transition-all text-sm
                    ${selectedDays.includes(index)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Existing Schedule Info */}
        {existingSchedule && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              Currently scheduled: <span className="font-medium">{formatScheduleDisplay(existingSchedule)}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {existingSchedule && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="px-4 py-2.5 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (frequency === 'weekly' && selectedDays.length === 0)}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
