/**
 * Phase 4: Network Resilience
 * 
 * Recovery UI component for network timeout errors.
 * Provides user-friendly error message and recovery actions.
 */

import { AlertCircle, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatusContext } from '../../contexts/NetworkStatusContext';

export interface NetworkTimeoutRecoveryProps {
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
   * Callback when user clicks reload
   */
  onReload?: () => void;
  
  /**
   * Whether to show network status indicator. Default: true
   */
  showNetworkStatus?: boolean;
}

/**
 * Recovery UI for network timeout errors.
 * 
 * @example
 * ```tsx
 * if (networkTimeout) {
 *   return (
 *     <NetworkTimeoutRecovery
 *       onRetry={() => {
 *         setLoading(true);
 *         fetchData().finally(() => setLoading(false));
 *       }}
 *       onReload={() => window.location.reload()}
 *     />
 *   );
 * }
 * ```
 */
export function NetworkTimeoutRecovery({
  message,
  timeoutSeconds = 10,
  onRetry,
  onReload,
  showNetworkStatus = true,
}: NetworkTimeoutRecoveryProps) {
  const { isOffline } = useNetworkStatusContext();
  const isOnline = !isOffline;
  
  const defaultMessage = `The request timed out after ${timeoutSeconds} seconds. This may be due to a slow network connection or server issue.`;
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Timeout</h2>
          <p className="text-gray-600">{message || defaultMessage}</p>
          
          {showNetworkStatus && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {isOnline ? (
                <>
                  <Wifi size={16} className="text-green-500" />
                  <span className="text-sm text-green-600">You're online</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-red-500" />
                  <span className="text-sm text-red-600">You're offline</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={!isOnline}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          )}
          
          <button
            onClick={handleReload}
            disabled={!isOnline}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Reload Page
          </button>
        </div>
        
        {!isOnline && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Please check your internet connection and try again.
            </p>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If this problem persists, try reloading the page or checking your network connection.
          </p>
        </div>
      </div>
    </div>
  );
}