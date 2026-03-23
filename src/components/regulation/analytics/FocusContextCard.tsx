import React, { useState, useEffect } from 'react';
import { Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface FocusSession {
  id: string;
  start_time: string;
  end_time: string | null;
  actual_duration_minutes: number | null;
}

interface RegulationSignal {
  id: string;
  signal_key: string;
  detected_at: string;
  context_data: any;
}

export function FocusContextCard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '14days'>('7days');
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [signals, setSignals] = useState<RegulationSignal[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, timeframe]);

  async function loadData() {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      if (timeframe === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (timeframe === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      }

      const [sessionsResponse, signalsResponse] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('id, start_time, end_time, actual_duration_minutes')
          .eq('user_id', user.id)
          .gte('start_time', startDate.toISOString())
          .order('start_time', { ascending: false }),

        supabase
          .from('regulation_active_signals')
          .select('id, signal_key, detected_at, context_data')
          .eq('user_id', user.id)
          .in('signal_key', ['context_switching', 'scope_expansion'])
          .gte('detected_at', startDate.toISOString())
          .order('detected_at', { ascending: false })
      ]);

      if (sessionsResponse.error) throw sessionsResponse.error;
      if (signalsResponse.error) throw signalsResponse.error;

      setSessions(sessionsResponse.data || []);
      setSignals(signalsResponse.data || []);
    } catch (error) {
      console.error('Error loading focus context:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Timer className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Focus & Fragmentation Context</h3>
        </div>
        <div className="text-sm text-gray-500">Loading focus patterns...</div>
      </div>
    );
  }

  const briefSessions = sessions.filter(s => s.actual_duration_minutes && s.actual_duration_minutes < 15);
  const contextSwitchSignals = signals.filter(s => s.signal_key === 'context_switching');
  const scopeExpansionSignals = signals.filter(s => s.signal_key === 'scope_expansion');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Timer className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Focus & Fragmentation Context</h3>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-6">
          <div className="text-xs text-gray-500 italic">
            This panel explains signals in context. It suggests patterns, not conclusions.
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === 'today'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === '7days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('14days')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === '14days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              14 Days
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{sessions.length}</div>
              <div className="text-xs text-gray-600 mt-1">Focus sessions</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{briefSessions.length}</div>
              <div className="text-xs text-gray-600 mt-1">Sessions under 15min</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{contextSwitchSignals.length}</div>
              <div className="text-xs text-gray-600 mt-1">Context switches noted</div>
            </div>
          </div>

          {sessions.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Focus Sessions</h4>
              <div className="space-y-2">
                {sessions.slice(0, 5).map(session => {
                  const isBrief = session.actual_duration_minutes && session.actual_duration_minutes < 15;
                  const sessionTime = new Date(session.start_time);

                  const relatedSignals = signals.filter(signal => {
                    const signalTime = new Date(signal.detected_at);
                    const timeDiff = Math.abs(signalTime.getTime() - sessionTime.getTime());
                    return timeDiff < 60 * 60 * 1000;
                  });

                  return (
                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900">
                            {sessionTime.toLocaleDateString()} at{' '}
                            {sessionTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {session.actual_duration_minutes ? `${session.actual_duration_minutes} minutes` : 'In progress'}
                          </div>
                          {isBrief && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              This focus session was brief before ending.
                            </div>
                          )}
                          {relatedSignals.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              During this time, {relatedSignals.length} pattern{relatedSignals.length !== 1 ? 's' : ''} appeared.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No focus sessions recorded during this period.
            </div>
          )}

          {scopeExpansionSignals.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-2">Pattern: Scope Expansion</div>
              <div className="text-xs text-gray-600">
                {scopeExpansionSignals.length} instance{scopeExpansionSignals.length !== 1 ? 's' : ''} of
                scope expansion appeared during this period. This suggests moments when new work was
                added while other work remained open.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
