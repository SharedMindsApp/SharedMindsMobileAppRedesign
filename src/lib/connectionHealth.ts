/**
 * Connection Health Monitor
 * 
 * Event-driven connection health monitoring with low-frequency safety timer.
 * Checks run on: app resume, network reconnect, realtime silence, or optional background timer.
 * 
 * Battery-friendly and network-efficient for mobile + realtime apps.
 */

import { supabase } from './supabase';
import { logError, logWarning, logInfo } from './errorLogger';

// Timing constants
const SAFETY_TIMER_INTERVAL = 15 * 60 * 1000; // 15 minutes (optional safety net - very slow)
const MIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes minimum between checks (increased to prevent excessive checks)
const REALTIME_SILENCE_THRESHOLD = 5 * 60 * 1000; // 5 minutes of silence before checking (increased to reduce checks)
const REALTIME_SILENCE_CHECK_INTERVAL = 10 * 60 * 1000; // Check for silence every 10 minutes (reduced frequency)
const SESSION_REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000; // 10 minutes before expiry (less aggressive)
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay

// State management
let safetyTimerInterval: NodeJS.Timeout | null = null;
let realtimeSilenceTimer: NodeJS.Timeout | null = null;
let healthCheckCleanup: (() => void) | null = null;
let isMonitoring = false;
let isChecking = false; // Overlap protection
let retryAttempts = 0;
let lastHealthCheck: number | null = null;
let lastSuccessfulCheck: number | null = null;
let connectionStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
let lastRealtimeActivity: number = Date.now(); // Track last realtime event

export interface ConnectionHealthState {
  isHealthy: boolean;
  lastCheck: number | null;
  retryAttempts: number;
  status: 'healthy' | 'degraded' | 'offline';
}

type HealthCheckCallback = (state: ConnectionHealthState) => void;

const healthCheckCallbacks: Set<HealthCheckCallback> = new Set();

/**
 * Notify all subscribers of health state change
 * Only notifies if the status actually changed to prevent unnecessary re-renders
 */
function notifyHealthState(newState: ConnectionHealthState, previousStatus?: 'healthy' | 'degraded' | 'offline'): void {
  // Only notify if status actually changed
  if (previousStatus !== undefined && previousStatus === newState.status) {
    return;
  }

  healthCheckCallbacks.forEach(callback => {
    try {
      callback(newState);
    } catch (error) {
      logError(
        'Error in health check callback',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ConnectionHealth',
          action: 'notifyHealthState',
        }
      );
    }
  });
}

/**
 * Perform a health check by attempting a lightweight API call
 * Protected against overlaps and churn with cooldown and state change detection
 */
