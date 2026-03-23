/**
 * Phase 1: Critical Load Protection
 * 
 * Hook for managing loading states with automatic timeout protection.
 * Prevents infinite loading screens by automatically timing out after a configurable duration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseLoadingWithTimeoutOptions {
  /**
   * Timeout duration in milliseconds. Default: 10000 (10 seconds)
   */
  timeoutMs?: number;
  
  /**
   * Whether to show timeout warning before actual timeout. Default: true
   */
  showWarning?: boolean;
  
  /**
   * Warning threshold as percentage of timeout. Default: 0.8 (80% of timeout)
   */
  warningThreshold?: number;
  
  /**
   * Callback when timeout occurs
   */
  onTimeout?: () => void;
  
  /**
   * Callback when warning threshold reached
   */
  onWarning?: () => void;
}

export interface UseLoadingWithTimeoutReturn {
  /**
   * Current loading state
   */
  loading: boolean;
  
  /**
   * Whether timeout has occurred
   */
  timedOut: boolean;
  
  /**
   * Whether warning threshold has been reached
   */
  warning: boolean;
  
  /**
   * Function to set loading state
   */
  setLoading: (loading: boolean) => void;
  
  /**
   * Function to reset loading state and timeout
   */
  reset: () => void;
  
  /**
   * Elapsed time in milliseconds since loading started
   */
  elapsedTime: number;
}

/**
 * Hook for managing loading state with automatic timeout protection.
 * 
 * @example
 * ```tsx
 * const { loading, timedOut, setLoading, reset } = useLoadingWithTimeout({
 *   timeoutMs: 10000,
 *   onTimeout: () => {
 *     console.error('Loading timed out');
 *   }
 * });
 * ```
 */
export function useLoadingWithTimeout(
  options: UseLoadingWithTimeoutOptions = {}
): UseLoadingWithTimeoutReturn {
  const {
    timeoutMs = 10000,
    showWarning = true,
    warningThreshold = 0.8,
    onTimeout,
    onWarning,
  } = options;

  const [loading, setLoadingState] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [warning, setWarning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  // Reset function
  const reset = useCallback(() => {
    if (!mountedRef.current) return;
    
    // Clear all timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    setLoadingState(false);
    setTimedOut(false);
    setWarning(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  }, []);

  // Set loading function
  const setLoading = useCallback((newLoading: boolean) => {
    if (!mountedRef.current) return;
    
    if (newLoading) {
      // Start loading
      setLoadingState(true);
      setTimedOut(false);
      setWarning(false);
      setElapsedTime(0);
      startTimeRef.current = Date.now();
      
      // Clear any existing timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
      
      // Start elapsed time tracking
      elapsedIntervalRef.current = setInterval(() => {
        if (mountedRef.current && startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setElapsedTime(elapsed);
        }
      }, 100);
      
      // Set warning timeout
      if (showWarning) {
        const warningMs = timeoutMs * warningThreshold;
        warningTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setWarning(true);
            onWarning?.();
          }
        }, warningMs);
      }
      
      // Set main timeout
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setTimedOut(true);
          setLoadingState(false);
          
          // Clear elapsed time tracking
          if (elapsedIntervalRef.current) {
            clearInterval(elapsedIntervalRef.current);
            elapsedIntervalRef.current = null;
          }
          
          onTimeout?.();
        }
      }, timeoutMs);
    } else {
      // Stop loading
      setLoadingState(false);
      
      // Clear all timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      
      setWarning(false);
      startTimeRef.current = null;
    }
  }, [timeoutMs, showWarning, warningThreshold, onTimeout, onWarning]);

  return {
    loading,
    timedOut,
    warning,
    setLoading,
    reset,
    elapsedTime,
  };
}