import { useState, useEffect } from 'react';
import { Users, Heart, TrendingUp, Award, Zap } from 'lucide-react';
import { getSocialInsights } from '../../lib/insights';
import type { SocialInsights } from '../../lib/insightsTypes';

interface SocialInsightsDashboardProps {
  householdId: string;
}

export function SocialInsightsDashboard({ householdId }: SocialInsightsDashboardProps) {
  const [insights, setInsights] = useState<SocialInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [householdId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await getSocialInsights(householdId);
      setInsights(data);
    } catch (error) {
      console.error('Failed to load social insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading social insights...</p>
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

  const { contributionDashboard } = insights;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Household Dynamics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contributionDashboard.mostHelpfulMember && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-purple-700">Most Helpful</h3>
              <Heart className="text-purple-500" size={24} />
            </div>
            <p className="text-2xl font-bold text-purple-900 mb-1">
              {contributionDashboard.mostHelpfulMember.full_name}
            </p>
            <p className="text-sm text-purple-600">
              {contributionDashboard.mostHelpfulMember.helps_given} assists
            </p>
          </div>
        )}

        {contributionDashboard.mostSupportedMember && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-700">Most Supported</h3>
              <Users className="text-blue-500" size={24} />
            </div>
            <p className="text-2xl font-bold text-blue-900 mb-1">
              {contributionDashboard.mostSupportedMember.full_name}
            </p>
            <p className="text-sm text-blue-600">
              {contributionDashboard.mostSupportedMember.helps_received} assists received
            </p>
          </div>
        )}

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-green-700">Fairness Score</h3>
            <Zap className="text-green-500" size={24} />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-900 mb-1">{insights.fairnessScore}%</div>
            <p className="text-sm text-green-600">Well balanced!</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={20} />
          Contribution Rankings
        </h3>
        <div className="space-y-3">
          {contributionDashboard.rankings.map((member, index) => {
            const rank = index + 1;
            const badgeColor = rank === 1
              ? 'bg-yellow-500'
              : rank === 2
              ? 'bg-gray-400'
              : rank === 3
              ? 'bg-orange-700'
              : 'bg-gray-300';

            return (
              <div
                key={member.profile_id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className={`w-10 h-10 ${badgeColor} rounded-full flex items-center justify-center text-white font-bold`}>
                  {rank}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{member.full_name}</span>
                    <span className="text-sm font-bold text-gray-700">
                      {member.contribution_score} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Heart size={12} className="text-purple-500" />
                      {member.helps_given} given
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} className="text-blue-500" />
                      {member.helps_received} received
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {insights.sharedAchievements && insights.sharedAchievements.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-orange-600" size={20} />
            Shared Achievements
          </h3>
          <div className="space-y-3">
            {insights.sharedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg"
              >
                <span className="text-2xl">{achievement.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{achievement.title}</p>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(achievement.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-cyan-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Household Harmony Tips</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5"></div>
            <p>Your household shows great balance in workload distribution!</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5"></div>
            <p>Members are actively supporting each other — keep it up!</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5"></div>
            <p>Consider pairing members with complementary strengths for better results.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