async function performHealthCheck(trigger?: string): Promise<boolean> {
  // Overlap protection: only one check at a time
  if (isChecking) {
    logInfo('Health check already in progress, skipping', {
      component: 'ConnectionHealth',
      action: 'performHealthCheck',
      trigger: trigger || 'unknown',
    });
    return false;
  }

  // Cooldown protection: don't check too frequently
  const now = Date.now();
  if (lastHealthCheck !== null && (now - lastHealthCheck) < MIN_COOLDOWN_MS) {
    logInfo('Health check skipped due to cooldown', {
      component: 'ConnectionHealth',
      action: 'performHealthCheck',
      trigger: trigger || 'unknown',
      timeSinceLastCheck: `${Math.floor((now - lastHealthCheck) / 1000)}s`,
    });
    return false;
  }

  isChecking = true;
  const previousStatus = connectionStatus;

  try {
    // Use a lightweight check - get current session
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      ),
    ]) as { data: { session: any } | null; error: any };

    if (error) {
      logWarning('Health check failed', {
        component: 'ConnectionHealth',
        action: 'performHealthCheck',
        trigger: trigger || 'unknown',
        error: error.message || String(error),
      });
      
      retryAttempts++;
      const nextStatus = retryAttempts >= 3
        ? (navigator.onLine ? 'degraded' : 'offline')
        : 'degraded';
      
      lastHealthCheck = Date.now();
      connectionStatus = nextStatus;
      
      // Only notify if status changed
      notifyHealthState({
        isHealthy: false,
        lastCheck: lastHealthCheck,
        retryAttempts,
        status: nextStatus,
      }, previousStatus);
      
      isChecking = false;
      return false;
    }

    // If we have a session, check if it's close to expiring
    if (data?.session) {
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      
      if (expiresAt) {
        const timeUntilExpiry = expiresAt - Date.now();
        
        // If session expires within refresh window, proactively refresh
        // Only refresh if session is actually close to expiring (not just within window)
        // This prevents unnecessary refresh attempts on every health check
        if (timeUntilExpiry > 0 && timeUntilExpiry < SESSION_REFRESH_BEFORE_EXPIRY && timeUntilExpiry > 2 * 60 * 1000) {
          try {
            // Use a timeout to prevent hanging on refresh
            const refreshPromise = supabase.auth.refreshSession(session);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Session refresh timeout')), 10000)
            );
            
            await Promise.race([refreshPromise, timeoutPromise]);
            
            logInfo('Proactively refreshed session before expiry', {
              component: 'ConnectionHealth',
              action: 'refreshSession',
              trigger: trigger || 'unknown',
              timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000)}s`,
            });
          } catch (refreshError) {
            // Don't treat refresh failures as critical - session might still be valid
            // Only log warning, don't change connection status unless it's a critical error
            const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
            const isTimeout = errorMessage.includes('timeout');
            const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch');
            
            if (!isTimeout && !isNetworkError) {
              // Only log non-network errors as warnings
              logWarning('Session refresh failed (non-critical)', {
                component: 'ConnectionHealth',
                action: 'refreshSession',
                trigger: trigger || 'unknown',
                timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000)}s`,
                error: errorMessage,
              });
            }
            // Don't change connection status or retry attempts for refresh failures
            // The session might still be valid, just couldn't refresh proactively
          }
        }
      }
    }

    // Success: reset retry attempts and update status
    lastHealthCheck = Date.now();
    lastSuccessfulCheck = Date.now();
    retryAttempts = 0;
    connectionStatus = 'healthy';
    
    // Only notify if status changed
    const statusChanged = previousStatus !== 'healthy';
    notifyHealthState({
      isHealthy: true,
      lastCheck: lastHealthCheck,
      retryAttempts: 0,
      status: 'healthy',
    }, previousStatus);
    
    // Only log if status changed (recovered from degraded/offline), not routine checks
    if (statusChanged) {
      logInfo('Health check successful', {
        component: 'ConnectionHealth',
        action: 'performHealthCheck',
        trigger: trigger || 'unknown',
        statusChanged,
      });
    }
    
    isChecking = false;
    return true;
  } catch (error) {
    retryAttempts++;
    logError(
      'Health check error',
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'ConnectionHealth',
        action: 'performHealthCheck',
        trigger: trigger || 'unknown',
        retryAttempts,
      }
    );
    
    // Determine connection status based on retry attempts
    const nextStatus = retryAttempts >= 3
      ? (navigator.onLine ? 'degraded' : 'offline')
      : 'degraded';

    lastHealthCheck = Date.now();
    connectionStatus = nextStatus;

    // Only notify if status changed
    notifyHealthState({
      isHealthy: false,
      lastCheck: lastHealthCheck,
      retryAttempts,
      status: nextStatus,
    }, previousStatus);
    
    isChecking = false;
    return false;
  }
}

