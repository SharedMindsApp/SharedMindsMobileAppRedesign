/**
 * HabitPickerPanel Component
 * 
 * Shows suggested habits from a selected category.
 * Allows one-tap habit creation with gentle confirmation.
 * 
 * Design:
 * - Category title + description at top
 * - List of suggested habits (pill or card style)
 * - Each habit shows name, optional intent, and + Add action
 * - One-tap add (no modal)
 * - Gentle confirmation after adding
 */

import { useState } from 'react';
import { X, Plus, CheckCircle2, Sparkles, Calendar } from 'lucide-react';
import type { HabitCategory } from '../../../lib/habits/habitCategories';
import { createHabitActivity } from '../../../lib/habits/habitsService';

// Color mapping for Tailwind classes (must be explicit for JIT)
const COLOR_CLASSES: Record<string, {
  iconBg: string;
  icon: string;
  border: string;
  borderHover: string;
  button: string;
  buttonHover: string;
  buttonActive: string;
  ring: string;
  bg: string;
  bgLight: string;
}> = {
  amber: {
    iconBg: 'bg-amber-100',
    icon: 'text-amber-600',
    border: 'border-amber-200',
    borderHover: 'hover:border-amber-300',
    button: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    buttonActive: 'bg-amber-100 text-amber-700',
    ring: 'ring-amber-400',
    bg: 'bg-amber-50',
    bgLight: 'bg-amber-50/50',
  },
  indigo: {
    iconBg: 'bg-indigo-100',
    icon: 'text-indigo-600',
    border: 'border-indigo-200',
    borderHover: 'hover:border-indigo-300',
    button: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-700',
    buttonActive: 'bg-indigo-100 text-indigo-700',
    ring: 'ring-indigo-400',
    bg: 'bg-indigo-50',
    bgLight: 'bg-indigo-50/50',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    icon: 'text-emerald-600',
    border: 'border-emerald-200',
    borderHover: 'hover:border-emerald-300',
    button: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
    buttonActive: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-50',
    bgLight: 'bg-emerald-50/50',
  },
  purple: {
    iconBg: 'bg-purple-100',
    icon: 'text-purple-600',
    border: 'border-purple-200',
    borderHover: 'hover:border-purple-300',
    button: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
    buttonActive: 'bg-purple-100 text-purple-700',
    ring: 'ring-purple-400',
    bg: 'bg-purple-50',
    bgLight: 'bg-purple-50/50',
  },
  rose: {
    iconBg: 'bg-rose-100',
    icon: 'text-rose-600',
    border: 'border-rose-200',
    borderHover: 'hover:border-rose-300',
    button: 'bg-rose-600',
    buttonHover: 'hover:bg-rose-700',
    buttonActive: 'bg-rose-100 text-rose-700',
    ring: 'ring-rose-400',
    bg: 'bg-rose-50',
    bgLight: 'bg-rose-50/50',
  },
  slate: {
    iconBg: 'bg-slate-100',
    icon: 'text-slate-600',
    border: 'border-slate-200',
    borderHover: 'hover:border-slate-300',
    button: 'bg-slate-600',
    buttonHover: 'hover:bg-slate-700',
    buttonActive: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-400',
    bg: 'bg-slate-50',
    bgLight: 'bg-slate-50/50',
  },
  gray: {
    iconBg: 'bg-gray-100',
    icon: 'text-gray-600',
    border: 'border-gray-200',
    borderHover: 'hover:border-gray-300',
    button: 'bg-gray-600',
    buttonHover: 'hover:bg-gray-700',
    buttonActive: 'bg-gray-100 text-gray-700',
    ring: 'ring-gray-400',
    bg: 'bg-gray-50',
    bgLight: 'bg-gray-50/50',
  },
  green: {
    iconBg: 'bg-green-100',
    icon: 'text-green-600',
    border: 'border-green-200',
    borderHover: 'hover:border-green-300',
    button: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
    buttonActive: 'bg-green-100 text-green-700',
    ring: 'ring-green-400',
    bg: 'bg-green-50',
    bgLight: 'bg-green-50/50',
  },
};

interface HabitPickerPanelProps {
  category: HabitCategory;
  userId: string;
  onHabitCreated: () => void;
  onClose: () => void;
  compact?: boolean;
}

