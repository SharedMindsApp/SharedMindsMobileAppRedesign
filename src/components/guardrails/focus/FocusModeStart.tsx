import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, ArrowRight, X, Zap } from 'lucide-react';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { useActiveTrack } from '../../../contexts/ActiveTrackContext';
import { startFocusSession } from '../../../lib/guardrails/focus';
import { useForegroundTriggers } from '../../../contexts/ForegroundTriggersContext';

export function FocusModeStart() {
  const navigate = useNavigate();
  const { activeProject } = useActiveProject();
  const { activeTrackId, activeTrackName, activeTrackPath, activeTrackColor, clearActiveTrack } = useActiveTrack();
  const { emitContextEvent } = useForegroundTriggers();
  const [loading, setLoading] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(25);

  useEffect(() => {
    if (!activeProject) {
      navigate('/guardrails/dashboard?needProject=1');
    }
  }, [activeProject, navigate]);

  async function handleStartSession() {
    if (!activeProject) return;

    setLoading(true);
    try {
      const session = await startFocusSession(activeProject.id, goalMinutes);
      emitContextEvent('focus_mode_started');
      navigate(`/guardrails/focus/live?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start focus session. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!activeProject) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="max-w-md w-full space-y-4">
        {activeTrackId && (
          <div
            className="bg-white rounded-xl shadow-lg p-4 border-l-4"
            style={{ borderLeftColor: activeTrackColor || '#3B82F6' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">Current Focus Track:</span>
                  <span className="text-sm font-bold text-gray-900">{activeTrackName}</span>
                </div>
                {activeTrackPath.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span>Part of:</span>
                    <div className="flex items-center gap-1">
                      {activeTrackPath.slice(0, -1).map((part, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span>{part}</span>
                          {i < activeTrackPath.length - 2 && <ArrowRight size={12} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Sticking to this track will help maintain focus and drive progress.
                </p>
              </div>
              <button
                onClick={clearActiveTrack}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear track context"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Focus Mode Session</h1>
            <p className="text-gray-600">
              Working on: <span className="font-semibold">{activeProject.name}</span>
            </p>
          </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              Session Duration (minutes)
            </span>
            <input
              type="number"
              value={goalMinutes}
              onChange={(e) => setGoalMinutes(Number(e.target.value))}
              min={5}
              max={180}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
            />
          </label>

          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 45, 60].map(minutes => (
              <button
                key={minutes}
                onClick={() => setGoalMinutes(minutes)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  goalMinutes === minutes
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/interventions/use')}
          className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Zap size={20} />
          Available Interventions
        </button>

        <button
          onClick={handleStartSession}
          disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Starting...
            </>
          ) : (
            <>
              <Play size={24} />
              Start Session
            </>
          )}
        </button>

          <button
            onClick={() => navigate('/guardrails/dashboard')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
