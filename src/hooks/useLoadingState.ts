/**
 * Phase 1: Critical Load Protection
 * 
 * Simplified hook for loading state with timeout protection.
 * Wrapper around useLoadingWithTimeout for simpler use cases.
 */

import { useLoadingWithTimeout, UseLoadingWithTimeoutOptions } from './useLoadingWithTimeout';

export interface UseLoadingStateOptions extends Omit<UseLoadingWithTimeoutOptions, 'onTimeout' | 'onWarning'> {
  /**
   * Timeout duration in milliseconds. Default: 10000 (10 seconds)
   */
  timeoutMs?: number;
  
  /**
   * Whether to show timeout warning. Default: false
   */
  showWarning?: boolean;
}

export interface UseLoadingStateReturn {
  /**
   * Current loading state
   */
  loading: boolean;
  
  /**
   * Whether timeout has occurred
   */
  timedOut: boolean;
  
  /**
   * Function to set loading state
   */
  setLoading: (loading: boolean) => void;
  
  /**
   * Function to reset loading state and timeout
   */
  reset: () => void;
}

/**
 * Simplified hook for loading state with timeout protection.
 * 
 * @example
 * ```tsx
 * const { loading, timedOut, setLoading } = useLoadingState({
 *   timeoutMs: 5000
 * });
 * 
 * useEffect(() => {
 *   setLoading(true);
 *   fetchData().finally(() => setLoading(false));
 * }, []);
 * 
 * if (timedOut) {
 *   return <TimeoutRecovery onRetry={() => setLoading(true)} />;
 * }
 * ```
 */
export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { timeoutMs = 10000, showWarning = false } = options;
  
  const { loading, timedOut, setLoading, reset } = useLoadingWithTimeout({
    timeoutMs,
    showWarning,
  });
  
  return {
    loading,
    timedOut,
    setLoading,
    reset,
  };
}