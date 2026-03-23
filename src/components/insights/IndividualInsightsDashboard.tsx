import { useState, useEffect } from 'react';
import { Flame, TrendingUp, TrendingDown, Trophy, Calendar, Target, ArrowLeft } from 'lucide-react';
import { getIndividualInsights } from '../../lib/insights';
import type { IndividualInsights } from '../../lib/insightsTypes';

interface IndividualInsightsDashboardProps {
  profileId: string;
  householdId: string;
  onBack?: () => void;
}

export function IndividualInsightsDashboard({ profileId, householdId, onBack }: IndividualInsightsDashboardProps) {
  const [insights, setInsights] = useState<IndividualInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [profileId, householdId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await getIndividualInsights(profileId, householdId, 30);
      setInsights(data);
    } catch (error) {
      console.error('Failed to load individual insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading personal insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const getHeatmapColor = (level: number) => {
    const colors = ['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'];
    return colors[level] || colors[0];
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Family Overview
        </button>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{insights.full_name}'s Insights</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          Last 30 days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-orange-700">Active Streaks</h3>
            <Flame className="text-orange-500" size={24} />
          </div>
          <div className="space-y-3">
            {insights.personalStreaks.slice(0, 3).map((streak) => (
              <div key={streak.habit_id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 truncate">{streak.habit_title}</span>
                  <span className="text-sm font-bold text-orange-900">{streak.current_streak}🔥</span>
                </div>
                <div className="w-full bg-orange-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (streak.current_streak / streak.longest_streak) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-yellow-700">Achievements</h3>
            <Trophy className="text-yellow-500" size={24} />
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-yellow-900 mb-2">{insights.achievementsUnlocked}</div>
            <p className="text-sm text-yellow-600">Unlocked</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-700">On-Time Rate</h3>
            <Target className="text-blue-500" size={24} />
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-900 mb-2">{insights.onTimeCompletionRate}%</div>
            <p className="text-sm text-blue-600">Completed on time</p>
          </div>
        </div>
      </div>

      {insights.mostImprovedHabit && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-lg font-bold text-gray-900">Most Improved Habit</h3>
          </div>
          <p className="text-2xl font-bold text-green-900 mb-2">{insights.mostImprovedHabit.habit_title}</p>
          <p className="text-sm text-green-600">
            Your consistency is strongest mid-morning — consider scheduling this habit there!
          </p>
        </div>
      )}

      {insights.largestStruggleHabit && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-amber-600" size={24} />
            <h3 className="text-lg font-bold text-gray-900">Habit to Focus On</h3>
          </div>
          <p className="text-2xl font-bold text-amber-900 mb-2">{insights.largestStruggleHabit.habit_title}</p>
          <p className="text-sm text-amber-600">
            This habit seems tougher for you — want help adjusting it? Try breaking it into smaller steps.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Habit Consistency</h3>
        <div className="space-y-4">
          {insights.habitsConsistency.slice(0, 5).map((habit) => (
            <div key={habit.habit_id}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{habit.habit_title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{habit.completion_rate}%</span>
                  {habit.trend === 'improving' && <TrendingUp className="text-green-500" size={16} />}
                  {habit.trend === 'declining' && <TrendingDown className="text-red-500" size={16} />}
                </div>
              </div>
              <div className="flex gap-1">
                {habit.weekly_completion.map((count, index) => {
                  const height = Math.max(8, (count / 7) * 40);
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-gray-100 rounded-t-lg transition-all"
                      style={{ height: `${height}px` }}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg"
                        style={{ height: `${height}px` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>7 weeks ago</span>
                <span>This week</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Heatmap</h3>
        <p className="text-sm text-gray-600 mb-4">Your completion patterns over the last 30 days</p>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (34 - index));
            const dateStr = date.toISOString().split('T')[0];
            const heatmapDay = insights.calendarHeatmap.find(h => h.date === dateStr);
            const level = heatmapDay?.level || 0;

            return (
              <div
                key={index}
                className={`aspect-square rounded-lg ${getHeatmapColor(level)} transition-colors hover:ring-2 hover:ring-blue-400`}
                title={`${dateStr}: ${heatmapDay?.count || 0} completions`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`w-4 h-4 rounded ${getHeatmapColor(level)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your Energy Rhythm</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-purple-700 mb-2">Best Time of Day</p>
            <p className="text-2xl font-bold text-purple-900 capitalize">{insights.energyRhythm.bestTimeOfDay}</p>
          </div>
          <div>
            <p className="text-sm text-purple-700 mb-2">Peak Hour</p>
            <p className="text-2xl font-bold text-purple-900">{insights.energyRhythm.peakProductivityHour}:00 AM</p>
          </div>
          <div>
            <p className="text-sm text-purple-700 mb-2">Strong Days</p>
            <p className="text-sm text-purple-900">
              {insights.energyRhythm.strongDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
            </p>
          </div>
        </div>
        <p className="text-sm text-purple-600 mt-4">
          Your focus is strongest in the {insights.energyRhythm.bestTimeOfDay} — consider moving challenging tasks there.
        </p>
      </div>
    </div>
  );
}
