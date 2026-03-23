import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Clock, Target, Zap } from 'lucide-react';
import { getFocusSessionHistory } from '../../../lib/guardrails/focus';
import type { FocusSession } from '../../../lib/guardrails/focusTypes';

interface DayStats {
  date: string;
  sessions: number;
  totalMinutes: number;
  avgScore: number;
  totalDrifts: number;
}

export function FocusAnalytics() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const data = await getFocusSessionHistory(100);
      setSessions(data);
      calculateWeeklyStats(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateWeeklyStats(sessionData: FocusSession[]) {
    const today = new Date();
    const last7Days: DayStats[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = sessionData.filter(s => {
        const sessionDate = new Date(s.start_time).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const totalMinutes = daySessions.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0);
      const avgScore = daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / daySessions.length
        : 0;
      const totalDrifts = daySessions.reduce((sum, s) => sum + s.drift_count, 0);

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sessions: daySessions.length,
        totalMinutes,
        avgScore: Math.round(avgScore),
        totalDrifts,
      });
    }

    setWeeklyStats(last7Days);
  }

  function getDriftTypeBreakdown() {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalDrifts = completedSessions.reduce((sum, s) => sum + s.drift_count, 0);

    return {
      totalDrifts,
      avgDriftsPerSession: completedSessions.length > 0
        ? (totalDrifts / completedSessions.length).toFixed(1)
        : '0',
    };
  }

  function getProductivityTrend() {
    const last30Days = sessions.slice(0, 30);
    if (last30Days.length < 2) return 'neutral';

    const recentAvg = last30Days.slice(0, 15).reduce((sum, s) => sum + (s.focus_score || 0), 0) / Math.min(15, last30Days.length);
    const olderAvg = last30Days.slice(15).reduce((sum, s) => sum + (s.focus_score || 0), 0) / Math.max(1, last30Days.length - 15);

    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'neutral';
  }

  const maxMinutes = Math.max(...weeklyStats.map(d => d.totalMinutes), 1);
  const maxScore = 100;

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgFocusScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / completedSessions.length)
    : 0;
  const totalFocusTime = Math.round(sessions.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0) / 60);
  const driftStats = getDriftTypeBreakdown();
  const trend = getProductivityTrend();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 size={32} className="text-blue-600" />
            Focus Analytics
          </h1>
          <p className="text-gray-600 mt-1">Track your productivity trends and focus patterns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Target size={24} className="text-blue-600" />
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                trend === 'up' ? 'bg-green-100 text-green-700' :
                trend === 'down' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Stable'}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{avgFocusScore}</div>
            <div className="text-sm text-gray-600">Avg Focus Score</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Clock size={24} className="text-green-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">{totalFocusTime}h</div>
            <div className="text-sm text-gray-600">Total Focus Time</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Zap size={24} className="text-yellow-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <AlertTriangle size={24} className="text-red-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">{driftStats.avgDriftsPerSession}</div>
            <div className="text-sm text-gray-600">Avg Drifts/Session</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp size={24} />
            7-Day Focus Trend
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Focus Time (minutes)</h3>
              <div className="flex items-end gap-2 h-48">
                {weeklyStats.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100%' }}>
                      {day.totalMinutes > 0 && (
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all"
                          style={{ height: `${(day.totalMinutes / maxMinutes) * 100}%` }}
                          title={`${day.totalMinutes} minutes`}
                        />
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-600">{day.date}</div>
                    <div className="text-xs text-gray-500">{day.totalMinutes}m</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Focus Score</h3>
              <div className="flex items-end gap-2 h-32">
                {weeklyStats.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100%' }}>
                      {day.avgScore > 0 && (
                        <div
                          className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                            day.avgScore >= 80 ? 'bg-green-500' :
                            day.avgScore >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ height: `${(day.avgScore / maxScore) * 100}%` }}
                          title={`Score: ${day.avgScore}`}
                        />
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-600">{day.date}</div>
                    <div className="text-xs text-gray-500">{day.avgScore || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Session Distribution</h3>
            <div className="space-y-3">
              {weeklyStats.map((day, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{day.date}</span>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">{day.sessions} sessions</div>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(day.sessions, 5) }).map((_, j) => (
                        <div key={j} className="w-2 h-2 bg-blue-500 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Drift Patterns</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Drifts</span>
                <span className="text-2xl font-bold text-red-600">{driftStats.totalDrifts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Avg per Session</span>
                <span className="text-2xl font-bold text-orange-600">{driftStats.avgDriftsPerSession}</span>
              </div>
              <div className="text-sm text-gray-600 mt-4">
                {parseFloat(driftStats.avgDriftsPerSession) > 3 ? (
                  <p>Your drift rate is higher than ideal. Consider shorter sessions or clearer goals.</p>
                ) : parseFloat(driftStats.avgDriftsPerSession) > 1 ? (
                  <p>Good progress! Try to minimize context switching for better focus.</p>
                ) : (
                  <p>Excellent focus! Keep maintaining your current approach.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {sessions.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <BarChart3 size={48} className="text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-blue-900 mb-2">No data yet</h3>
            <p className="text-blue-700">Complete some focus sessions to see your analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