/**
 * Exponential backoff retry for failed operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = INITIAL_RETRY_DELAY,
  context?: { component?: string; action?: string }
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or client errors (4xx)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500 && status !== 408) {
          logWarning(`Operation failed with client error (${status}), not retrying`, {
            ...context,
            action: context?.action || 'retryWithBackoff',
            attempt,
            maxRetries,
            status,
          });
          throw error; // Don't retry client errors
        }
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          MAX_RETRY_DELAY
        );
        
        logWarning(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          ...context,
          action: context?.action || 'retryWithBackoff',
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logError(
          `Operation failed after ${maxRetries} retries`,
          error instanceof Error ? error : new Error(String(error)),
          {
            ...context,
            action: context?.action || 'retryWithBackoff',
            attempts: maxRetries,
          }
        );
      }
    }
  }

  throw lastError;
}

/**
 * Check if we should run the optional safety timer
 * Only runs if app is active and no recent successful check occurred
 */
function shouldRunSafetyTimer(): boolean {
  // Don't run if app is in background
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return false;
  }

  // Don't run if a check is already in progress
  if (isChecking) {
    return false;
  }

  // Don't run if we had a successful check recently (within safety timer interval)
  const now = Date.now();
  if (lastSuccessfulCheck !== null && (now - lastSuccessfulCheck) < SAFETY_TIMER_INTERVAL) {
    return false;
  }

  // Don't run if we just checked recently (cooldown)
  if (lastHealthCheck !== null && (now - lastHealthCheck) < MIN_COOLDOWN_MS) {
    return false;
  }

  return true;
}

/**
 * Safety timer handler (optional background check)
 * Only runs if all conditions are met (app visible, not checking, no recent successful check)
 */
function handleSafetyTimer(): void {
  if (!shouldRunSafetyTimer()) {
    return;
  }

  logInfo('Safety timer triggered health check', {
    component: 'ConnectionHealth',
    action: 'handleSafetyTimer',
    timeSinceLastCheck: lastHealthCheck ? `${Math.floor((Date.now() - lastHealthCheck) / 1000)}s` : 'never',
    timeSinceLastSuccess: lastSuccessfulCheck ? `${Math.floor((Date.now() - lastSuccessfulCheck) / 1000)}s` : 'never',
  });
  
  performHealthCheck('safety-timer');
}

/**
 * Check for realtime silence and trigger health check if needed
 * Only triggers if connection is not healthy AND we've had silence for the threshold
 */
function checkRealtimeSilence(): void {
  // Don't check if already checking or if cooldown hasn't passed
  if (isChecking) {
    return;
  }

  const now = Date.now();
  if (lastHealthCheck !== null && (now - lastHealthCheck) < MIN_COOLDOWN_MS) {
    return;
  }

  const silenceDuration = now - lastRealtimeActivity;

  // Only check if we've had silence AND connection is not healthy
  if (silenceDuration >= REALTIME_SILENCE_THRESHOLD && connectionStatus !== 'healthy') {
    logInfo('Realtime silence detected, performing health check', {
      component: 'ConnectionHealth',
      action: 'checkRealtimeSilence',
      silenceDuration: `${Math.floor(silenceDuration / 1000)}s`,
      currentStatus: connectionStatus,
    });
    performHealthCheck('realtime-silence');
  }
}

/**
 * Record realtime activity (call this when realtime events are received)
 */
export function recordRealtimeActivity(): void {
  lastRealtimeActivity = Date.now();
  // Don't set up a new timer here - the timer is already set up in startHealthMonitoring
}

/**
 * Start monitoring connection health (event-driven, low-frequency)
 */
