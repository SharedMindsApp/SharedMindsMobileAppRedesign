/**
 * Phase 8: App Boot Reliability & Loading Clarity
 * 
 * Manages app boot state, timeout handling, and recovery mechanisms.
 * Ensures the app never hangs silently and always provides clear feedback.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AppBootStatus =
  | 'initializing'
  | 'loading-assets'
  | 'hydrating-session'
  | 'ready'
  | 'offline'
  | 'update-available'
  | 'fatal-error';

export interface AppBootState {
  status: AppBootStatus;
  bootStartTime: number;
  elapsedTime: number;
  error: Error | null;
  errorCode: string | null;
  serviceWorkerState: 'none' | 'registered' | 'controlling' | 'broken';
  networkType: 'unknown' | 'slow-2g' | '2g' | '3g' | '4g';
  isRetrying: boolean;
}

interface AppBootContextValue {
  state: AppBootState;
  setStatus: (status: AppBootStatus) => void;
  setError: (error: Error, code?: string) => void;
  setServiceWorkerState: (state: AppBootState['serviceWorkerState']) => void;
  setNetworkType: (type: AppBootState['networkType']) => void;
  retryBoot: () => void;
  resetApp: () => Promise<void>;
}

const AppBootContext = createContext<AppBootContextValue | null>(null);

const INITIAL_STATE: AppBootState = {
  status: 'initializing',
  bootStartTime: Date.now(),
  elapsedTime: 0,
  error: null,
  errorCode: null,
  serviceWorkerState: 'none',
  networkType: 'unknown',
  isRetrying: false,
};

// Phase 8: Boot timeout constants
const BOOT_TIMEOUT_MS = 5000; // 5 seconds
const LONG_LOADING_THRESHOLD_MS = 8000; // 8 seconds
const FATAL_ERROR_THRESHOLD_MS = 10000; // 10 seconds

export function AppBootProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppBootState>(INITIAL_STATE);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedTime: Date.now() - prev.bootStartTime,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Phase 8: Boot timeout guard - transition to fatal-error if stuck in initializing
  useEffect(() => {
    if (state.status === 'initializing' && state.elapsedTime >= BOOT_TIMEOUT_MS) {
      console.warn('[AppBoot] Boot timeout exceeded, transitioning to fatal-error');
      setState((prev) => ({
        ...prev,
        status: 'fatal-error',
        error: new Error('App initialization timed out'),
        errorCode: 'BOOT_TIMEOUT',
      }));
    }
  }, [state.status, state.elapsedTime]);

  // Phase 8: Detect network connection type
  useEffect(() => {
    const detectNetworkType = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const effectiveType = connection.effectiveType || 'unknown';
        setState((prev) => ({
          ...prev,
          networkType: effectiveType as AppBootState['networkType'],
        }));
      }
    };

    detectNetworkType();
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', detectNetworkType);
      return () => connection.removeEventListener('change', detectNetworkType);
    }
  }, []);

  // Phase 8: Detect offline state
  useEffect(() => {
    const handleOnline = () => {
      if (state.status === 'offline') {
        setState((prev) => ({ ...prev, status: 'initializing' }));
      }
    };

    const handleOffline = () => {
      if (state.status !== 'ready' && state.status !== 'fatal-error') {
        setState((prev) => ({ ...prev, status: 'offline' }));
      }
    };

    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.status]);

  // Phase 8B: Detect routing failures (404 responses, NOT_FOUND errors)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Phase 8B: Detect Vercel 404 or routing-related errors
      if (
        event.message?.includes('404') ||
        event.message?.includes('NOT_FOUND') ||
        event.error?.message?.includes('404') ||
        event.error?.message?.includes('NOT_FOUND')
      ) {
        console.warn('[AppBoot] Routing failure detected, attempting recovery');
        setState((prev) => {
          // Only transition to fatal-error if not already in a terminal state
          if (prev.status !== 'fatal-error' && prev.status !== 'ready') {
            return {
              ...prev,
              status: 'fatal-error',
              error: new Error('Route not found - app shell may need reload'),
              errorCode: 'ROUTING_FAILURE',
            };
          }
          return prev;
        });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const setStatus = useCallback((status: AppBootStatus) => {
    setState((prev) => {
      // FIXED: Allow recovery from fatal-error state
      // Previously, fatal-error was terminal and couldn't be recovered from
      // Now allow transitions from fatal-error to allow recovery actions
      if (prev.status === 'fatal-error' && status === 'initializing') {
        // Reset boot time when recovering from fatal error
        return {
          ...prev,
          status,
          bootStartTime: Date.now(),
          elapsedTime: 0,
          error: null,
          errorCode: null,
          isRetrying: false,
        };
      }
      if (prev.status === 'ready' && status === 'initializing') {
        // Reset boot time when restarting
        return {
          ...prev,
          status,
          bootStartTime: Date.now(),
          elapsedTime: 0,
          error: null,
          errorCode: null,
          isRetrying: false,
        };
      }
      return { ...prev, status };
    });
  }, []);

  const setError = useCallback((error: Error, code?: string) => {
    setState((prev) => ({
      ...prev,
      status: 'fatal-error',
      error,
      errorCode: code || 'UNKNOWN_ERROR',
    }));
  }, []);

  const setServiceWorkerState = useCallback((swState: AppBootState['serviceWorkerState']) => {
    setState((prev) => ({ ...prev, serviceWorkerState: swState }));
  }, []);

  const setNetworkType = useCallback((type: AppBootState['networkType']) => {
    setState((prev) => ({ ...prev, networkType: type }));
  }, []);

  const retryBoot = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      bootStartTime: Date.now(),
      isRetrying: true,
    });
    // Trigger a reload after a brief delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  const resetApp = useCallback(async () => {
    try {
      // FIXED: Use hardReset utility for comprehensive state clearing
      const { hardReset } = await import('../lib/hardReset');
      await hardReset({
        clearAuth: false, // Don't clear auth on app reset (only on logout)
        clearLocalStorage: true,
        clearSessionStorage: true,
        clearServiceWorkers: true,
        clearCaches: true,
        redirectTo: undefined, // Reload current page
        reload: true,
      });
    } catch (error) {
      console.error('[AppBoot] Error resetting app:', error);
      // Even if reset fails, try to reload
      try {
        window.location.reload();
      } catch {
        // Can't do anything more
      }
    }
  }, []);

  const value: AppBootContextValue = {
    state,
    setStatus,
    setError,
    setServiceWorkerState,
    setNetworkType,
    retryBoot,
    resetApp,
  };

  return <AppBootContext.Provider value={value}>{children}</AppBootContext.Provider>;
}

export function useAppBoot() {
  const context = useContext(AppBootContext);
  if (!context) {
    throw new Error('useAppBoot must be used within AppBootProvider');
  }
  return context;
}

// Phase 8: Export constants for use in other components
export const BOOT_TIMEOUT_MS_EXPORT = BOOT_TIMEOUT_MS;
export const LONG_LOADING_THRESHOLD_MS_EXPORT = LONG_LOADING_THRESHOLD_MS;
export const FATAL_ERROR_THRESHOLD_MS_EXPORT = FATAL_ERROR_THRESHOLD_MS;

