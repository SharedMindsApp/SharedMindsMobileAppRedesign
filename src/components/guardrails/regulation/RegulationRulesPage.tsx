import { useEffect, useState } from 'react';
import { Shield, TrendingUp, TrendingDown, Calendar, Award, AlertTriangle } from 'lucide-react';
import { useRegulation } from '../../../contexts/RegulationContext';
import { getRecentEvents, useOverride } from '../../../lib/regulationEngine';
import type { RegulationEvent } from '../../../lib/regulationTypes';

export function RegulationRulesPage() {
  const { regulationState, levelConfig, enforcement, refreshState } = useRegulation();
  const [recentEvents, setRecentEvents] = useState<RegulationEvent[]>([]);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState('');

  useEffect(() => {
    loadEvents();
  }, [regulationState]);

  async function loadEvents() {
    try {
      const events = await getRecentEvents();
      setRecentEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  async function handleUseOverride() {
    const result = await useOverride();
    setOverrideMessage(result.message);
    setShowOverrideConfirm(false);

    if (result.allowed) {
      await refreshState();
    }

    setTimeout(() => {
      setOverrideMessage('');
    }, 5000);
  }

  if (!regulationState || !levelConfig || !enforcement) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getLevelEmoji = (level: number) => {
    const emojis = ['😎', '🙂', '😐', '😬', '🛡️'];
    return emojis[level - 1];
  };

  const getLevelColor = (level: number) => {
    const colors = [
      'from-green-500 to-emerald-600',
      'from-blue-500 to-cyan-600',
      'from-yellow-500 to-orange-500',
      'from-orange-500 to-red-500',
      'from-red-600 to-rose-700',
    ];
    return colors[level - 1];
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('completed') || eventType.includes('win')) {
      return <TrendingUp size={16} className="text-green-600" />;
    }
    if (eventType.includes('missed') || eventType.includes('ignored') || eventType.includes('abandoned')) {
      return <TrendingDown size={16} className="text-red-600" />;
    }
    if (eventType.includes('escalated')) {
      return <AlertTriangle size={16} className="text-orange-600" />;
    }
    return <Calendar size={16} className="text-gray-600" />;
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Shield size={40} />
            <div>
              <h1 className="text-3xl font-bold">Regulation Rules</h1>
              <p className="text-blue-100 mt-1">Your adaptive accountability system</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`bg-gradient-to-br ${getLevelColor(regulationState.current_level)} rounded-2xl shadow-xl p-8 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-5xl">{getLevelEmoji(regulationState.current_level)}</span>
                <div>
                  <h2 className="text-2xl font-bold">{levelConfig.name}</h2>
                  <p className="text-white/90 text-sm">Level {regulationState.current_level} of 5</p>
                </div>
              </div>
              <button
                onClick={() => setShowOverrideConfirm(true)}
                disabled={regulationState.current_level === 5}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Use Override
              </button>
            </div>
            <p className="text-lg mb-6">{levelConfig.mainMessage}</p>
            <div className="text-sm text-white/80">{levelConfig.description}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Current Behaviors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(levelConfig.behaviors).map(([category, behaviors]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <ul className="space-y-1">
                    {behaviors.map((behavior, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{behavior}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                recentEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getEventIcon(event.event_type)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatEventType(event.event_type)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {event.impact_on_trust !== 0 && (
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                        event.impact_on_trust > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {event.impact_on_trust > 0 ? '+' : ''}{event.impact_on_trust}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Award className="text-yellow-500" size={28} />
              <h3 className="text-xl font-bold text-gray-900">Trust Score</h3>
            </div>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-4xl font-bold text-gray-900">
                    {regulationState.trust_score}
                  </span>
                  <span className="text-gray-600 text-lg ml-1">/100</span>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200">
                <div
                  style={{ width: `${regulationState.trust_score}%` }}
                  className={`${getTrustScoreColor(regulationState.trust_score)} shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500`}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              {regulationState.trust_score >= 80 && 'Excellent! You have full freedom.'}
              {regulationState.trust_score >= 60 && regulationState.trust_score < 80 && 'Good work! Keep it up.'}
              {regulationState.trust_score >= 40 && regulationState.trust_score < 60 && 'Some structure is being added.'}
              {regulationState.trust_score >= 20 && regulationState.trust_score < 40 && 'We\'re rebuilding together.'}
              {regulationState.trust_score < 20 && 'Full support mode activated.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Last 7 Days</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Tasks Completed</span>
                <span className="text-2xl font-bold text-green-600">
                  {regulationState.tasks_completed_7d}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Focus Sessions</span>
                <span className="text-2xl font-bold text-blue-600">
                  {regulationState.focus_sessions_completed_7d}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Drift Events</span>
                <span className="text-2xl font-bold text-orange-600">
                  {regulationState.drift_events_last_7d}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Missed Deadlines</span>
                <span className="text-2xl font-bold text-red-600">
                  {regulationState.missed_deadlines_last_7d}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Momentum</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Wins in a Row</span>
                <span className="text-2xl font-bold text-green-600">
                  {regulationState.consecutive_wins}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Setbacks in a Row</span>
                <span className="text-2xl font-bold text-red-600">
                  {regulationState.consecutive_losses}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOverrideConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Use Override?</h3>
            <p className="text-gray-700">
              You can use one override per day to temporarily bypass restrictions. Use this time wisely to make meaningful progress!
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleUseOverride}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Use Override
              </button>
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {overrideMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border-2 border-blue-600 p-4 max-w-md">
          <p className="text-gray-900 font-medium">{overrideMessage}</p>
        </div>
      )}
    </div>
  );
}