export function startHealthMonitoring(): void {
  if (isMonitoring) {
    logWarning('Health monitoring already started', {
      component: 'ConnectionHealth',
      action: 'startHealthMonitoring',
    });
    return;
  }

  isMonitoring = true;
  retryAttempts = 0;
  lastRealtimeActivity = Date.now();
  
  // Removed verbose logging - only log errors or important state changes
  // Perform initial health check
  performHealthCheck('initial');

  // Optional safety timer: only runs if app is active and no recent successful check
  // This is a "seatbelt" check, not the primary mechanism
  // Run the timer check less frequently than the interval itself
  safetyTimerInterval = setInterval(() => {
    handleSafetyTimer();
  }, SAFETY_TIMER_INTERVAL);

  // Event 1: App/Tab Resume (visibilitychange)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      logInfo('App resumed, performing health check', {
        component: 'ConnectionHealth',
        action: 'visibilitychange',
      });
      performHealthCheck('app-resume');
    }
  };

  // Event 2: Network Reconnect (online)
  const handleOnline = () => {
    logInfo('Network came online, performing health check', {
      component: 'ConnectionHealth',
      action: 'network.online',
    });
    performHealthCheck('network-reconnect');
    
    // Phase 4: Trigger retry queue processing when connection restored
    if (typeof window !== 'undefined') {
      // Dynamically import to avoid circular dependency
      import('./connectionHealthRetryQueue').then(({ processRetryQueue }) => {
        processRetryQueue();
      }).catch(() => {
        // Retry queue module not available, skip
      });
    }
  };

  // Event 3: Network Offline (update status immediately, no check needed)
  const handleOffline = () => {
    logWarning('Network went offline', {
      component: 'ConnectionHealth',
      action: 'network.offline',
    });
    const previousStatus = connectionStatus;
    connectionStatus = 'offline';
    lastHealthCheck = Date.now();
    notifyHealthState({
      isHealthy: false,
      lastCheck: lastHealthCheck,
      retryAttempts,
      status: 'offline',
    }, previousStatus);
  };

  // Set up event listeners
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start realtime silence monitoring (check less frequently than the threshold)
  realtimeSilenceTimer = setInterval(() => {
    checkRealtimeSilence();
  }, REALTIME_SILENCE_CHECK_INTERVAL);

  // Store cleanup function separately
  healthCheckCleanup = () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };

  // Removed verbose logging - monitoring is initialized silently
}

/**
 * Stop monitoring connection health
 */
export function stopHealthMonitoring(): void {
  if (!isMonitoring) return;

  isMonitoring = false;
  
  // Clear safety timer
  if (safetyTimerInterval) {
    clearInterval(safetyTimerInterval);
    safetyTimerInterval = null;
  }
  
  // Clear realtime silence timer
  if (realtimeSilenceTimer) {
    clearInterval(realtimeSilenceTimer);
    realtimeSilenceTimer = null;
  }
  
  // Run cleanup if stored
  if (healthCheckCleanup) {
    healthCheckCleanup();
    healthCheckCleanup = null;
  }

  logInfo('Connection health monitoring stopped', {
    component: 'ConnectionHealth',
    action: 'stopHealthMonitoring',
  });
  
  // Phase 4: Stop retry queue monitoring when health monitoring stops
  if (typeof window !== 'undefined') {
    // Dynamically import to avoid circular dependency
    import('./connectionHealthRetryQueue').then(({ stopRetryQueueMonitoring }) => {
      stopRetryQueueMonitoring();
    }).catch(() => {
      // Retry queue module not available, skip
    });
  }
}

/**
 * Subscribe to health state changes
 */
export function subscribeToHealthState(callback: HealthCheckCallback): () => void {
  healthCheckCallbacks.add(callback);
  
  // Immediately call with current state
  callback({
    isHealthy: connectionStatus === 'healthy',
    lastCheck: lastHealthCheck,
    retryAttempts,
    status: connectionStatus,
  });

  // Return unsubscribe function
  return () => {
    healthCheckCallbacks.delete(callback);
  };
}

/**
 * Get current health state
 */
export function getHealthState(): ConnectionHealthState {
  return {
    isHealthy: connectionStatus === 'healthy',
    lastCheck: lastHealthCheck,
    retryAttempts,
    status: connectionStatus,
  };
}

/**
 * Force a health check immediately (bypasses cooldown)
 * Use sparingly - for manual/user-initiated checks only
 */
export async function forceHealthCheck(): Promise<boolean> {
  // Reset cooldown to allow immediate check
  const previousLastCheck = lastHealthCheck;
  lastHealthCheck = null;
  
  try {
    return await performHealthCheck('force');
  } finally {
    // Restore previous check time if force check fails
    if (lastHealthCheck === null) {
      lastHealthCheck = previousLastCheck;
    }
  }
}

