import { useState } from 'react';
import { Pause, Play, Square, Clock, StickyNote, CheckSquare, Eye, AlertCircle, Zap } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { endFocusSession } from '../../../lib/guardrails/focus';
import { NotesEditor } from './NotesEditor';
import { MicroTaskList } from './MicroTaskList';
import { DistractionLogger } from './DistractionLogger';

interface FocusSessionViewProps {
  onEndSession: () => void;
  onExtendSession: () => void;
  trackName?: string | null;
  subtrackName?: string | null;
  taskTitle?: string | null;
  masterProjectId: string;
}

type TabId = 'focus' | 'notes' | 'tasks';

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
  { id: 'focus', label: 'Focus', icon: Eye },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

export function FocusSessionView({
  onEndSession,
  onExtendSession,
  trackName,
  subtrackName,
  taskTitle,
  masterProjectId,
}: FocusSessionViewProps) {
  const {
    activeSession,
    isPaused,
    timerSecondsRemaining,
    driftCount,
    distractionCount,
    driftActive,
    setIsPaused,
  } = useFocusSession();

  const [activeTab, setActiveTab] = useState<TabId>('focus');
  const [isEnding, setIsEnding] = useState(false);
  const [showDistractionLogger, setShowDistractionLogger] = useState(false);

  if (!activeSession) return null;

  const totalSeconds = activeSession.goal_minutes * 60;
  const elapsedSeconds = totalSeconds - timerSecondsRemaining;
  const progress = (elapsedSeconds / totalSeconds) * 100;

  const hours = Math.floor(timerSecondsRemaining / 3600);
  const minutes = Math.floor((timerSecondsRemaining % 3600) / 60);
  const seconds = timerSecondsRemaining % 60;

  const timeDisplay = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`text-4xl font-bold ${driftActive ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                {timeDisplay}
              </div>
              {isPaused && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
            {(trackName || subtrackName || taskTitle) && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  {trackName && <span className="font-medium">{trackName}</span>}
                  {subtrackName && (
                    <>
                      <span className="text-gray-400">/</span>
                      <span>{subtrackName}</span>
                    </>
                  )}
                </div>
                {taskTitle && <div className="text-xs text-gray-500 mt-0.5">Working on: {taskTitle}</div>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="text-xs text-gray-600">Drifts</div>
                <div className="text-lg font-bold text-gray-900">{driftCount}</div>
              </div>
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="text-xs text-gray-600">Distractions</div>
                <div className="text-lg font-bold text-gray-900">{distractionCount}</div>
              </div>
            </div>

            <button
              onClick={handlePauseResume}
              disabled={isEnding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPaused ? (
                <>
                  <Play size={18} />
                  Resume
                </>
              ) : (
                <>
                  <Pause size={18} />
                  Pause
                </>
              )}
            </button>

            <button
              onClick={onExtendSession}
              disabled={isEnding || isPaused}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Clock size={18} />
              Extend
            </button>

            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Square size={18} />
              {isEnding ? 'Ending...' : 'End'}
            </button>
          </div>
        </div>

        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              driftActive ? 'bg-red-500' : isPaused ? 'bg-blue-500' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex gap-1">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TabIcon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-white">
            {activeTab === 'focus' && (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-2xl w-full">
                  <div className="text-center mb-12">
                    <div className={`inline-block p-4 rounded-full mb-6 ${
                      driftActive ? 'bg-red-100' : isPaused ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Zap size={48} className={
                        driftActive ? 'text-red-600' : isPaused ? 'text-blue-600' : 'text-green-600'
                      } />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      {isPaused ? 'Session Paused' : driftActive ? 'Stay Focused' : 'You\'re in the zone!'}
                    </h2>
                    <p className="text-lg text-gray-600">
                      {isPaused
                        ? 'Take your time. Resume when ready.'
                        : driftActive
                        ? 'Looks like you drifted. Let\'s get back on track.'
                        : 'Keep up the great work. You\'ve got this.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setShowDistractionLogger(true)}
                      className="w-full px-6 py-4 bg-orange-50 text-orange-900 rounded-xl hover:bg-orange-100 transition-colors font-medium flex items-center justify-center gap-2 border border-orange-200"
                    >
                      <AlertCircle size={20} />
                      I Got Distracted
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900">{Math.floor(progress)}%</div>
                        <div className="text-xs text-gray-600 mt-1">Progress</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900">{activeSession.goal_minutes}m</div>
                        <div className="text-xs text-gray-600 mt-1">Goal</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <NotesEditor sessionId={activeSession.id} />
            )}

            {activeTab === 'tasks' && (
              <MicroTaskList
                sessionId={activeSession.id}
                trackId={activeSession.track_id}
                subtrackId={activeSession.subtrack_id}
                masterProjectId={masterProjectId}
              />
            )}
          </div>
        </div>

        {driftActive && (
          <div className="w-80 border-l border-gray-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-red-600" />
              <h3 className="font-semibold text-red-900">Drift Detected</h3>
            </div>
            <p className="text-sm text-red-800 mb-4">
              You've moved away from your focus area. Let's get back on track.
            </p>
            <button
              onClick={() => setShowDistractionLogger(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Log & Refocus
            </button>
          </div>
        )}
      </div>

      {showDistractionLogger && (
        <div className="fixed inset-0 z-50">
          <DistractionLogger />
          <button
            onClick={() => setShowDistractionLogger(false)}
            className="absolute top-4 right-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
