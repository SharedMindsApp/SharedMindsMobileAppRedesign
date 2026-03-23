import React from 'react';
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface AIErrorBannerProps {
  error: string | null;
  onRetry?: () => void;
  onContinueManually: () => void;
  onDismiss?: () => void;
  retriesRemaining?: number;
  isRetrying?: boolean;
}

export function AIErrorBanner({
  error,
  onRetry,
  onContinueManually,
  onDismiss,
  retriesRemaining = 0,
  isRetrying = false,
}: AIErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-amber-900 mb-1">
            AI Assistance Unavailable
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            {error}
          </p>
          <div className="flex flex-wrap gap-2">
            {onRetry && retriesRemaining > 0 && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-900 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Try Again ({retriesRemaining} left)
                  </>
                )}
              </button>
            )}
            <button
              onClick={onContinueManually}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
            >
              Continue Manually
              <ArrowRight className="w-4 h-4" />
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-auto text-sm text-amber-600 hover:text-amber-800 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AILoadingStateProps {
  message?: string;
}

export function AILoadingState({ message = 'AI is analyzing...' }: AILoadingStateProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="relative">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm font-medium text-blue-900">{message}</p>
    </div>
  );
}

interface AIDisabledNoticeProps {
  onReset?: () => void;
}

export function AIDisabledNotice({ onReset }: AIDisabledNoticeProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            AI Assistance Disabled
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            AI suggestions have been disabled for this session. You can continue creating your project manually.
          </p>
          {onReset && (
            <button
              onClick={onReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Start a new wizard session to re-enable AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
