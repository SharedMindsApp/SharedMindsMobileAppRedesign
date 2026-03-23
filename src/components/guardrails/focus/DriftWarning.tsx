import { useState } from 'react';
import { AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import { resolveDrift } from '../../../lib/guardrails/focus';
import { useFocusSession } from '../../../contexts/FocusSessionContext';

interface DriftWarningProps {
  driftContext: string;
  onResolved: () => void;
}

export function DriftWarning({ driftContext, onResolved }: DriftWarningProps) {
  const { activeSession, setDriftActive } = useFocusSession();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  async function handleReturn(includeNote: boolean = false) {
    if (!activeSession) return;

    setIsResolving(true);
    try {
      await resolveDrift(
        activeSession.id,
        includeNote && note ? note : undefined
      );
      setDriftActive(false);
      onResolved();
    } catch (error) {
      console.error('Failed to resolve drift:', error);
      setIsResolving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border-4 border-red-500 animate-in zoom-in duration-300">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">You've Drifted Off Focus</h2>
              <p className="text-sm text-gray-600 mt-1">Let's get you back on track</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">
              <span className="font-semibold">You switched to:</span> {driftContext}
            </p>
          </div>

          {!showNoteInput ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleReturn(false)}
                disabled={isResolving}
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={24} />
                Return to Main Project
              </button>

              <button
                onClick={() => setShowNoteInput(true)}
                disabled={isResolving}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={20} />
                Log a Note First
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why did you drift? What were you thinking about?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleReturn(true)}
                  disabled={isResolving || !note.trim()}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolving ? 'Saving...' : 'Save & Return'}
                </button>
                <button
                  onClick={() => setShowNoteInput(false)}
                  disabled={isResolving}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
