/**
 * Phase 1: Critical Load Protection
 * 
 * Recovery UI component for when loading operations timeout.
 * Provides user-friendly error message and recovery actions.
 */

import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

export interface TimeoutRecoveryProps {
  /**
   * Error message to display. If not provided, a default message is shown.
   */
  message?: string;
  
  /**
   * Timeout duration in seconds (for display purposes)
   */
  timeoutSeconds?: number;
  
  /**
   * Callback when user clicks retry
   */
  onRetry?: () => void;
  
  /**
   * Callback when user clicks reset
   */
  onReset?: () => void;
  
  /**
   * Callback when user clicks reload
   */
  onReload?: () => void;
  
  /**
   * Whether to show reset button. Default: true
   */
  showReset?: boolean;
  
  /**
   * Whether to show reload button. Default: true
   */
  showReload?: boolean;
  
  /**
   * Custom retry button text
   */
  retryText?: string;
  
  /**
   * Custom reset button text
   */
  resetText?: string;
  
  /**
   * Custom reload button text
   */
  reloadText?: string;
}

/**
 * Recovery UI for timeout errors.
 * 
 * @example
 * ```tsx
 * if (timedOut) {
 *   return (
 *     <TimeoutRecovery
 *       onRetry={() => {
 *         setLoading(true);
 *         fetchData().finally(() => setLoading(false));
 *       }}
 *       onReset={() => {
 *         clearCache();
 *         window.location.reload();
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function TimeoutRecovery({
  message,
  timeoutSeconds = 10,
  onRetry,
  onReset,
  onReload,
  showReset = true,
  showReload = true,
  retryText = 'Try Again',
  resetText = 'Reset',
  reloadText = 'Reload Page',
}: TimeoutRecoveryProps) {
  const defaultMessage = `This is taking longer than expected. The operation timed out after ${timeoutSeconds} seconds.`;
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };
  
  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };
  
  const handleReload = () => {
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Operation Timed Out</h2>
          <p className="text-gray-600">{message || defaultMessage}</p>
        </div>
        
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              {retryText}
            </button>
          )}
          
          {showReset && onReset && (
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              {resetText}
            </button>
          )}
          
          {showReload && (
            <button
              onClick={handleReload}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              {reloadText}
            </button>
          )}
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If this problem persists, try reloading the page or clearing your browser cache.
          </p>
        </div>
      </div>
    </div>
  );
}