/**
 * Stage 4.4: Return Banner
 *
 * Calm, non-interruptive banner shown once when user returns after absence.
 * Must not block anything. All actions optional.
 */

import { Info, X } from 'lucide-react';

interface ReturnBannerProps {
  gapDays: number;
  onAddContext: () => void;
  onSkip: () => void;
  onNotNow: () => void;
}

export function ReturnBanner({ gapDays, onAddContext, onSkip, onNotNow }: ReturnBannerProps) {
  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 mb-3">
            If you want, you can add context for the time you were away. This is optional.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onAddContext}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Add context
            </button>

            <button
              onClick={onSkip}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-md text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>

            <button
              onClick={onNotNow}
              className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={onNotNow}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
