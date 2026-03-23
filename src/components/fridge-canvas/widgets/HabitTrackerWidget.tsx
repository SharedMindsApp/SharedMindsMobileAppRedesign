import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, TrendingUp, Flame, Target } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getUserHabits,
  getHabitEntries,
  completeHabit,
  uncompleteHabit,
  calculateStreak,
  isHabitDueToday
} from '../../../lib/habits';
import type { Habit, HabitEntry, StreakInfo } from '../../../lib/behaviourTypes';
import { checkFirstHabitAchievement, checkPerfectDayAchievement } from '../../../lib/achievements';

interface HabitTrackerWidgetProps {
  householdId: string;
  onCreateHabit?: () => void;
}

export function HabitTrackerWidget({ householdId, onCreateHabit }: HabitTrackerWidgetProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayEntries, setTodayEntries] = useState<Map<string, HabitEntry>>(new Map());
  const [streaks, setStreaks] = useState<Map<string, StreakInfo>>(new Map());
  const [dueToday, setDueToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [completingHabit, setCompletingHabit] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user && householdId) {
      loadHabits();
    }
  }, [user, householdId]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const habitsData = await getUserHabits(user!.id, householdId);
      setHabits(habitsData);

      const entriesMap = new Map();
      const streaksMap = new Map();
      const dueTodaySet = new Set();

      for (const habit of habitsData) {
        const entries = await getHabitEntries(habit.id, user!.id, today, today);
        if (entries.length > 0) {
          entriesMap.set(habit.id, entries[0]);
        }

        const streakInfo = await calculateStreak(habit.id, user!.id);
        streaksMap.set(habit.id, streakInfo);

        const isDue = await isHabitDueToday(habit);
        if (isDue) {
          dueTodaySet.add(habit.id);
        }
      }

      setTodayEntries(entriesMap);
      setStreaks(streaksMap);
      setDueToday(dueTodaySet);
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (habit: Habit) => {
    if (!user) return;

    setCompletingHabit(habit.id);

    try {
      const entry = todayEntries.get(habit.id);

      if (entry) {
        await uncompleteHabit(habit.id, user.id, today);
        const newEntries = new Map(todayEntries);
        newEntries.delete(habit.id);
        setTodayEntries(newEntries);
      } else {
        const result = await completeHabit(habit.id, user.id, today);

        if (result.success && result.habit_entry) {
          const newEntries = new Map(todayEntries);
          newEntries.set(habit.id, result.habit_entry);
          setTodayEntries(newEntries);

          if (result.streak_info) {
            const newStreaks = new Map(streaks);
            newStreaks.set(habit.id, result.streak_info);
            setStreaks(newStreaks);
          }

          await checkFirstHabitAchievement(user.id, householdId);
          await checkPerfectDayAchievement(user.id, householdId, today);

          if (result.new_achievements && result.new_achievements.length > 0) {
            console.log('New achievements unlocked!', result.new_achievements);
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle habit completion:', error);
    } finally {
      setCompletingHabit(null);
    }
  };

  const getCompletionRate = () => {
    const dueTodayArray = Array.from(dueToday);
    if (dueTodayArray.length === 0) return 100;

    const completedCount = dueTodayArray.filter(habitId => todayEntries.has(habitId)).length;
    return Math.round((completedCount / dueTodayArray.length) * 100);
  };

  const totalCompletions = Array.from(streaks.values()).reduce(
    (sum, s) => sum + s.total_completions,
    0
  );

  const totalStreakDays = Array.from(streaks.values()).reduce(
    (sum, s) => sum + s.current_streak,
    0
  );

  const dueTodayHabits = habits.filter(h => dueToday.has(h.id));
  const completionRate = getCompletionRate();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Today's Habits</h3>
          <button
            onClick={onCreateHabit}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Add habit"
          >
            <Plus size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-blue-600 mb-1">
              <Target size={14} />
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="text-blue-700">Today</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-orange-600 mb-1">
              <Flame size={14} />
              <span className="font-medium">{totalStreakDays}</span>
            </div>
            <div className="text-orange-700">Streak</div>
          </div>

          <div className="bg-green-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-green-600 mb-1">
              <TrendingUp size={14} />
              <span className="font-medium">{totalCompletions}</span>
            </div>
            <div className="text-green-700">Total</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {dueTodayHabits.length === 0 ? (
          <div className="text-center py-8">
            <Circle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 mb-2">No habits due today</p>
            <button
              onClick={onCreateHabit}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first habit
            </button>
          </div>
        ) : (
          dueTodayHabits.map(habit => {
            const isCompleted = todayEntries.has(habit.id);
            const streak = streaks.get(habit.id);
            const isProcessing = completingHabit === habit.id;

            return (
              <button
                key={habit.id}
                onClick={() => handleToggleCompletion(habit)}
                disabled={isProcessing}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  isCompleted
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isProcessing ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">{habit.title}</div>

                    {habit.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">{habit.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs">
                      {streak && streak.current_streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Flame size={12} />
                          <span>{streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {streak && streak.total_completions > 0 && (
                        <div className="text-gray-500">
                          {streak.total_completions} completion{streak.total_completions !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
