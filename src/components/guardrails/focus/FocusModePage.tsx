/**
 * Phase 2: Memory Leak Prevention - Using safe hooks for timers
 */

import { useEffect, useState, useCallback } from 'react';
import { useSafeInterval } from '../../../hooks/useSafeInterval';
import { useIsMounted } from '../../../hooks/useMountedState';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { startFocusSession, detectDrift, checkRegulationRules } from '../../../lib/guardrails/focus';
import { registerFocusContext, unregisterFocusContext } from '../../../lib/guardrails/focusHelpers';
import { supabase } from '../../../lib/supabase';
import { FocusTimer } from './FocusTimer';
import { NudgeBanner } from './NudgeBanner';
import { DriftWarning } from './DriftWarning';
import { DistractionLogger } from './DistractionLogger';
import { RegulationPauseOverlay } from './RegulationPauseOverlay';

export function FocusModePage() {
  const navigate = useNavigate();
  const { activeProject } = useActiveProject();
  const focusSession = useFocusSession();
  const {
    activeSession,
    isPaused,
    driftActive,
    pendingNudge,
    driftCount,
    setActiveSession,
    setPendingNudge,
    setDriftActive,
    setIsPaused,
    loadSessionEvents,
    addSessionEvent,
  } = focusSession;

  const [loading, setLoading] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(25);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [driftContext, setDriftContext] = useState<string>('');
  const [regulationPause, setRegulationPause] = useState<{
    type: 'hydrate' | 'stretch' | 'meal' | 'rest';
    message: string;
    delaySeconds?: number;
  } | null>(null);
  
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!activeProject) {
      navigate('/guardrails/dashboard?needProject=1');
    }
  }, [activeProject, navigate]);

  useEffect(() => {
    if (activeSession && activeProject) {
      registerFocusContext({
        activeSession,
        activeProjectId: activeProject.id,
        setDriftActive,
        setDriftContext,
        setPendingNudge,
        addSessionEvent,
      });

      return () => {
        unregisterFocusContext();
      };
    }
  }, [activeSession, activeProject]);

  // Phase 2: Load session events when session changes
  useEffect(() => {
    if (activeSession) {
      loadSessionEvents(activeSession.id);
    }
  }, [activeSession]);

  // Phase 2: Use safe interval for nudge reminders
  const handleNudgeCheck = useCallback(() => {
    if (!isPaused && !driftActive && activeSession) {
      if (driftCount > 2) {
        setPendingNudge({
          type: 'hard',
          message: 'You\'ve drifted multiple times. Refocus on your main project!',
        });
      } else {
        setPendingNudge({
          type: 'soft',
          message: 'You\'re doing great! Stay on track.',
        });
      }
    }
  }, [isPaused, driftActive, driftCount, activeSession]);

  useSafeInterval(
    handleNudgeCheck,
    activeSession ? 5 * 60 * 1000 : null,
    [activeSession?.id, isPaused, driftActive, driftCount]
  );

  // Phase 2: Use safe interval for regulation checks
  const handleRegulationCheck = useCallback(async () => {
    if (!activeSession || isPaused || !isMounted()) return;
    
    try {
      const rule = await checkRegulationRules(activeSession.id);
      if (rule && isMounted()) {
        setRegulationPause({
          type: rule.rule_type as 'hydrate' | 'stretch' | 'meal' | 'rest',
          message: rule.message || 'Time for a break',
          delaySeconds: rule.mandatory_delay_seconds,
        });
        setIsPaused(true);
        setPendingNudge({
          type: 'regulation',
          message: rule.message || 'Required pause triggered',
        });
      }
    } catch (error) {
      console.error('Failed to check regulation rules:', error);
    }
  }, [activeSession, isPaused, isMounted]);

  useSafeInterval(
    handleRegulationCheck,
    activeSession && !isPaused ? 60 * 1000 : null,
    [activeSession?.id, isPaused]
  );

  async function handleStartSession() {
    if (!activeProject) return;

    setLoading(true);
    try {
      const session = await startFocusSession(activeProject.id, goalMinutes);
      setActiveSession(session);
      await loadSessionEvents(session.id);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start focus session. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExtendSession() {
    setShowExtendModal(true);
  }

  async function confirmExtend() {
    if (!activeSession) return;

    const newTargetTime = new Date(activeSession.target_end_time);
    newTargetTime.setMinutes(newTargetTime.getMinutes() + extendMinutes);

    try {
      const { error } = await supabase
        .from('focus_sessions')
        .update({ target_end_time: newTargetTime.toISOString() })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession({
        ...activeSession,
        target_end_time: newTargetTime.toISOString(),
      });
      setShowExtendModal(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      alert('Failed to extend session. Please try again.');
    }
  }

  function handleEndSession() {
    if (activeSession) {
      navigate(`/guardrails/focus/summary/${activeSession.id}`);
    }
  }

  function handleDriftResolved() {
    setPendingNudge(null);
    setDriftContext('');
  }

  function handleRegulationResume() {
    setRegulationPause(null);
    setIsPaused(false);
    setPendingNudge(null);
  }

  if (!activeProject) {
    return null;
  }

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Focus Session</h1>
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
            onClick={handleStartSession}
            disabled={loading || goalMinutes < 5}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
    );
  }

  return (
    <div className="min-h-full">
      {pendingNudge && (
        <NudgeBanner
          type={pendingNudge.type}
          message={pendingNudge.message}
          onAcknowledge={() => setPendingNudge(null)}
        />
      )}

      {driftActive && driftContext && (
        <DriftWarning
          driftContext={driftContext}
          onResolved={handleDriftResolved}
        />
      )}

      {regulationPause && (
        <RegulationPauseOverlay
          regulationType={regulationPause.type}
          message={regulationPause.message}
          mandatoryDelaySeconds={regulationPause.delaySeconds}
          onResume={handleRegulationResume}
        />
      )}

      <div className="py-8">
        <FocusTimer
          onEndSession={handleEndSession}
          onExtendSession={handleExtendSession}
        />
      </div>

      <DistractionLogger />

      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Extend Session</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add minutes
              </label>
              <input
                type="number"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmExtend}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Extend
              </button>
              <button
                onClick={() => setShowExtendModal(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
