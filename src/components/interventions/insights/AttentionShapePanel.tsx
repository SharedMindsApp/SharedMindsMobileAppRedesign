import { useState, useEffect } from 'react';
import { Eye, Clock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

type TimeWindow = 'today' | '7days' | '14days';

interface SessionPattern {
  shortSessions: number;
  mediumSessions: number;
  longSessions: number;
  contextSwitches: number;
}

export function AttentionShapePanel() {
  const { user } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7days');
  const [pattern, setPattern] = useState<SessionPattern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPattern();
    }
  }, [user, timeWindow]);

  async function loadPattern() {
    if (!user) return;

    const now = new Date();
    const startDate = new Date();

    if (timeWindow === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeWindow === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 14);
    }

    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('actual_duration_minutes, drift_count')
      .eq('user_id', user.id)
      .gte('start_time', startDate.toISOString())
      .not('end_time', 'is', null);

    if (!sessions || sessions.length === 0) {
      setPattern(null);
      setLoading(false);
      return;
    }

    const shortSessions = sessions.filter((s) => (s.actual_duration_minutes || 0) < 30).length;
    const mediumSessions = sessions.filter((s) => (s.actual_duration_minutes || 0) >= 30 && (s.actual_duration_minutes || 0) < 90).length;
    const longSessions = sessions.filter((s) => (s.actual_duration_minutes || 0) >= 90).length;
    const contextSwitches = sessions.reduce((sum, s) => sum + (s.drift_count || 0), 0);

    setPattern({
      shortSessions,
      mediumSessions,
      longSessions,
      contextSwitches,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">How your attention moved</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">How your attention moved</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">No focus sessions yet</p>
          <p className="text-xs text-gray-500">
            This panel shows patterns in session lengths and context switches. Try using Focus Mode to see how this works.
          </p>
        </div>
      </div>
    );
  }

  const total = pattern.shortSessions + pattern.mediumSessions + pattern.longSessions;
  const dominant =
    pattern.shortSessions > pattern.mediumSessions && pattern.shortSessions > pattern.longSessions
      ? 'short'
      : pattern.longSessions > pattern.shortSessions && pattern.longSessions > pattern.mediumSessions
      ? 'long'
      : 'mixed';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">How your attention moved</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeWindow('today')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === 'today'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeWindow('7days')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === '7days'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeWindow('14days')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === '14days'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            14 days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-900">Short bursts</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{pattern.shortSessions}</div>
          <div className="text-xs text-amber-600 mt-1">&lt; 30 min</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Medium spans</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{pattern.mediumSessions}</div>
          <div className="text-xs text-blue-600 mt-1">30-90 min</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Long sessions</span>
          </div>
          <div className="text-2xl font-bold text-green-700">{pattern.longSessions}</div>
          <div className="text-xs text-green-600 mt-1">&gt; 90 min</div>
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          {dominant === 'short' && (
            <>
              During this period, attention tended to move in shorter bursts with {pattern.contextSwitches} context{' '}
              {pattern.contextSwitches === 1 ? 'switch' : 'switches'}. This pattern often appears during exploration or
              overload.
            </>
          )}
          {dominant === 'long' && (
            <>
              During this period, attention stayed in longer sessions with {pattern.contextSwitches} context{' '}
              {pattern.contextSwitches === 1 ? 'switch' : 'switches'}. This pattern often appears during deep work or
              flow states.
            </>
          )}
          {dominant === 'mixed' && (
            <>
              During this period, attention moved in a mix of session lengths with {pattern.contextSwitches} context{' '}
              {pattern.contextSwitches === 1 ? 'switch' : 'switches'}. This pattern often appears during varied work or
              transitions.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
