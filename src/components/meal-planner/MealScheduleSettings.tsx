/**
 * Meal Schedule Settings Component
 * 
 * Allows users to configure their meal schedules, including:
 * - Custom meal slots
 * - Fasting periods
 * - Different schedules per day
 * - Preset schedules (Standard, Intermittent Fasting, Ramadan, etc.)
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit, Save, Clock, Moon, UtensilsCrossed, Check, AlertTriangle, Calendar } from 'lucide-react';
import { useMealSchedule } from '../../hooks/useMealSchedule';
import {
  getMealSchedulesForSpace,
  createMealSchedule,
  updateMealSchedule,
  deleteMealSchedule,
  setDefaultMealSchedule,
  checkScheduleConflicts,
} from '../../lib/mealScheduleService';
import {
  type MealSchedule,
  type DailyMealSchedule,
  type MealSlot,
  MEAL_SCHEDULE_PRESETS,
  getDefaultMealSchedule,
  isScheduleActive,
} from '../../lib/mealScheduleTypes';
import { showToast } from '../Toast';
import { ConfirmDialog } from '../ConfirmDialog';

interface MealScheduleSettingsProps {
  spaceId: string;
  onClose: () => void;
  embedded?: boolean; // If true, render without modal wrapper
}

export function MealScheduleSettings({ spaceId, onClose, embedded = false }: MealScheduleSettingsProps) {
  const { schedule: currentSchedule, refresh } = useMealSchedule(spaceId);
  const [schedules, setSchedules] = useState<MealSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<MealSchedule | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<{ hasConflict: boolean; conflictingSchedules: MealSchedule[] } | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<MealSchedule | null>(null);

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadSchedules();
  }, [spaceId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const allSchedules = await getMealSchedulesForSpace(spaceId);
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      showToast('error', 'Failed to load meal schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromPreset = async (preset: typeof MEAL_SCHEDULE_PRESETS[0]) => {
    try {
      await createMealSchedule(spaceId, preset.name, preset.schedules, {
        isDefault: preset.is_default,
        isActive: true,
      });
      await loadSchedules();
      await refresh();
      showToast('success', `Created "${preset.name}" schedule`);
      setShowPresets(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      showToast('error', 'Failed to create schedule');
    }
  };

  const handleCreateNewSchedule = async (name: string, isActive: boolean, startDate: string | null, endDate: string | null) => {
    try {
      // Check for conflicts
      const conflictCheck = await checkScheduleConflicts(spaceId, null, startDate, endDate, isActive);
      if (conflictCheck.hasConflict) {
        setConflictWarning(conflictCheck);
        const proceed = confirm(
          `Warning: This schedule conflicts with ${conflictCheck.conflictingSchedules.length} other active schedule(s). Do you want to continue?`
        );
        if (!proceed) {
          return;
        }
      }

      const defaultSchedule = getDefaultMealSchedule();
      await createMealSchedule(spaceId, name, defaultSchedule.schedules, {
        isDefault: false,
        isActive,
        startDate,
        endDate,
      });
      await loadSchedules();
      await refresh();
      showToast('success', `Created "${name}" schedule`);
      setShowCreateForm(false);
      setConflictWarning(null);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      showToast('error', 'Failed to create schedule');
    }
  };

  const handleSetDefault = async (scheduleId: string) => {
    try {
      await setDefaultMealSchedule(scheduleId);
      await loadSchedules();
      await refresh();
      showToast('success', 'Default schedule updated');
    } catch (error) {
      console.error('Failed to set default schedule:', error);
      showToast('error', 'Failed to update default schedule');
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      setScheduleToDelete(schedule);
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      await deleteMealSchedule(scheduleToDelete.id);
      await loadSchedules();
      await refresh();
      showToast('success', `"${scheduleToDelete.name}" schedule deleted`);
      setScheduleToDelete(null);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      showToast('error', 'Failed to delete schedule');
    }
  };

  const handleEditSchedule = (schedule: MealSchedule) => {
    setEditingSchedule(schedule);
    setSelectedDay(null);
  };

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return;

    try {
      // Check for conflicts if schedule is active
      if (editingSchedule.is_active) {
        const conflictCheck = await checkScheduleConflicts(
          spaceId,
          editingSchedule.id,
          editingSchedule.start_date || null,
          editingSchedule.end_date || null,
          editingSchedule.is_active
        );
        if (conflictCheck.hasConflict) {
          const proceed = confirm(
            `Warning: This schedule conflicts with ${conflictCheck.conflictingSchedules.length} other active schedule(s). Do you want to continue?`
          );
          if (!proceed) {
            return;
          }
        }
      }

      await updateMealSchedule(editingSchedule.id, {
        name: editingSchedule.name,
        schedules: editingSchedule.schedules,
        is_default: editingSchedule.is_default,
        is_active: editingSchedule.is_active,
        start_date: editingSchedule.start_date || null,
        end_date: editingSchedule.end_date || null,
      });
      await loadSchedules();
      await refresh();
      setEditingSchedule(null);
      setConflictWarning(null);
      showToast('success', 'Schedule updated');
    } catch (error) {
      console.error('Failed to update schedule:', error);
      showToast('error', 'Failed to update schedule');
    }
  };

  const handleAddSlot = (dayOfWeek: number) => {
    if (!editingSchedule) return;

    const newSlot: MealSlot = {
      id: `slot-${Date.now()}`,
      label: 'New Meal',
      type: 'meal',
      default: false,
      order: editingSchedule.schedules[dayOfWeek]?.slots.length || 0,
    };

    const updatedSchedules = [...editingSchedule.schedules];
    if (!updatedSchedules[dayOfWeek]) {
      updatedSchedules[dayOfWeek] = {
        dayOfWeek,
        slots: [],
        enabled: true,
      };
    }
    updatedSchedules[dayOfWeek].slots.push(newSlot);

    setEditingSchedule({
      ...editingSchedule,
      schedules: updatedSchedules,
    });
  };

  const handleRemoveSlot = (dayOfWeek: number, slotId: string) => {
    if (!editingSchedule) return;

    const updatedSchedules = [...editingSchedule.schedules];
    if (updatedSchedules[dayOfWeek]) {
      updatedSchedules[dayOfWeek].slots = updatedSchedules[dayOfWeek].slots.filter(
        s => s.id !== slotId
      );
    }

    setEditingSchedule({
      ...editingSchedule,
      schedules: updatedSchedules,
    });
  };

  const handleUpdateSlot = (dayOfWeek: number, slotId: string, updates: Partial<MealSlot>) => {
    if (!editingSchedule) return;

    const updatedSchedules = [...editingSchedule.schedules];
    if (updatedSchedules[dayOfWeek]) {
      const slotIndex = updatedSchedules[dayOfWeek].slots.findIndex(s => s.id === slotId);
      if (slotIndex !== -1) {
        updatedSchedules[dayOfWeek].slots[slotIndex] = {
          ...updatedSchedules[dayOfWeek].slots[slotIndex],
          ...updates,
        };
      }
    }

    setEditingSchedule({
      ...editingSchedule,
      schedules: updatedSchedules,
    });
  };

  const content = (
    <>
      {!embedded && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Meal Schedule Settings</h2>
            <p className="text-orange-100 text-xs sm:text-sm mt-0.5 sm:mt-1 hidden sm:block">
              Configure when and what meals you eat
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 active:bg-white/30 rounded-lg p-2 transition-colors touch-manipulation flex-shrink-0"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${embedded ? 'p-0' : 'p-4 sm:p-6'}`}>
          {editingSchedule ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Edit Schedule Header */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Schedule</h3>
                    <p className="text-sm text-gray-600 mt-1">{editingSchedule.name}</p>
                  </div>
                  <div className="flex items-stretch sm:items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSchedule(null);
                        setConflictWarning(null);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm sm:text-base font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSchedule}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
                    >
                      <Save size={18} />
                      Save
                    </button>
                  </div>
                </div>

                {/* Schedule Status and Dates */}
                <div className="bg-white rounded-lg p-4 border-2 border-gray-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer touch-manipulation">
                      <input
                        type="checkbox"
                        checked={editingSchedule.is_active}
                        onChange={(e) => {
                          setEditingSchedule({
                            ...editingSchedule,
                            is_active: e.target.checked,
                          });
                          setConflictWarning(null);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="select-none">Active Schedule</span>
                    </label>
                    {!isScheduleActive(editingSchedule) && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Start Date (optional)
                      </label>
                      <input
                        type="date"
                        value={editingSchedule.start_date || ''}
                        onChange={(e) => {
                          setEditingSchedule({
                            ...editingSchedule,
                            start_date: e.target.value || null,
                          });
                          setConflictWarning(null);
                        }}
                        className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={editingSchedule.end_date || ''}
                        onChange={(e) => {
                          setEditingSchedule({
                            ...editingSchedule,
                            end_date: e.target.value || null,
                          });
                          setConflictWarning(null);
                        }}
                        min={editingSchedule.start_date || undefined}
                        className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                      />
                    </div>
                  </div>

                  {conflictWarning?.hasConflict && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Schedule Conflict Detected
                        </p>
                        <p className="text-xs text-yellow-700">
                          This schedule overlaps with: {conflictWarning.conflictingSchedules.map(s => s.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Day Selector - Horizontal scroll on mobile */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 sm:pb-0">
                <div className="flex sm:grid sm:grid-cols-7 gap-2 min-w-max sm:min-w-0">
                  {DAYS.map((day, index) => {
                    const daySchedule = editingSchedule.schedules[index];
                    const isEnabled = daySchedule?.enabled !== false;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                        className={`min-w-[60px] sm:min-w-0 p-3 sm:p-3 rounded-lg border-2 transition-all touch-manipulation ${
                          selectedDay === index
                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : isEnabled
                            ? 'border-gray-200 bg-white hover:border-gray-300 active:border-orange-300'
                            : 'border-gray-200 bg-gray-50 opacity-50'
                        }`}
                      >
                        <div className="text-xs sm:text-xs font-semibold text-gray-700 text-center">{day.slice(0, 3)}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">
                          {daySchedule?.slots.length || 0} slots
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Editor */}
              {selectedDay !== null && (
                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                      {DAYS[selectedDay]} Schedule
                    </h4>
                    <div className="flex items-center gap-3 sm:gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer touch-manipulation">
                        <input
                          type="checkbox"
                          checked={editingSchedule.schedules[selectedDay]?.enabled !== false}
                          onChange={(e) => {
                            const updatedSchedules = [...editingSchedule.schedules];
                            if (!updatedSchedules[selectedDay]) {
                              updatedSchedules[selectedDay] = {
                                dayOfWeek: selectedDay,
                                slots: [],
                                enabled: true,
                              };
                            }
                            updatedSchedules[selectedDay].enabled = e.target.checked;
                            setEditingSchedule({
                              ...editingSchedule,
                              schedules: updatedSchedules,
                            });
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="select-none">Enabled</span>
                      </label>
                      <button
                        onClick={() => handleAddSlot(selectedDay)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors flex items-center gap-2 text-sm font-medium touch-manipulation"
                      >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add Slot</span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {editingSchedule.schedules[selectedDay]?.slots
                      .sort((a, b) => a.order - b.order)
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-white rounded-lg p-4 sm:p-5 border-2 border-gray-200"
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                  Label
                                </label>
                                <input
                                  type="text"
                                  value={slot.label}
                                  onChange={(e) =>
                                    handleUpdateSlot(selectedDay, slot.id, { label: e.target.value })
                                  }
                                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                                  placeholder="e.g. Breakfast, Iftar, Fasting"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Type
                                  </label>
                                  <select
                                    value={slot.type}
                                    onChange={(e) =>
                                      handleUpdateSlot(selectedDay, slot.id, {
                                        type: e.target.value as 'meal' | 'fast',
                                      })
                                    }
                                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white touch-manipulation"
                                  >
                                    <option value="meal">Meal</option>
                                    <option value="fast">Fast</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Meal Type Mapping
                                  </label>
                                  <select
                                    value={slot.mealTypeMapping || ''}
                                    onChange={(e) =>
                                      handleUpdateSlot(selectedDay, slot.id, {
                                        mealTypeMapping: e.target.value
                                          ? (e.target.value as any)
                                          : undefined,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white touch-manipulation"
                                  >
                                    <option value="">None</option>
                                    <option value="breakfast">Breakfast</option>
                                    <option value="lunch">Lunch</option>
                                    <option value="dinner">Dinner</option>
                                    <option value="snack">Snack</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Start Time (optional)
                                  </label>
                                  <input
                                    type="time"
                                    value={slot.startTime || ''}
                                    onChange={(e) =>
                                      handleUpdateSlot(selectedDay, slot.id, {
                                        startTime: e.target.value || undefined,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    End Time (optional)
                                  </label>
                                  <input
                                    type="time"
                                    value={slot.endTime || ''}
                                    onChange={(e) =>
                                      handleUpdateSlot(selectedDay, slot.id, {
                                        endTime: e.target.value || undefined,
                                      })
                                    }
                                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
                                  />
                                </div>
                              </div>
                            </div>

                            {!slot.default && (
                              <button
                                onClick={() => handleRemoveSlot(selectedDay, slot.id)}
                                className="text-red-500 hover:text-red-600 active:text-red-700 p-2.5 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                                aria-label="Remove slot"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {editingSchedule.schedules[selectedDay]?.slots.length === 0 && (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <p className="text-sm sm:text-base mb-3">No slots configured for this day</p>
                      <button
                        onClick={() => handleAddSlot(selectedDay)}
                        className="px-4 py-2.5 text-orange-600 hover:text-orange-700 active:text-orange-800 hover:bg-orange-50 active:bg-orange-100 rounded-lg text-sm sm:text-base font-medium transition-colors touch-manipulation"
                      >
                        Add your first slot
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Presets</h3>
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-sm text-orange-600 hover:text-orange-700 active:text-orange-800 font-medium touch-manipulation px-2 py-1"
                  >
                    {showPresets ? 'Hide' : 'Show'} Presets
                  </button>
                </div>

                {showPresets && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 sm:mb-6">
                    {MEAL_SCHEDULE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleCreateFromPreset(preset)}
                        className="text-left p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 active:border-orange-400 transition-all touch-manipulation"
                      >
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{preset.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {preset.schedules[0]?.slots.map(s => s.label).join(', ')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Schedule Button */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Schedules</h3>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-2 text-xs sm:text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation font-medium"
                >
                  <Plus size={14} className="sm:w-4 sm:h-4" />
                  <span>New Schedule</span>
                </button>
              </div>

              {/* Create New Schedule Form */}
              {showCreateForm && (
                <CreateScheduleForm
                  spaceId={spaceId}
                  onSave={handleCreateNewSchedule}
                  onCancel={() => {
                    setShowCreateForm(false);
                    setConflictWarning(null);
                  }}
                  existingSchedules={schedules}
                />
              )}

              {/* Existing Schedules */}
              <div>
                {schedules.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <UtensilsCrossed size={40} className="mx-auto text-gray-400 mb-3 sm:hidden" />
                    <UtensilsCrossed size={48} className="mx-auto text-gray-400 mb-3 hidden sm:block" />
                    <p className="text-sm sm:text-base text-gray-600 mb-2">No custom schedules yet</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Use a preset above or create a custom schedule
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:border-orange-300 active:border-orange-400 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{schedule.name}</h4>
                              {schedule.is_default && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                  Default
                                </span>
                              )}
                              {isScheduleActive(schedule) ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                              {schedule.schedules
                                .filter(s => s.enabled)
                                .map(s => s.slots.length)
                                .reduce((a, b) => a + b, 0)}{' '}
                              total slots across {schedule.schedules.filter(s => s.enabled).length}{' '}
                              days
                            </p>
                            {(schedule.start_date || schedule.end_date) && (
                              <p className="text-xs text-gray-500">
                                <Calendar size={12} className="inline mr-1" />
                                {schedule.start_date ? new Date(schedule.start_date).toLocaleDateString() : 'No start'} - {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'No end'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!schedule.is_default && (
                              <button
                                onClick={() => handleSetDefault(schedule.id)}
                                className="px-3 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation font-medium"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              onClick={() => handleEditSchedule(schedule)}
                              className="px-3 py-2 text-xs sm:text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation font-medium"
                            >
                              <Edit size={14} className="sm:w-4 sm:h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-2 text-red-500 hover:text-red-600 active:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                              aria-label="Delete schedule"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      {!embedded && (
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation text-sm sm:text-base"
          >
            Close
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={confirmDeleteSchedule}
        title="Delete Schedule?"
        message={
          scheduleToDelete
            ? `Are you sure you want to delete "${scheduleToDelete.name}"? This action cannot be undone. All meal plans using this schedule will be affected.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );

  if (loading) {
    if (embedded) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-600">Loading meal schedules...</div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="text-center">Loading meal schedules...</div>
        </div>
      </div>
    );
  }

  if (embedded) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col">
        {content}
      </div>
    </div>
  );
}

/**
 * Create Schedule Form Component
 */
function CreateScheduleForm({
  spaceId,
  onSave,
  onCancel,
  existingSchedules,
}: {
  spaceId: string;
  onSave: (name: string, isActive: boolean, startDate: string | null, endDate: string | null) => Promise<void>;
  onCancel: () => void;
  existingSchedules: MealSchedule[];
}) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Please enter a schedule name');
      return;
    }

    setSaving(true);
    try {
      await onSave(name.trim(), isActive, startDate || null, endDate || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 sm:p-5 border-2 border-orange-200 mb-4">
      <h4 className="text-base font-semibold text-gray-900 mb-4">Create New Schedule</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Schedule Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramadan 2024, Summer Schedule"
            className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="create-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="create-active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
            Active Schedule
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date (optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              End Date (optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch-manipulation"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium touch-manipulation"
          >
            {saving ? 'Creating...' : 'Create Schedule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
