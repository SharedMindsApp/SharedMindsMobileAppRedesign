import { useState, useEffect } from 'react';
import { TrendingUp, Flame, Target, Trophy, Users, Zap, AlertCircle, ChevronRight } from 'lucide-react';
import { getFamilyOverview } from '../../lib/insights';
import type { FamilyOverview, MemberProgress } from '../../lib/insightsTypes';

interface FamilyOverviewDashboardProps {
  householdId: string;
  onSelectMember?: (profileId: string) => void;
}

export function FamilyOverviewDashboard({ householdId, onSelectMember }: FamilyOverviewDashboardProps) {
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<7 | 30>(7);

  useEffect(() => {
    loadOverview();
  }, [householdId, timeframe]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await getFamilyOverview(householdId, timeframe);
      setOverview(data);
    } catch (error) {
      console.error('Failed to load family overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const getEnergyColor = (level: number) => {
    if (level >= 80) return 'from-green-400 to-emerald-500';
    if (level >= 60) return 'from-blue-400 to-cyan-500';
    if (level >= 40) return 'from-yellow-400 to-orange-500';
    return 'from-orange-400 to-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Family Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeframe === 7
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeframe(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeframe === 30
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Habits Completed</p>
              <p className="text-3xl font-bold text-blue-900">{overview.totalHabitsCompleted}</p>
            </div>
          </div>
          <div className="text-xs text-blue-600">
            {overview.householdCompletionRate}% completion rate
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Collective Streak</p>
              <p className="text-3xl font-bold text-orange-900">{overview.collectiveStreakDays}</p>
            </div>
          </div>
          <div className="text-xs text-orange-600">
            Days of consistency
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Best Day</p>
              <p className="text-2xl font-bold text-green-900">{overview.bestDayOfWeek}</p>
            </div>
          </div>
          <div className="text-xs text-green-600">
            Most productive
          </div>
        </div>

        <div className={`bg-gradient-to-br ${getEnergyColor(overview.energyMeter)} rounded-2xl p-6 border-2 border-white shadow-lg`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-white font-medium">Energy Meter</p>
              <p className="text-3xl font-bold text-white">{overview.energyMeter}%</p>
            </div>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500"
              style={{ width: `${overview.energyMeter}%` }}
            />
          </div>
        </div>
      </div>

      {overview.quickWins.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-yellow-600" size={20} />
            Quick Wins This Week
          </h3>
          <div className="space-y-2">
            {overview.quickWins.map((win, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{win}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="text-blue-600" size={20} />
          Member Progress
        </h3>
        <div className="space-y-4">
          {overview.memberProgress
            .sort((a, b) => b.completion_rate - a.completion_rate)
            .map((member) => (
              <button
                key={member.profile_id}
                onClick={() => onSelectMember?.(member.profile_id)}
                className="w-full group"
              >
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {member.full_name}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-orange-600">
                          <Flame size={14} />
                          {member.current_streak}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Trophy size={14} />
                          {member.achievements_count}
                        </span>
                        <span className="font-bold text-gray-900">{member.completion_rate}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
                        style={{ width: `${member.completion_rate}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {member.total_completions} completions
                      {member.contribution_score > 0 && ` • ${member.contribution_score} contribution points`}
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" size={20} />
                </div>
              </button>
            ))}
        </div>
      </div>

      {overview.topHelper && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium mb-1">Top Helper of the Week</p>
              <p className="text-2xl font-bold text-purple-900">{overview.topHelper.full_name}</p>
              <p className="text-sm text-purple-600 mt-2">
                {overview.topHelper.contribution_score} contribution points
              </p>
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Trophy className="text-white" size={32} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
