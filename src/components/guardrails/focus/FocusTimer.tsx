import { useState } from 'react';
import { Pause, Play, Square, Clock } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { endFocusSession } from '../../../lib/guardrails/focus';

interface FocusTimerProps {
  onEndSession: () => void;
  onExtendSession: () => void;
}

export function FocusTimer({ onEndSession, onExtendSession }: FocusTimerProps) {
  const {
    activeSession,
    isPaused,
    timerSecondsRemaining,
    driftActive,
    setIsPaused,
  } = useFocusSession();

  const [isEnding, setIsEnding] = useState(false);

  if (!activeSession) return null;

  const totalSeconds = activeSession.goal_minutes * 60;
  const elapsedSeconds = totalSeconds - timerSecondsRemaining;
  const progress = (elapsedSeconds / totalSeconds) * 100;

  const hours = Math.floor(timerSecondsRemaining / 3600);
  const minutes = Math.floor((timerSecondsRemaining % 3600) / 60);
  const seconds = timerSecondsRemaining % 60;

  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMinutes = Math.floor((elapsedSeconds % 3600) / 60);

  const timeDisplay = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  const elapsedDisplay = elapsedHours > 0
    ? `${elapsedHours}h ${elapsedMinutes}m`
    : `${elapsedMinutes}m`;

  async function handleEndSession() {
    if (!activeSession) return;

    setIsEnding(true);
    try {
      await endFocusSession(activeSession.id);
      onEndSession();
    } catch (error) {
      console.error('Failed to end session:', error);
      setIsEnding(false);
    }
  }

  function handlePauseResume() {
    setIsPaused(!isPaused);
  }

  const ringColor = driftActive
    ? 'stroke-red-500'
    : isPaused
    ? 'stroke-blue-500'
    : 'stroke-green-500';

  const ringAnimation = driftActive
    ? 'animate-pulse'
    : isPaused
    ? 'animate-pulse'
    : '';

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8">
      <div className="relative">
        <svg width="320" height="320" className={ringAnimation}>
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            className={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 140}`}
            strokeDashoffset={`${2 * Math.PI * 140 * (1 - progress / 100)}`}
            transform="rotate(-90 160 160)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-gray-900 mb-2">
            {timeDisplay}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Remaining
          </div>
          <div className="text-xs text-gray-500">
            {elapsedDisplay} elapsed
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-center">
        <div className="px-6 py-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{activeSession.drift_count || 0}</div>
          <div className="text-xs text-gray-600 mt-1">Drifts</div>
        </div>
        <div className="px-6 py-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{activeSession.distraction_count || 0}</div>
          <div className="text-xs text-gray-600 mt-1">Distractions</div>
        </div>
        <div className="px-6 py-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{activeSession.intended_duration_minutes || 0}</div>
          <div className="text-xs text-gray-600 mt-1">Goal (min)</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handlePauseResume}
          disabled={isEnding}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPaused ? (
            <>
              <Play size={20} />
              Resume
            </>
          ) : (
            <>
              <Pause size={20} />
              Pause
            </>
          )}
        </button>

        <button
          onClick={onExtendSession}
          disabled={isEnding || isPaused}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock size={20} />
          Extend
        </button>

        <button
          onClick={handleEndSession}
          disabled={isEnding}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Square size={20} />
          {isEnding ? 'Ending...' : 'End Session'}
        </button>
      </div>

      {isPaused && (
        <div className="text-center">
          <p className="text-sm text-blue-600 font-medium">Session Paused</p>
          <p className="text-xs text-gray-600 mt-1">Timer is frozen. Click Resume to continue.</p>
        </div>
      )}
    </div>
  );
}
