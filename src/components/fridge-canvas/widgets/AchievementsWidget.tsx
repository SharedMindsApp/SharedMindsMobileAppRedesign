import { useState, useEffect } from 'react';
import { Trophy, Star, Flame, Target, Calendar, Award, Filter } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getUserAchievementsWithMeta,
  getAchievementProgress,
  getAchievementLeaderboard,
  getAllAchievementsMeta
} from '../../../lib/achievements';
import type { AchievementWithMeta, AchievementCategory } from '../../../lib/behaviourTypes';

interface AchievementsWidgetProps {
  householdId: string;
}

export function AchievementsWidget({ householdId }: AchievementsWidgetProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithMeta[]>([]);
  const [allMeta, setAllMeta] = useState<any[]>([]);
  const [progress, setProgress] = useState({ unlocked: 0, total: 0, percentage: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && householdId) {
      loadData();
    }
  }, [user, householdId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [achievementsData, progressData, leaderboardData, metaData] = await Promise.all([
        getUserAchievementsWithMeta(user!.id, householdId),
        getAchievementProgress(user!.id, householdId),
        getAchievementLeaderboard(householdId),
        getAllAchievementsMeta()
      ]);

      setAchievements(achievementsData);
      setProgress(progressData);
      setLeaderboard(leaderboardData);
      setAllMeta(metaData);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: AchievementCategory) => {
    switch (category) {
      case 'streaks':
        return <Flame size={14} className="text-orange-500" />;
      case 'habits':
        return <Target size={14} className="text-blue-500" />;
      case 'goals':
        return <Star size={14} className="text-yellow-500" />;
      case 'consistency':
        return <Award size={14} className="text-green-500" />;
      case 'calendar':
        return <Calendar size={14} className="text-purple-500" />;
      default:
        return <Trophy size={14} className="text-gray-500" />;
    }
  };

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.meta?.category === selectedCategory);

  const unlockedCodes = new Set(
    achievements.map(a => {
      if (a.type === 'streak' && a.meta) {
        return `STREAK_${a.value}`;
      }
      if (a.type === 'milestone' && a.meta) {
        return `COMPLETIONS_${a.value}`;
      }
      return null;
    }).filter(Boolean)
  );

  const displayMeta = selectedCategory === 'all'
    ? allMeta
    : allMeta.filter(m => m.category === selectedCategory);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Achievements</h3>
          </div>

          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`p-1.5 rounded-lg transition-colors ${
              showLeaderboard ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Toggle leaderboard"
          >
            <Award size={18} />
          </button>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {progress.unlocked} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedCategory('streaks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'streaks'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Flame size={12} className="inline mr-1" />
            Streaks
          </button>
          <button
            onClick={() => setSelectedCategory('habits')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'habits'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Target size={12} className="inline mr-1" />
            Habits
          </button>
          <button
            onClick={() => setSelectedCategory('goals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'goals'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star size={12} className="inline mr-1" />
            Goals
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showLeaderboard ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Household Leaderboard</h4>
            {leaderboard.map((member, index) => (
              <div
                key={member.profile_id}
                className={`p-3 rounded-lg border-2 ${
                  member.profile_id === user?.id
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? 'bg-yellow-500 text-white'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-700 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {member.full_name}
                      {member.profile_id === user?.id && (
                        <span className="text-xs text-gray-500 ml-2">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Trophy size={12} />
                        {member.total_achievements}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame size={12} />
                        {member.total_streak_days}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target size={12} />
                        {member.total_completions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {displayMeta.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600">No achievements in this category</p>
              </div>
            ) : (
              displayMeta.map(meta => {
                const isUnlocked = unlockedCodes.has(meta.code);
                const achievement = achievements.find(a => {
                  if (a.type === 'streak' && meta.category === 'streaks') {
                    return a.value === meta.threshold;
                  }
                  if (a.type === 'milestone' && meta.category === 'habits') {
                    return a.value === meta.threshold;
                  }
                  return false;
                });

                return (
                  <div
                    key={meta.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isUnlocked
                        ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 text-2xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-1">
                          {meta.title}
                          {isUnlocked && (
                            <span className="ml-2 text-xs font-semibold text-yellow-600">
                              Unlocked!
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mb-2">
                          {meta.description}
                        </p>

                        {isUnlocked && achievement && (
                          <div className="text-xs text-gray-500">
                            {new Date(achievement.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {getCategoryIcon(meta.category)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
