/**
 * Phase 2: Memory Leak Prevention
 * 
 * Safe interval hook that automatically cleans up on unmount.
 * Prevents memory leaks from intervals that aren't properly cleared.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for safely managing an interval that automatically cleans up on unmount.
 * 
 * @param callback - Function to execute on each interval
 * @param delay - Delay in milliseconds (null to disable interval)
 * @param deps - Optional dependency array (callback will be re-created if deps change)
 * 
 * @returns Object with clear and reset functions
 * 
 * @example
 * ```tsx
 * const { clear, reset } = useSafeInterval(() => {
 *   console.log('Interval tick');
 * }, 1000);
 * 
 * // Clear interval manually if needed
 * clear();
 * 
 * // Reset interval
 * reset();
 * ```
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null,
  deps: React.DependencyList = []
): { clear: () => void; reset: () => void } {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);

  // Update refs when they change
  useEffect(() => {
    callbackRef.current = callback;
    delayRef.current = delay;
  }, [callback, delay]);

  // Clear function
  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    clear();
    if (delayRef.current !== null && delayRef.current > 0) {
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, delayRef.current);
    }
  }, [clear]);

  // Set up interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set new interval if delay is provided
    if (delay !== null && delay > 0) {
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, delay);
    }

    // Cleanup on unmount or when deps change
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);

  return { clear, reset };
}