export function HabitPickerPanel({
  category,
  userId,
  onHabitCreated,
  onClose,
  compact = false,
}: HabitPickerPanelProps) {
  const [creating, setCreating] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const Icon = category.icon;

  const handleAddHabit = async (habitTitle: string, shouldSchedule: boolean = false) => {
    if (creating) return;

    setCreating(habitTitle);
    try {
      // Determine if this is a "break" habit (reduce/replace language)
      const isBreakHabit = category.type === 'break';
      
      // Determine default schedule based on category
      let defaultTimeOfDay: 'morning' | 'afternoon' | 'evening' | undefined;
      if (category.id === 'daily-foundations') {
        defaultTimeOfDay = 'morning';
      } else if (category.id === 'creativity-expression' || category.id === 'personal-growth') {
        defaultTimeOfDay = 'evening';
      }
      
      const result = await createHabitActivity(userId, {
        title: habitTitle,
        description: undefined,
        polarity: isBreakHabit ? 'break' : 'build',
        metric_type: 'boolean',
        startDate: new Date().toISOString(),
        repeatType: 'daily',
        autoGenerateTags: true,
      });
      
      // Optionally schedule if user wants (inline suggestion, not forced)
      if (shouldSchedule && defaultTimeOfDay && result.activityId) {
        try {
          const { scheduleHabit } = await import('../../../lib/habits/habitScheduleService');
          await scheduleHabit(userId, result.activityId, {
            frequency: 'daily',
            timeOfDay: defaultTimeOfDay,
            startDate: new Date().toISOString().split('T')[0],
          });
        } catch (err) {
          // Non-fatal - habit is created, scheduling can be done later
          console.warn('[HabitPickerPanel] Could not auto-schedule habit:', err);
        }
      }

      setJustCreated(habitTitle);
      onHabitCreated();

      // Clear confirmation after 2 seconds
      setTimeout(() => {
        setJustCreated(null);
      }, 2000);
    } catch (err) {
      console.error('[HabitPickerPanel] Error creating habit:', err);
      alert('Failed to create habit. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  const colors = COLOR_CLASSES[category.accentColor] || COLOR_CLASSES.gray;

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
              <Icon size={20} className={colors.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-medium text-gray-900 mb-1`}>
                {category.name}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                {category.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Suggested Habits List */}
      <div className="space-y-2.5">
        {category.suggestedHabits.map((habit, index) => {
          const isCreating = creating === habit.title;
          const wasJustCreated = justCreated === habit.title;

          return (
            <div
              key={index}
              className={`
                group
                p-4
                rounded-xl
                bg-white
                border ${colors.border}
                ${colors.borderHover}
                hover:shadow-sm
                transition-all duration-200
                animate-in fade-in slide-in-from-left-2
                ${wasJustCreated ? `ring-2 ring-offset-2 ${colors.ring} ${colors.bgLight}` : ''}
              `}
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {habit.title}
                  </h3>
                  {habit.intent && (
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">
                      {habit.intent}
                    </p>
                  )}
                  {habit.reason && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100">
                      <Sparkles size={10} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{habit.reason}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAddHabit(habit.title, false)}
                  disabled={isCreating || wasJustCreated}
                  className={`
                    flex-shrink-0
                    px-4 py-2
                    rounded-lg
                    font-medium text-sm
                    transition-all duration-200
                    flex items-center gap-2
                    ${
                      wasJustCreated
                        ? colors.buttonActive
                        : `${colors.button} text-white ${colors.buttonHover}`
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:scale-[0.98]
                  `}
                >
                  {wasJustCreated ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Added</span>
                    </>
                  ) : isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      {justCreated && (
        <div className={`mt-6 p-4 bg-gradient-to-r ${colors.bg} to-white rounded-xl border ${colors.border} animate-in fade-in slide-in-from-bottom-2`}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className={colors.icon} />
            <p className="text-sm font-medium text-gray-900">
              Habit added
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
            {/* Optional: Add to calendar (inline, secondary) */}
            {(() => {
              const defaultTimeOfDay = category.id === 'daily-foundations' ? 'morning' :
                                      category.id === 'creativity-expression' || category.id === 'personal-growth' ? 'evening' :
                                      undefined;
              return defaultTimeOfDay ? (
                <button
                  onClick={async () => {
                    try {
                      const { listHabits } = await import('../../../lib/habits/habitsService');
                      const { scheduleHabit } = await import('../../../lib/habits/habitScheduleService');
                      const habits = await listHabits(userId);
                      const newHabit = habits.find(h => h.title === justCreated);
                      if (newHabit) {
                        await scheduleHabit(userId, newHabit.id, {
                          frequency: 'daily',
                          timeOfDay: defaultTimeOfDay,
                          startDate: new Date().toISOString().split('T')[0],
                        });
                        onHabitCreated();
                      }
                      onClose();
                    } catch (err) {
                      console.error('[HabitPickerPanel] Error scheduling habit:', err);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <Calendar size={14} />
                  Add to calendar
                </button>
              ) : null;
            })()}
            <button
              onClick={() => setJustCreated(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Add another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
