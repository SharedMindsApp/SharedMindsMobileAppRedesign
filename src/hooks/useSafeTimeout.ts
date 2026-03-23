/**
 * Phase 2: Memory Leak Prevention
 * 
 * Safe timeout hook that automatically cleans up on unmount.
 * Prevents memory leaks from timers that aren't properly cleared.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for safely managing a timeout that automatically cleans up on unmount.
 * 
 * @param callback - Function to execute when timeout expires
 * @param delay - Delay in milliseconds (null to disable timeout)
 * @param deps - Optional dependency array (callback will be re-created if deps change)
 * 
 * @returns Object with clear and reset functions
 * 
 * @example
 * ```tsx
 * const { clear, reset } = useSafeTimeout(() => {
 *   console.log('Timeout expired');
 * }, 1000);
 * 
 * // Clear timeout manually if needed
 * clear();
 * 
 * // Reset timeout
 * reset();
 * ```
 */
export function useSafeTimeout(
  callback: () => void,
  delay: number | null,
  deps: React.DependencyList = []
): { clear: () => void; reset: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);

  // Update refs when they change
  useEffect(() => {
    callbackRef.current = callback;
    delayRef.current = delay;
  }, [callback, delay]);

  // Clear function
  const clear = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    clear();
    if (delayRef.current !== null && delayRef.current > 0) {
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, delayRef.current);
    }
  }, [clear]);

  // Set up timeout
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set new timeout if delay is provided
    if (delay !== null && delay > 0) {
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, delay);
    }

    // Cleanup on unmount or when deps change
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);

  return { clear, reset };
}