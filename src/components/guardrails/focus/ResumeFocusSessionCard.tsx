import { Play, Square, Clock } from 'lucide-react';
import { endFocusSession } from '../../../lib/guardrails/focus';
import { supabase } from '../../../lib/supabase';

interface ResumeFocusSessionCardProps {
  sessionId: string;
  timeRemaining: number;
  onResume: () => void;
  onEnd: () => void;
}

export function ResumeFocusSessionCard({ sessionId, timeRemaining, onResume, onEnd }: ResumeFocusSessionCardProps) {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  const timeDisplay = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  async function handleEndSession() {
    try {
      await endFocusSession(sessionId);
      onEnd();
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to end session. Please try again.');
    }
  }

  async function handleExtend(minutes: number) {
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('target_end_time')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const newTargetTime = new Date(data.target_end_time);
      newTargetTime.setMinutes(newTargetTime.getMinutes() + minutes);

      await supabase
        .from('focus_sessions')
        .update({ target_end_time: newTargetTime.toISOString() })
        .eq('id', sessionId);

      onResume();
    } catch (error) {
      console.error('Failed to extend session:', error);
      alert('Failed to extend session. Please try again.');
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl p-8 border-2 border-blue-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Clock size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Focus Session</h2>
        <p className="text-gray-700">You have a session in progress</p>
      </div>

      <div className="bg-white rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {timeDisplay}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onResume}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
        >
          <Play size={24} />
          Resume Session
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleExtend(10)}
            className="px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 font-medium text-sm"
          >
            + 10 minutes
          </button>
          <button
            onClick={() => handleExtend(25)}
            className="px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 font-medium text-sm"
          >
            + 25 minutes
          </button>
        </div>

        <button
          onClick={handleEndSession}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Square size={20} />
          End Session
        </button>
      </div>
    </div>
  );
}
