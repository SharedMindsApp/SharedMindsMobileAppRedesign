import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, X, Clock } from 'lucide-react';
import type { ActiveSignal } from '../../lib/regulation/signalTypes';

interface SignalCardStage4_1Props {
  signal: ActiveSignal;
  onDismiss: (signalId: string) => void;
}

export function SignalCardStage4_1({ signal, onDismiss }: SignalCardStage4_1Props) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getTimeAgo = (dateString: string): string => {
    const now = new Date().getTime();
    const detected = new Date(dateString).getTime();
    const diffMinutes = Math.floor((now - detected) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Info className="w-5 h-5 text-gray-600" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium text-gray-900 text-base">
                  {signal.title}
                </h3>
                <button
                  onClick={() => onDismiss(signal.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Dismiss this signal"
                  aria-label="Dismiss signal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{getTimeAgo(signal.detected_at)}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                {signal.description}
              </p>
            </div>

            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {showExplanation ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide why this showed
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Why this showed
                </>
              )}
            </button>

            {showExplanation && (
              <div className="bg-blue-50 rounded-md p-4 border border-blue-100">
                <div className="prose prose-sm max-w-none">
                  {signal.explanation_why.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
