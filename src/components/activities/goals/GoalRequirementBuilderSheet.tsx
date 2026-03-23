/**
 * Goal Requirement Builder Sheet
 * 
 * Canonical UI for adding/editing goal requirements.
 * Supports all requirement types with preview.
 */

import { useState, useEffect } from 'react';
import { X, Search, Target, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { listHabits } from '../../../lib/habits/habitsService';
import { addGoalRequirement, updateGoalRequirement, type GoalRequirementType } from '../../../lib/goals/goalsService';
import type { Activity } from '../../../lib/activities/activityService';
import type { GoalRequirement } from '../../../lib/goals/goalsService';

export interface GoalRequirementBuilderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  userId: string;
  existingRequirement?: GoalRequirement;
  onRequirementAdded?: () => void;
}

export function GoalRequirementBuilderSheet({
  isOpen,
  onClose,
  goalId,
  userId,
  existingRequirement,
  onRequirementAdded,
}: GoalRequirementBuilderSheetProps) {
  const [requirementType, setRequirementType] = useState<GoalRequirementType>(
    existingRequirement?.requirement_type || 'habit_count'
  );
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    existingRequirement?.required_activity_id || ''
  );
  const [targetCount, setTargetCount] = useState<number>(existingRequirement?.target_count || 30);
  const [windowDays, setWindowDays] = useState<number>(existingRequirement?.window_days || 30);
  const [perDayTarget, setPerDayTarget] = useState<number | null>(existingRequirement?.per_day_target || null);
  const [strict, setStrict] = useState<boolean>(existingRequirement?.strict !== undefined ? existingRequirement.strict : true);
  const [weight, setWeight] = useState<number>(existingRequirement?.weight || 100);
  const [searchQuery, setSearchQuery] = useState('');
  const [habits, setHabits] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen, userId]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const userHabits = await listHabits(userId, { status: 'active' });
      setHabits(userHabits);
    } catch (err) {
      console.error('[GoalRequirementBuilderSheet] Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHabits = habits.filter(habit =>
    habit.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedActivityId) {
      alert('Please select a habit or task');
      return;
    }

    setSaving(true);
    try {
      if (existingRequirement) {
        // Update existing
        await updateGoalRequirement(existingRequirement.id, {
          targetCount: requirementType === 'habit_count' || requirementType === 'habit_streak' ? targetCount : undefined,
          windowDays: requirementType === 'habit_streak' || requirementType === 'habit_count' ? windowDays : undefined,
          perDayTarget: perDayTarget || undefined,
          strict,
          weight,
        });
      } else {
        // Create new
        await addGoalRequirement(userId, goalId, {
          requiredActivityId: selectedActivityId,
          requirementType,
          targetCount: requirementType === 'habit_count' || requirementType === 'habit_streak' ? targetCount : undefined,
          windowDays: requirementType === 'habit_streak' || requirementType === 'habit_count' ? windowDays : undefined,
          perDayTarget: perDayTarget || undefined,
          strict,
          weight,
        });
      }

      onRequirementAdded?.();
      onClose();
    } catch (err) {
      console.error('[GoalRequirementBuilderSheet] Error saving requirement:', err);
      alert('Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  const getPreviewText = () => {
    const selectedHabit = habits.find(h => h.id === selectedActivityId);
    if (!selectedHabit) return 'Select a habit to see preview';

    switch (requirementType) {
      case 'habit_streak':
        return `Maintain a ${strict ? 'strict' : 'flexible'} streak of ${targetCount} consecutive days for "${selectedHabit.title}"`;
      case 'habit_count':
        return `Complete "${selectedHabit.title}" ${targetCount} times within ${windowDays} days`;
      case 'task_complete':
        return `Complete task "${selectedHabit.title}"`;
      default:
        return 'Custom requirement';
    }
  };

  if (!isOpen) return null;

  const isMobile = window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet/Modal */}
      <div
        className={`relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
          isMobile ? 'animate-slide-up' : 'animate-fade-in'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {existingRequirement ? 'Edit Requirement' : 'Add Requirement'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Link a habit or task to this goal</p>
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
          {/* Requirement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Requirement Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRequirementType('habit_streak')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  requirementType === 'habit_streak'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Target size={20} className="mb-2 text-blue-600" />
                <div className="font-medium text-sm">Streak</div>
                <div className="text-xs text-gray-600 mt-1">Consecutive days</div>
              </button>
              <button
                onClick={() => setRequirementType('habit_count')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  requirementType === 'habit_count'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CheckCircle2 size={20} className="mb-2 text-green-600" />
                <div className="font-medium text-sm">Count</div>
                <div className="text-xs text-gray-600 mt-1">Total completions</div>
              </button>
            </div>
          </div>

          {/* Activity Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Habit or Task
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
              ) : filteredHabits.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No habits found</div>
              ) : (
                filteredHabits.map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => setSelectedActivityId(habit.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                      selectedActivityId === habit.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{habit.title}</div>
                    {habit.description && (
                      <div className="text-xs text-gray-500 mt-1">{habit.description}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Requirement Configuration */}
          {(requirementType === 'habit_streak' || requirementType === 'habit_count') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {requirementType === 'habit_streak' ? 'Streak Length' : 'Target Count'}
                  </label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Window (days)
                  </label>
                  <input
                    type="number"
                    value={windowDays}
                    onChange={(e) => setWindowDays(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {requirementType === 'habit_streak' && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="strict"
                    checked={strict}
                    onChange={(e) => setStrict(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="strict" className="text-sm text-gray-700 cursor-pointer">
                    Strict mode (missed day breaks streak)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per-Day Target (optional)
                </label>
                <input
                  type="number"
                  value={perDayTarget || ''}
                  onChange={(e) => setPerDayTarget(e.target.value ? parseFloat(e.target.value) : null)}
                  min="0"
                  step="0.1"
                  placeholder="e.g., 30 pushups per day"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight (0-100, default 100)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Math.min(100, Math.max(0, parseInt(e.target.value) || 100)))}
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher weight means this requirement contributes more to overall progress
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 mb-1">Preview</div>
                <div className="text-sm text-blue-700">{getPreviewText()}</div>
              </div>
            </div>
          </div>
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
            disabled={saving || !selectedActivityId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : existingRequirement ? 'Update' : 'Add Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}






