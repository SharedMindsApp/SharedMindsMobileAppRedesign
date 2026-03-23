/**
 * Habit Check-in Sheet
 * 
 * Premium check-in UI supporting all habit metric types:
 * - boolean (done/missed/skipped)
 * - numeric (count/minutes) with stepper
 * - rating (slider 1-10)
 * - custom (uses metadata.schema)
 * 
 * Opens as bottom sheet (mobile) or modal (desktop)
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, MessageSquare, RotateCcw, CheckCircle2, XCircle, Minus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { upsertHabitCheckin, getHabitCheckinsForRange, type HabitCheckin } from '../../../lib/habits/habitsService';
import type { Activity } from '../../../lib/activities/activityTypes';
import { emitActivityChanged } from '../../../lib/activities/activityEvents';

export interface HabitCheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Activity;
  userId: string;
  initialDate?: string; // YYYY-MM-DD, defaults to today
  onCheckinComplete?: () => void;
}

export function HabitCheckinSheet({
  isOpen,
  onClose,
  habit,
  userId,
  initialDate,
  onCheckinComplete,
}: HabitCheckinSheetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return initialDate || new Date().toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'done' | 'missed' | 'skipped'>('done');
  const [valueNumeric, setValueNumeric] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<HabitCheckin | null>(null);
  const [previousCheckin, setPreviousCheckin] = useState<HabitCheckin | null>(null);
  const [weekCheckins, setWeekCheckins] = useState<HabitCheckin[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const metricType = habit.metadata?.metric_type || 'boolean';
  const targetValue = habit.metadata?.target_value;
  const metricUnit = habit.metadata?.metric_unit;
  const direction = habit.metadata?.direction || 'at_least';

  // Calculate week range (Monday to Sunday) for selectedDate
  const weekRange = useMemo(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }, [selectedDate]);

  // Load week check-ins
  useEffect(() => {
    if (!isOpen) return;

    const loadWeekCheckins = async () => {
      try {
        const checkins = await getHabitCheckinsForRange(
          userId,
          habit.id,
          weekRange.start,
          weekRange.end
        );
        setWeekCheckins(checkins);
      } catch (err) {
        console.error('[HabitCheckinSheet] Error loading week check-ins:', err);
      }
    };

    loadWeekCheckins();
  }, [isOpen, weekRange.start, weekRange.end, habit.id, userId]);

  // Prevent stale values from leaking when status changes away from 'done'
  // This ensures UI state can never violate the database constraint
  // When user switches to 'missed' or 'skipped', clear all value state
  useEffect(() => {
    if (status === 'missed' || status === 'skipped') {
      setValueNumeric(null);
      setRating(5); // Reset rating to default (will be ignored by service for missed/skipped)
      // Note: valueBoolean is not used as state, but service will handle it correctly
    }
  }, [status]);

  // Load existing check-in for selected date
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    const loadCheckin = async () => {
      try {
        const checkins = await getHabitCheckinsForRange(
          userId,
          habit.id,
          selectedDate,
          selectedDate
        );
        const checkin = checkins[0] || null;
        setExistingCheckin(checkin);

        if (checkin) {
          setStatus(checkin.status as 'done' | 'missed' | 'skipped');
          // Only load values if status is 'done' (constraint requires NULL for missed/skipped)
          if (checkin.status === 'done') {
            setValueNumeric(checkin.value_numeric || null);
            if (checkin.value_numeric && metricType === 'rating') {
              setRating(checkin.value_numeric);
            }
          } else {
            // Explicitly reset values for missed/skipped
            setValueNumeric(null);
            setRating(5);
          }
          setNotes(checkin.notes || '');
        } else {
          // Reset to defaults
          setStatus('done');
          setValueNumeric(null);
          setRating(5);
          setNotes('');
        }

        // Load previous check-in for undo
        if (selectedDate) {
          const prevDate = new Date(selectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          const prevCheckins = await getHabitCheckinsForRange(
            userId,
            habit.id,
            prevDateStr,
            prevDateStr
          );
          setPreviousCheckin(prevCheckins[0] || null);
        }
      } catch (err) {
        console.error('[HabitCheckinSheet] Error loading check-in:', err);
      }
    };

    loadCheckin();
  }, [isOpen, selectedDate, habit.id, userId, metricType]);

  // Date range for picker (last 30 days)
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 30);
  const maxDate = today;
  const todayStr = today.toISOString().split('T')[0];

  // Get day name for selected date
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[date.getDay()];
  };

  // Get status for a specific date
  const getStatusForDate = (dateStr: string): 'done' | 'missed' | 'skipped' | null => {
    const checkin = weekCheckins.find(c => c.local_date === dateStr);
    return checkin ? (checkin.status as 'done' | 'missed' | 'skipped') : null;
  };

  // Build week days array (Monday to Sunday)
  const weekDays = useMemo(() => {
    const days: Array<{ date: string; label: string; isToday: boolean }> = [];
    const monday = new Date(weekRange.start);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      days.push({
        date: dateStr,
        label: dayLabels[i],
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [weekRange.start, todayStr]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build payload with explicit null values (no undefined)
      // Database constraint requires explicit nulls, not undefined
      const payload: {
        status: 'done' | 'missed' | 'skipped';
        value_numeric: number | null;
        value_boolean: boolean | null;
        notes?: string;
      } = {
        status,
        value_numeric: null,
        value_boolean: null,
        notes: notes.trim() || undefined,
      };

      // Status handling (MANDATORY)
      // For 'missed' or 'skipped', both values must be explicitly NULL
      if (status !== 'done') {
        payload.value_numeric = null;
        payload.value_boolean = null;
      } else {
        // Done state rules - exactly one value must be NON-NULL
        if (metricType === 'boolean') {
          payload.value_boolean = true;
          payload.value_numeric = null;
        } else if (metricType === 'rating') {
          payload.value_numeric = rating;
          payload.value_boolean = null;
        } else if (
          metricType === 'count' ||
          metricType === 'minutes' ||
          metricType === 'custom' ||
          metricType === 'limit' ||
          metricType === 'duration'
        ) {
          if (valueNumeric === null) {
            // For limit habits, if no value set, use target value as default
            if (metricType === 'limit' && targetValue !== undefined) {
              payload.value_numeric = targetValue;
            } else {
              throw new Error('Numeric habit requires a value when marked done');
            }
          } else {
            payload.value_numeric = valueNumeric;
          }
          payload.value_boolean = null;
        } else {
          // Unknown metric type - default to boolean for safety
          payload.value_boolean = true;
          payload.value_numeric = null;
        }
      }

      // Defensive assertion: catch regressions before they hit Supabase
      if (
        status !== 'done' &&
        (payload.value_numeric !== null || payload.value_boolean !== null)
      ) {
        throw new Error('Invalid check-in payload: values must be null for non-done status');
      }

      if (
        status === 'done' &&
        payload.value_numeric === null &&
        payload.value_boolean === null
      ) {
        throw new Error('Invalid check-in payload: done status requires exactly one non-null value');
      }

      console.log('[DEBUG habit_checkin payload]', payload);

      await upsertHabitCheckin(userId, habit.id, selectedDate, payload);
      
      emitActivityChanged(habit.id);
      onCheckinComplete?.();
      onClose();
    } catch (err) {
      console.error('[HabitCheckinSheet] Error saving check-in:', err);
      alert('Failed to save check-in');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!previousCheckin) return;

    setSaving(true);
    try {
      // Restore previous check-in state with explicit null values
      // Database constraint requires explicit nulls, not undefined
      const prevStatus = previousCheckin.status as 'done' | 'missed' | 'skipped';
      
      const payload: {
        status: 'done' | 'missed' | 'skipped';
        value_numeric: number | null;
        value_boolean: boolean | null;
        notes?: string;
      } = {
        status: prevStatus,
        value_numeric: null,
        value_boolean: null,
        notes: previousCheckin.notes || undefined,
      };

      // Only set values if status is 'done' (constraint requires both NULL for missed/skipped)
      if (prevStatus === 'done') {
        // Preserve 0 and false values from previous check-in
        if (previousCheckin.value_numeric !== null && previousCheckin.value_numeric !== undefined) {
          payload.value_numeric = previousCheckin.value_numeric;
        }
        if (previousCheckin.value_boolean !== null && previousCheckin.value_boolean !== undefined) {
          payload.value_boolean = previousCheckin.value_boolean;
        }
      }
      // For 'missed' or 'skipped', both values remain null (explicitly set above)

      console.log('[DEBUG habit_checkin payload (undo)]', payload);

      await upsertHabitCheckin(userId, habit.id, selectedDate, payload);

      emitActivityChanged(habit.id);
      onCheckinComplete?.();
      onClose();
    } catch (err) {
      console.error('[HabitCheckinSheet] Error undoing check-in:', err);
      alert('Failed to undo check-in');
    } finally {
      setSaving(false);
    }
  };

  // Get helper text for numeric metrics
  const getNumericHelperText = () => {
    if (valueNumeric === null || valueNumeric === undefined) return null;
    if (targetValue) {
      if (direction === 'at_least') {
        if (valueNumeric >= targetValue) return 'Target met';
        return `Still counts`;
      }
    }
    return 'Still counts';
  };

  if (!isOpen) return null;

  const isMobile = window.innerWidth < 768;
  const selectedDayName = selectedDate === todayStr ? 'Today' : getDayName(selectedDate);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet/Modal */}
      <div
        className={`relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto ${
          isMobile ? 'animate-slide-up' : 'animate-fade-in'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{habit.title}</h2>
            <p className="text-sm text-gray-500 mt-1">Check in</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Weekly Visual Status Row */}
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              {weekDays.map((day) => {
                const dayStatus = getStatusForDate(day.date);
                const isSelected = day.date === selectedDate;
                
                let icon = null;
                let bgClass = 'bg-transparent';
                let borderClass = 'border-gray-200';
                let textClass = 'text-gray-400';
                
                if (dayStatus === 'done') {
                  icon = <Check size={12} className="text-gray-600" />;
                  bgClass = 'bg-gray-100';
                  borderClass = 'border-gray-300';
                  textClass = 'text-gray-700';
                } else if (dayStatus === 'missed') {
                  icon = <X size={12} className="text-gray-400" />;
                  bgClass = 'bg-gray-50';
                  borderClass = 'border-gray-200';
                  textClass = 'text-gray-500';
                } else if (dayStatus === 'skipped') {
                  icon = <Minus size={12} className="text-gray-300" />;
                  bgClass = 'bg-gray-50';
                  borderClass = 'border-gray-200';
                  textClass = 'text-gray-400';
                }
                
                return (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setShowDatePicker(false);
                    }}
                    className={`
                      flex-1 flex flex-col items-center justify-center gap-1
                      p-2 rounded-md border transition-all
                      ${bgClass} ${borderClass} ${textClass}
                      ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      ${day.isToday ? 'ring-1 ring-gray-300' : ''}
                      hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                    `}
                    aria-label={`${day.label}, ${day.isToday ? 'today' : ''}${dayStatus ? `: ${dayStatus}` : ''}`}
                  >
                    <span className="text-[10px] font-medium">{day.label}</span>
                    <div className="w-6 h-6 flex items-center justify-center">
                      {icon}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Display / Picker */}
          <div>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span>Viewing: {selectedDayName}</span>
              </div>
              {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showDatePicker && (
              <div className="mt-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                  min={minDate.toISOString().split('T')[0]}
                  max={maxDate.toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Status Selection (for boolean habits) - Softened */}
          {metricType === 'boolean' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How did it go?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setStatus('done')}
                  className={`p-4 rounded-lg transition-all ${
                    status === 'done'
                      ? 'bg-blue-50 border-2 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <CheckCircle2 size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Done</div>
                </button>
                <button
                  onClick={() => setStatus('missed')}
                  className={`p-4 rounded-lg transition-all ${
                    status === 'missed'
                      ? 'bg-gray-100 border-2 border-gray-300 text-gray-700'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <XCircle size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Missed</div>
                </button>
                <button
                  onClick={() => setStatus('skipped')}
                  className={`p-4 rounded-lg transition-all ${
                    status === 'skipped'
                      ? 'bg-gray-100 border-2 border-gray-300 text-gray-700'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Minus size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Skip</div>
                </button>
              </div>
            </div>
          )}

          {/* Numeric Input (count/minutes/custom) */}
          {(metricType === 'count' || metricType === 'minutes' || metricType === 'custom') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {metricUnit || 'Value'} {targetValue && `(target: ${targetValue})`}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setValueNumeric(Math.max(0, (valueNumeric || 0) - 1))}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  aria-label="Decrease value"
                >
                  −
                </button>
                <input
                  type="number"
                  value={valueNumeric || 0}
                  onChange={(e) => setValueNumeric(parseFloat(e.target.value) || 0)}
                  min="0"
                  step={metricType === 'minutes' ? 1 : 1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-semibold"
                />
                <button
                  onClick={() => setValueNumeric((valueNumeric || 0) + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  aria-label="Increase value"
                >
                  +
                </button>
              </div>
              {getNumericHelperText() && (
                <div className="mt-2 text-sm text-gray-500">
                  {getNumericHelperText()}
                </div>
              )}
            </div>
          )}

          {/* Rating Slider */}
          {metricType === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating: {rating}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          )}

          {/* Notes - Collapsed by Default */}
          <div>
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageSquare size={16} />
                <span>Add a reflection (optional)</span>
              </button>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare size={16} className="inline mr-2" />
                  Reflection
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="How did this feel today?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}
          </div>

          {/* Undo Button - Inline, Small */}
          {previousCheckin && (
            <div className="flex justify-end">
              <button
                onClick={handleUndo}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>Undo yesterday's check-in</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              saving ||
              (status === 'done' &&
                metricType !== 'boolean' &&
                metricType !== 'rating' &&
                metricType !== 'limit' &&
                valueNumeric === null)
            }
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[52px]"
            aria-label={`${existingCheckin ? 'Update' : 'Log for today'} check-in for ${selectedDayName}`}
          >
            {saving ? 'Saving...' : existingCheckin ? 'Update check-in' : 'Log for today'}
          </button>
        </div>
      </div>
    </div>
  );
}
