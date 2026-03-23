import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { checkRegulationRules, extendFocusSession, logRegulation } from '../../../lib/guardrails/focus';
import { registerFocusContext, unregisterFocusContext } from '../../../lib/guardrails/focusHelpers';
import { supabase } from '../../../lib/supabase';
import { FocusTimer } from './FocusTimer';
import { NudgeBanner } from './NudgeBanner';
import { DriftWarning } from './DriftWarning';
import { DistractionLogger } from './DistractionLogger';
import { RegulationPauseOverlay } from './RegulationPauseOverlay';

export function FocusModeLive() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
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

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [driftContext, setDriftContext] = useState<string>('');
  const [regulationPause, setRegulationPause] = useState<{
    type: 'hydrate' | 'stretch' | 'meal' | 'rest';
    message: string;
    delaySeconds?: number;
  } | null>(null);

  useEffect(() => {
    if (!activeProject) {
      navigate('/guardrails/dashboard?needProject=1');
      return;
    }

    if (!sessionId) {
      navigate('/guardrails/focus');
      return;
    }

    async function loadSession() {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        navigate('/guardrails/focus');
        return;
      }

      setActiveSession(data);
      await loadSessionEvents(data.id);
    }

    if (!activeSession || activeSession.id !== sessionId) {
      loadSession();
    }
  }, [sessionId, activeProject, navigate]);

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

  useEffect(() => {
    if (activeSession) {
      const nudgeInterval = setInterval(() => {
        if (!isPaused && !driftActive) {
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
      }, 5 * 60 * 1000);

      return () => clearInterval(nudgeInterval);
    }
  }, [activeSession, isPaused, driftActive, driftCount]);

  useEffect(() => {
    if (activeSession && !isPaused) {
      const regulationInterval = setInterval(async () => {
        try {
          const rule = await checkRegulationRules(activeSession.id);
          if (rule) {
            await logRegulation(
              activeSession.id,
              rule.rule_type || 'regulation',
              rule.message || 'Time for a break'
            );

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
      }, 60 * 1000);

      return () => clearInterval(regulationInterval);
    }
  }, [activeSession, isPaused]);

  async function handleExtendSession() {
    setShowExtendModal(true);
  }

  async function confirmExtend() {
    if (!activeSession) return;

    try {
      const updatedSession = await extendFocusSession(activeSession.id, extendMinutes);
      setActiveSession(updatedSession);
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

  if (!activeSession) {
    return null;
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
