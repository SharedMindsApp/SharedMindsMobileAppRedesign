import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Trophy, Clock, AlertTriangle, Bell, TrendingUp, ArrowRight, Home } from 'lucide-react';
import { getFocusSessionSummary, endFocusSession } from '../../../lib/guardrails/focus';
import type { FocusSessionSummary } from '../../../lib/guardrails/focusTypes';

export function SessionSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FocusSessionSummary | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSummary(sessionId);
    }
  }, [sessionId]);

  async function loadSummary(id: string) {
    try {
      const sessionSummary = await getFocusSessionSummary(id);

      if (!sessionSummary || !sessionSummary.session) {
        navigate('/guardrails/dashboard');
        return;
      }

      if (sessionSummary.session.status === 'active' || sessionSummary.session.status === 'paused') {
        await endFocusSession(id);
        const updatedSummary = await getFocusSessionSummary(id);
        setSummary(updatedSummary);
      } else {
        setSummary(sessionSummary);
      }
    } catch (error) {
      console.error('Failed to load session summary:', error);
      navigate('/guardrails/dashboard');
    } finally {
      setLoading(false);
    }
  }

  function handleStartNewSession() {
    navigate('/guardrails/focus');
  }

  function handleReturnToDashboard() {
    navigate('/guardrails/dashboard');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <button
            onClick={handleReturnToDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const actualDuration = summary.session.actual_duration_minutes || 0;

  const scoreColor = summary.focusScore >= 80
    ? 'text-green-600'
    : summary.focusScore >= 60
    ? 'text-yellow-600'
    : 'text-red-600';

  const scoreBg = summary.focusScore >= 80
    ? 'bg-green-50 border-green-200'
    : summary.focusScore >= 60
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-red-50 border-red-200';

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Session Complete!</h1>
          <p className="text-gray-600">Here's how you did</p>
        </div>

        <div className={`${scoreBg} border-2 rounded-2xl p-8 text-center`}>
          <p className="text-sm font-semibold text-gray-600 mb-2">FOCUS SCORE</p>
          <div className={`text-7xl font-bold ${scoreColor} mb-2`}>
            {summary.focusScore}
          </div>
          <p className="text-sm text-gray-600">
            {summary.focusScore >= 80 ? 'Excellent focus!' : summary.focusScore >= 60 ? 'Good effort!' : 'Keep improving!'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Clock size={32} className="text-blue-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{actualDuration}</div>
            <div className="text-sm text-gray-600">Minutes Focused</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <AlertTriangle size={32} className="text-red-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalDrifts}</div>
            <div className="text-sm text-gray-600">Total Drifts</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Bell size={32} className="text-orange-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.totalDistractions}</div>
            <div className="text-sm text-gray-600">Distractions Logged</div>
          </div>
        </div>

        {summary.timeline && summary.timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Session Timeline
            </h2>
            <div className="space-y-3">
              {summary.timeline.map((event, index) => {
                const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 font-mono mt-1">{time}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">{event.event_type.replace('_', ' ')}</div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          {event.metadata.message || JSON.stringify(event.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">Suggestions for Improvement</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            {summary.totalDrifts > 3 && (
              <li>• Try breaking your work into smaller, more manageable chunks</li>
            )}
            {summary.totalDistractions > 5 && (
              <li>• Consider putting your phone in another room during focus sessions</li>
            )}
            {summary.focusScore < 60 && (
              <li>• Start with shorter sessions (15-20 minutes) and gradually increase</li>
            )}
            {summary.focusScore >= 80 && (
              <li>• Great work! Consider extending your session duration for even more productivity</li>
            )}
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStartNewSession}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Start New Session
            <ArrowRight size={24} />
          </button>

          <button
            onClick={handleReturnToDashboard}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
          >
            <Home size={24} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
