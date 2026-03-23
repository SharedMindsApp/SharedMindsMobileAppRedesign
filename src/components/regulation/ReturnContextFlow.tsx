/**
 * Stage 4.4: Return Context Flow
 *
 * Lightweight 3-step flow for adding return context.
 * All steps optional, can exit anytime.
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  RETURN_REASON_LABELS,
  BEHAVIOR_PREFERENCE_LABELS,
  BEHAVIOR_PREFERENCE_DESCRIPTIONS,
  type ReturnReasonCategory,
  type ReturnBehaviorPreference,
  type ReturnContextInput,
} from '../../lib/regulation/returnTypes';

interface ReturnContextFlowProps {
  gapDays: number;
  onComplete: (input: ReturnContextInput) => void;
  onCancel: () => void;
}

type Step = 'reason' | 'note' | 'behavior';

export function ReturnContextFlow({ gapDays, onComplete, onCancel }: ReturnContextFlowProps) {
  const [step, setStep] = useState<Step>('reason');
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory | null>(null);
  const [userNote, setUserNote] = useState('');
  const [behaviorPreference, setBehaviorPreference] = useState<ReturnBehaviorPreference>('normal');

  const handleNext = () => {
    if (step === 'reason') {
      setStep('note');
    } else if (step === 'note') {
      setStep('behavior');
    }
  };

  const handleBack = () => {
    if (step === 'note') {
      setStep('reason');
    } else if (step === 'behavior') {
      setStep('note');
    }
  };

  const handleComplete = () => {
    onComplete({
      reason_category: reasonCategory || undefined,
      user_note: userNote.trim() || undefined,
      behavior_preference: behaviorPreference,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Add return context
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'reason' && (
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                What changed? (optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This helps provide context for the time away. Choose if you'd like.
              </p>

              <div className="space-y-2">
                {Object.entries(RETURN_REASON_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setReasonCategory(key as ReturnReasonCategory)}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                      reasonCategory === key
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'note' && (
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Anything you want to note? (optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Add any context that might be helpful. This is for you.
              </p>

              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Optional note..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {step === 'behavior' && (
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                How should Regulation behave for now? (optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You can adjust how signals appear during your return period.
              </p>

              <div className="space-y-3">
                {Object.entries(BEHAVIOR_PREFERENCE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setBehaviorPreference(key as ReturnBehaviorPreference)}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                      behaviorPreference === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {BEHAVIOR_PREFERENCE_DESCRIPTIONS[key as ReturnBehaviorPreference]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'reason' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip all
            </button>

            {step === 'behavior' ? (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
