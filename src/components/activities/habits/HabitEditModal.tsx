/**
 * Habit Edit Modal
 * 
 * Allows users to edit habit title, description, and scheduling.
 */

import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { updateHabitActivity } from '../../../lib/habits/habitsService';
import type { Activity } from '../../../lib/activities/activityTypes';
import { HabitScheduleSheet } from './HabitScheduleSheet';
import { emitActivityChanged } from '../../../lib/activities/activityEvents';

interface HabitEditModalProps {
  habit: Activity;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  isMobile?: boolean;
}

export function HabitEditModal({
  habit,
  userId,
  isOpen,
  onClose,
  onUpdated,
  isMobile = false,
}: HabitEditModalProps) {
  const [title, setTitle] = useState(habit.title);
  const [description, setDescription] = useState(habit.description || '');
  const [saving, setSaving] = useState(false);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);

  // Reset form when habit changes
  useEffect(() => {
    if (isOpen) {
      setTitle(habit.title);
      setDescription(habit.description || '');
    }
  }, [habit.id, habit.title, habit.description, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Habit title is required');
      return;
    }

    setSaving(true);
    try {
      await updateHabitActivity(habit.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      
      emitActivityChanged(habit.id);
      onUpdated();
    } catch (err) {
      console.error('[HabitEditModal] Error updating habit:', err);
      alert('Failed to update habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center safe-top safe-bottom">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-2xl shadow-2xl max-w-full sm:max-w-md w-full mx-4 my-4 max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
              Edit Habit
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Habit Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Morning Meditation"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Optional description"
              />
            </div>

            {/* Schedule Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule
              </label>
              <button
                onClick={() => setShowScheduleSheet(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-700">Edit schedule</span>
                </div>
                <span className="text-sm text-gray-400">→</span>
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Set when this habit appears on your calendar
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Sheet */}
      {showScheduleSheet && (
        <HabitScheduleSheet
          isOpen={showScheduleSheet}
          onClose={() => setShowScheduleSheet(false)}
          habit={habit}
          userId={userId}
          isMobile={isMobile}
          onScheduleUpdated={() => {
            // Schedule updates are handled by the schedule sheet
            // Emit activity change to refresh parent
            emitActivityChanged(habit.id);
            onUpdated(); // Refresh parent component
          }}
        />
      )}
    </>
  );
}
