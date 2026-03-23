import { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Target, Calendar, Users } from 'lucide-react';
import { getAchievementTimeline } from '../../lib/insights';
import type { AchievementTimelineEvent } from '../../lib/insightsTypes';

interface AchievementsTimelineProps {
  householdId: string;
}

export function AchievementsTimeline({ householdId }: AchievementsTimelineProps) {
  const [events, setEvents] = useState<AchievementTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadTimeline();
  }, [householdId, days]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await getAchievementTimeline(householdId, days);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: AchievementTimelineEvent['type']) => {
    switch (type) {
      case 'streak':
        return <Flame className="text-orange-500" size={20} />;
      case 'milestone':
        return <Trophy className="text-yellow-500" size={20} />;
      case 'goal':
        return <Target className="text-green-500" size={20} />;
      case 'habit_added':
        return <Star className="text-blue-500" size={20} />;
      case 'weekly_win':
        return <Calendar className="text-purple-500" size={20} />;
      case 'badge':
        return <Trophy className="text-pink-500" size={20} />;
      default:
        return <Star className="text-gray-500" size={20} />;
    }
  };

  const getColor = (type: AchievementTimelineEvent['type']) => {
    switch (type) {
      case 'streak':
        return 'border-orange-200 bg-orange-50';
      case 'milestone':
        return 'border-yellow-200 bg-yellow-50';
      case 'goal':
        return 'border-green-200 bg-green-50';
      case 'habit_added':
        return 'border-blue-200 bg-blue-50';
      case 'weekly_win':
        return 'border-purple-200 bg-purple-50';
      case 'badge':
        return 'border-pink-200 bg-pink-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Achievement Timeline</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === 7
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === 30
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            30 days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === 90
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            90 days
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-gray-200">
          <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">No achievements yet in this period</p>
          <p className="text-sm text-gray-500 mt-2">Keep completing habits to unlock achievements!</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-200 via-orange-200 to-pink-200"></div>

          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-16">
                <div className={`absolute left-4 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                  event.isCollective ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-white'
                }`}>
                  {event.isCollective ? (
                    <Users className="text-white" size={16} />
                  ) : (
                    getIcon(event.type)
                  )}
                </div>

                <div className={`rounded-xl p-4 border-2 ${getColor(event.type)} transition-all hover:shadow-md`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{event.icon}</span>
                        <h3 className="font-bold text-gray-900">{event.title}</h3>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{event.profile_name || 'Household'}</span>
                        <span>•</span>
                        <span>{new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
