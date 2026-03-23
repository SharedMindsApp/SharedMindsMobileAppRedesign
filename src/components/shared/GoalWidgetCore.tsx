import { useState, useEffect } from 'react';
import { Target, TrendingUp, Plus, Check, Calendar } from 'lucide-react';
import type { WidgetRenderMode, WidgetViewMode, GoalContent } from '../../lib/fridgeCanvasTypes';
import { getUserHabits, createHabit, updateHabit } from '../../lib/habits';
import type { Habit } from '../../lib/behaviourTypes';
import { useAuth } from '../../contexts/AuthContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface GoalWidgetCoreProps {
  mode: WidgetRenderMode;
  householdId?: string;
  viewMode?: WidgetViewMode;
  content?: GoalContent;
  onContentChange?: (content: GoalContent) => void;
}

export function GoalWidgetCore({
  mode,
  householdId,
  viewMode = 'large',
  content,
  onContentChange
}: GoalWidgetCoreProps) {
  const { user } = useAuth();
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';
  const [goals, setGoals] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState<number>(100);
  const [selectedGoal, setSelectedGoal] = useState<Habit | null>(null);

  useEffect(() => {
    if (mode === 'mobile' && householdId && user) {
      loadGoals();
    }
  }, [mode, householdId, user]);

  const loadGoals = async () => {
    if (!householdId || !user) return;

    setLoading(true);
    try {
      const habits = await getUserHabits(user.id, householdId);
      setGoals(habits.filter(h => h.category === 'goal' || !h.category));
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!householdId || !user || !newGoalTitle.trim()) return;

    try {
      await createHabit({
        household_id: householdId,
        title: newGoalTitle,
        description: '',
        category: 'goal',
        repeat_type: 'custom',
        repeat_config: {},
        target_value: newGoalTarget,
        current_value: 0,
        unit: 'progress',
        assigned_to: [user.id]
      });
      setNewGoalTitle('');
      setNewGoalTarget(100);
      setShowAddForm(false);
      await loadGoals();
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const handleUpdateProgress = async (goal: Habit, newProgress: number) => {
    try {
      await updateHabit(goal.id, {
        current_value: Math.max(0, Math.min(newProgress, goal.target_value || 100))
      });
      await loadGoals();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const calculatePercentage = (goal: Habit) => {
    const current = goal.current_value || 0;
    const target = goal.target_value || 100;
    return Math.min(100, Math.round((current / target) * 100));
  };

  if (mode === 'fridge') {
    const progress = content?.progress || 0;
    const target = content?.target || 100;
    const percentage = Math.min(100, Math.round((progress / target) * 100));

    if (viewMode === 'icon') {
      return (
        <div className="w-full h-full bg-emerald-100 border-emerald-200 border-2 rounded-2xl flex items-center justify-center">
          <Target size={32} className="text-emerald-600" />
        </div>
      );
    }

    if (viewMode === 'mini') {
      return (
        <div className="w-full h-full bg-emerald-100 border-emerald-200 border-2 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-emerald-600" />
            <h3 className="font-bold text-emerald-900 text-xs truncate flex-1">{content?.title || 'Goal'}</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="relative h-3 bg-emerald-200 rounded-full overflow-hidden mb-2">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-700 font-medium text-center">
              {progress} / {target} ({percentage}%)
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-emerald-100 border-emerald-200 border-2 rounded-2xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
            <Target size={22} className="text-emerald-700" />
          </div>
          <TrendingUp size={20} className="text-emerald-600" />
        </div>
        <input
          type="text"
          className="w-full bg-transparent border-none focus:outline-none text-gray-800 font-bold text-lg mb-4"
          placeholder="Goal name..."
          value={content?.title || ''}
          onChange={(e) => onContentChange?.({ ...content, title: e.target.value })}
        />
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 font-medium">Progress</span>
            <span className="text-sm text-gray-700 font-bold">{percentage}%</span>
          </div>
          <div className="relative h-4 bg-emerald-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-600 font-medium block mb-1">Current</label>
            <input
              type="number"
              className="w-full text-sm text-gray-800 bg-white/50 rounded px-3 py-2 border border-emerald-300"
              value={progress}
              onChange={(e) => onContentChange?.({ ...content, progress: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-medium block mb-1">Target</label>
            <input
              type="number"
              className="w-full text-sm text-gray-800 bg-white/50 rounded px-3 py-2 border border-emerald-300"
              value={target}
              onChange={(e) => onContentChange?.({ ...content, target: Number(e.target.value) })}
            />
          </div>
        </div>
        {content?.participants && content.participants.length > 0 && (
          <div className="mt-auto">
            <p className="text-xs text-gray-600 mb-2">Participants:</p>
            <div className="flex flex-wrap gap-1">
              {content.participants.map((person, i) => (
                <span key={i} className="text-xs bg-white/60 px-2 py-1 rounded-full">
                  {person}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-600 text-center">Please join a household to track goals.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${
      isNeonMode ? 'neon-dark-widget' : 'bg-gray-50'
    }`}>
      <div className="bg-white border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Goals</h2>
            <p className="text-sm text-gray-600">{goals.length} active</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Goal title..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label className="text-xs text-gray-600 font-medium block mb-1">Target</label>
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                disabled={!newGoalTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewGoalTitle('');
                  setNewGoalTarget(100);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <Target size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">No goals yet</p>
            <p className="text-sm text-gray-500">Tap + to set a goal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const percentage = calculatePercentage(goal);
              const current = goal.current_value || 0;
              const target = goal.target_value || 100;
              const isSelected = selectedGoal?.id === goal.id;

              return (
                <div key={goal.id} className="bg-white rounded-lg p-4 border-2 border-gray-200">
                  <button
                    onClick={() => setSelectedGoal(isSelected ? null : goal)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        percentage === 100 ? 'bg-green-100' : 'bg-emerald-100'
                      }`}>
                        {percentage === 100 ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Target size={20} className="text-emerald-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 relative h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                percentage === 100 ? 'bg-green-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {current} / {target} {goal.unit || 'units'}
                          </span>
                          {goal.ends_at && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>Due {new Date(goal.ends_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="pt-3 border-t border-gray-200 space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 font-medium block mb-2">
                          Update Progress
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateProgress(goal, current - 1)}
                            disabled={current <= 0}
                            className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={current}
                            onChange={(e) => handleUpdateProgress(goal, Number(e.target.value))}
                            className="flex-1 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleUpdateProgress(goal, current + 1)}
                            disabled={current >= target}
                            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {percentage === 100 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                          <TrendingUp size={20} className="text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900">Goal Completed!</p>
                            <p className="text-xs text-green-700">Congratulations on reaching your target</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
