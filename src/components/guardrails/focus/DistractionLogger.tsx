import { useState } from 'react';
import { Bell, Smartphone, MessageCircle, Coffee, MoreHorizontal, X } from 'lucide-react';
import { logDistractionStructured } from '../../../lib/guardrails/focus';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import type { DistractionType } from '../../../lib/guardrails/focusTypes';

const distractionTypes: Array<{ id: DistractionType; label: string; Icon: any }> = [
  { id: 'phone', label: 'Phone', Icon: Smartphone },
  { id: 'social_media', label: 'Social Media', Icon: MessageCircle },
  { id: 'conversation', label: 'Conversation', Icon: MessageCircle },
  { id: 'snack', label: 'Snack', Icon: Coffee },
  { id: 'other', label: 'Other', Icon: MoreHorizontal },
];

export function DistractionLogger() {
  const { activeSession, addSessionEvent } = useFocusSession();
  const [expanded, setExpanded] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  async function handleLogDistraction(type: DistractionType, description?: string) {
    if (!activeSession) return;

    setIsLogging(true);
    try {
      await logDistractionStructured({
        sessionId: activeSession.id,
        type,
        notes: description,
      });

      setExpanded(false);
      setShowOtherInput(false);
      setOtherText('');

      setTimeout(() => {
        setIsLogging(false);
      }, 500);
    } catch (error) {
      console.error('Failed to log distraction:', error);
      setIsLogging(false);
    }
  }

  function handleOtherClick() {
    setShowOtherInput(true);
  }

  function handleOtherSubmit() {
    if (otherText.trim()) {
      handleLogDistraction('other', otherText.trim());
    }
  }

  if (!activeSession) return null;

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {expanded ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Log Distraction</h3>
            <button
              onClick={() => {
                setExpanded(false);
                setShowOtherInput(false);
                setOtherText('');
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {!showOtherInput ? (
            <div className="grid grid-cols-2 gap-3">
              {distractionTypes.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => id === 'other' ? handleOtherClick() : handleLogDistraction(id)}
                  disabled={isLogging}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Icon size={24} className="text-gray-600 group-hover:text-gray-900 transition-colors" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="What distracted you?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleOtherSubmit();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleOtherSubmit}
                  disabled={isLogging || !otherText.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLogging ? 'Logging...' : 'Log'}
                </button>
                <button
                  onClick={() => {
                    setShowOtherInput(false);
                    setOtherText('');
                  }}
                  disabled={isLogging}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {isLogging && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-green-600 font-semibold">Logged!</div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center group"
        >
          <Bell size={24} className="group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}
