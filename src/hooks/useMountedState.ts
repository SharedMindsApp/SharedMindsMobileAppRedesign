/**
 * Phase 2: Memory Leak Prevention
 * 
 * Hook to prevent state updates after component unmount.
 * Prevents React warnings and memory leaks from async operations.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that provides a safe state setter that won't update if component is unmounted.
 * 
 * @param initialState - Initial state value
 * @returns Tuple of [state, safeSetState, isMounted]
 * 
 * @example
 * ```tsx
 * const [data, setData, isMounted] = useMountedState(null);
 * 
 * useEffect(() => {
 *   fetchData().then((result) => {
 *     setData(result); // Safe - won't update if unmounted
 *   });
 * }, []);
 * 
 * if (!isMounted) {
 *   return null; // Component unmounted
 * }
 * ```
 */
export function useMountedState<T>(
  initialState: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(initialState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState, isMountedRef.current];
}

/**
 * Hook that returns whether the component is currently mounted.
 * Useful for checking mount status in async callbacks.
 * 
 * @returns Boolean indicating if component is mounted
 * 
 * @example
 * ```tsx
 * const isMounted = useIsMounted();
 * 
 * useEffect(() => {
 *   fetchData().then((result) => {
 *     if (isMounted()) {
 *       setData(result);
 *     }
 *   });
 * }, []);
 * ```
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}