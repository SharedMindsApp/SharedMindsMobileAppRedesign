/**
 * Error Logger
 * 
 * Comprehensive error logging system for mobile app debugging.
 * Persists logs to localStorage and provides UI-accessible debug panel.
 */

export interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    url?: string;
    userAgent?: string;
    networkStatus?: 'online' | 'offline';
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
}

const MAX_LOGS = 100; // Keep last 100 logs (reduced to prevent quota issues)
const MAX_LOG_SIZE_BYTES = 50 * 1024; // 50KB max for all logs combined
const LOG_STORAGE_KEY = 'app_error_logs';
const LOG_LEVEL_KEY = 'app_log_level';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

let currentLogLevel: LogLevel = 'info';
let isLogging = false; // Flag to prevent recursive logging
let originalConsoleError: typeof console.error | null = null;
let originalConsoleWarn: typeof console.warn | null = null;

// Initialize log level from storage and store original console methods
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(LOG_LEVEL_KEY);
    if (stored && ['error', 'warn', 'info', 'debug'].includes(stored)) {
      currentLogLevel = stored as LogLevel;
    }
    // Store original console methods before any wrapping
    originalConsoleError = console.error.bind(console);
    originalConsoleWarn = console.warn.bind(console);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get all stored logs
 */
export function getLogs(): ErrorLog[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) return [];
    
    const logs = JSON.parse(stored) as ErrorLog[];
    return logs.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  } catch (error) {
    // Use original console.error to avoid recursion
    if (originalConsoleError) {
      originalConsoleError('[ErrorLogger] Failed to read logs:', error);
    } else {
      // Store original if not stored yet
      originalConsoleError = console.error.bind(console);
      originalConsoleError('[ErrorLogger] Failed to read logs:', error);
    }
    return [];
  }
}

/**
 * Get estimated size of logs in bytes
 */
function getLogsSize(logs: ErrorLog[]): number {
  try {
    return new Blob([JSON.stringify(logs)]).size;
  } catch {
    return logs.length * 1000; // Rough estimate: 1KB per log
  }
}

/**
 * Trim logs to fit within size limit
 */
function trimLogsToSize(logs: ErrorLog[], maxSize: number): ErrorLog[] {
  // Sort by timestamp (newest first)
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  
  // Keep reducing logs until we're under the size limit
  let trimmed = sorted;
  while (trimmed.length > 0 && getLogsSize(trimmed) > maxSize) {
    // Remove oldest logs
    trimmed = trimmed.slice(0, Math.floor(trimmed.length * 0.8));
    
    // Safety: never go below 10 logs
    if (trimmed.length <= 10) break;
  }
  
  // Also limit by count
  return trimmed.slice(0, MAX_LOGS);
}

/**
 * Clear old logs to free up space
 */
function freeStorageSpace(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Get all logs
    const logs = getLogs();
    
    // Keep only errors and warnings from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const importantLogs = logs.filter(log => {
      const isRecent = log.timestamp > oneDayAgo;
      const isImportant = log.level === 'error' || log.level === 'warn';
      return isRecent || isImportant;
    });
    
    // Limit to 50 most recent important logs
    const trimmed = importantLogs.slice(0, 50);
    
    // Save trimmed logs
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // If even that fails, clear all logs
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch {
      // Can't do anything more
    }
  }
}

/**
 * Save logs to storage with quota management
 */
function saveLogs(logs: ErrorLog[]): void {
  if (typeof window === 'undefined') return;
  if (isLogging) return; // Prevent recursive calls
  
  try {
    // Trim logs to fit within size limit
    let trimmed = trimLogsToSize(logs, MAX_LOG_SIZE_BYTES);
    
    // Try to save
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
    
    // Verify we can still write (quota check)
    try {
      localStorage.setItem('__quota_test__', 'test');
      localStorage.removeItem('__quota_test__');
    } catch (quotaError) {
      // Quota is full, free up space
      freeStorageSpace();
      // Try one more time with minimal logs
      const minimalLogs = trimmed.slice(0, 20);
      try {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(minimalLogs));
      } catch {
        // Last resort: clear all logs
        localStorage.removeItem(LOG_STORAGE_KEY);
      }
    }
  } catch (error) {
    // Check if it's a quota error
    const isQuotaError = error instanceof DOMException && (
      error.code === 22 || // QUOTA_EXCEEDED_ERR
      error.code === 1014 || // QUOTA_EXCEEDED_ERR (Firefox)
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
    
    if (isQuotaError) {
      // Aggressively free up space
      freeStorageSpace();
      
      // Try to save a minimal set of logs (errors only, last 10)
      try {
        const errorLogs = logs
          .filter(log => log.level === 'error')
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(errorLogs));
      } catch {
        // Last resort: clear all logs to free space for auth
        try {
          localStorage.removeItem(LOG_STORAGE_KEY);
        } catch {
          // Can't do anything more
        }
      }
    } else {
      // Use original console.error to avoid recursion
      if (originalConsoleError) {
        originalConsoleError('[ErrorLogger] Failed to save logs:', error);
      } else {
        originalConsoleError = console.error.bind(console);
        originalConsoleError('[ErrorLogger] Failed to save logs:', error);
      }
    }
  }
}

/**
 * Add a log entry with quota-aware trimming
 */
function addLog(log: Omit<ErrorLog, 'id' | 'timestamp'>): void {
  // Prevent recursive logging
  if (isLogging) return;
  
  isLogging = true;
  try {
    const logs = getLogs();
    
    // Limit stack trace length to prevent huge logs
    let trimmedError = log.error;
    if (trimmedError?.stack && trimmedError.stack.length > 500) {
      trimmedError = {
        ...trimmedError,
        stack: trimmedError.stack.substring(0, 500) + '... [truncated]',
      };
    }
    
    // Limit context size
    const limitedContext = log.context ? {
      ...log.context,
      // Only keep essential context fields
      component: log.context.component,
      action: log.context.action,
      userId: log.context.userId,
      url: typeof window !== 'undefined' ? window.location.pathname : undefined, // Only pathname, not full URL
      // Skip large fields like userAgent, networkStatus unless it's an error
      ...(log.level === 'error' ? {
        networkStatus: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : undefined,
      } : {}),
    } : undefined;
    
    const newLog: ErrorLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      error: trimmedError,
      context: limitedContext,
    };

    logs.unshift(newLog);
    
    // If we already have too many logs, keep only the most recent
    if (logs.length > MAX_LOGS * 2) {
      // Keep only most recent logs before saving
      const recentLogs = logs.slice(0, MAX_LOGS);
      saveLogs(recentLogs);
    } else {
      saveLogs(logs);
    }

    // Also log to console in development using original methods
    if (import.meta.env.DEV) {
      if (log.level === 'error') {
        const consoleErr = originalConsoleError || console.error.bind(console);
        consoleErr(`[${log.level.toUpperCase()}]`, log.message, log.error || log.context);
      } else if (log.level === 'warn') {
        const consoleWarn = originalConsoleWarn || console.warn.bind(console);
        consoleWarn(`[${log.level.toUpperCase()}]`, log.message, log.context);
      } else {
        console.log(`[${log.level.toUpperCase()}]`, log.message, log.context);
      }
    }
  } catch (error) {
    // If even adding a log fails, just ignore it to prevent recursion
    // Only log to console in dev mode
    if (import.meta.env.DEV && originalConsoleError) {
      originalConsoleError('[ErrorLogger] Failed to add log:', error);
    }
  } finally {
    isLogging = false;
  }
}

/**
 * Check if log level should be recorded
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
  const currentIndex = levels.indexOf(currentLogLevel);
  const logIndex = levels.indexOf(level);
  return logIndex <= currentIndex;
}

/**
 * Log an error
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('error')) return;

  let errorInfo: ErrorLog['error'] | undefined;

  if (error instanceof Error) {
    errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error) {
    errorInfo = {
      name: 'UnknownError',
      message: String(error),
    };
  }

  addLog({
    level: 'error',
    message,
    error: errorInfo,
    context,
  });
}

/**
 * Log a warning
 */
export function logWarning(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('warn')) return;

  addLog({
    level: 'warn',
    message,
    context,
  });
}

/**
 * Log info
 */
export function logInfo(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('info')) return;

  addLog({
    level: 'info',
    message,
    context,
  });
}

/**
 * Log debug info
 */
export function logDebug(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('debug')) return;

  addLog({
    level: 'debug',
    message,
    context,
  });
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (error) {
    // Use original console.error to avoid recursion
    if (originalConsoleError) {
      originalConsoleError('[ErrorLogger] Failed to clear logs:', error);
    } else {
      originalConsoleError = console.error.bind(console);
      originalConsoleError('[ErrorLogger] Failed to clear logs:', error);
    }
  }
}

/**
 * Aggressively free up storage space by clearing non-essential data
 * This function is called proactively before auth operations to ensure we have space
 */
export function freeStorageSpaceAggressively(): void {
  if (typeof window === 'undefined') return;
  
  // Preserve ONLY the auth token - everything else can be cleared
  const essentialKeys = [
    'supabase.auth.token',
  ];
  
  try {
    // Step 1: Clear ALL logs immediately (they're non-essential for login)
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
      localStorage.removeItem('app_error_logs');
      localStorage.removeItem('sharedminds_error_logs');
    } catch {
      // Ignore errors
    }
    
    // Step 2: Clear all non-essential app data
    const nonEssentialKeys = [
      'guardrails_wizard_state',
      'offline_action_queue',
      'app_update_dismissed',
      'app_update_last_applied',
      'app_log_level',
      'sharedminds_log_level',
        // 'active_project' - DO NOT clear - user's current active project must persist
        'active_data_context', // Can be reloaded from server
      'active_track', // Can be reloaded
      'view_as_data', // Can be reloaded
    ];
    
    nonEssentialKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore errors for individual keys
      }
    });
    
    // Step 3: Clear any remaining non-essential keys (except auth token)
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !essentialKeys.includes(key) && !key.startsWith('supabase.')) {
          // Only preserve supabase keys (auth token is critical)
          allKeys.push(key);
        }
      }
      
      // Remove all non-essential keys
      allKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      });
    } catch {
      // Ignore errors
    }
    
    // Step 4: Verify we have space for auth token
    try {
      localStorage.setItem('__quota_check__', 'test');
      localStorage.removeItem('__quota_check__');
    } catch {
      // Still full - last resort: clear everything except auth token
      try {
        const authToken = localStorage.getItem('supabase.auth.token');
        localStorage.clear();
        if (authToken) {
          localStorage.setItem('supabase.auth.token', authToken);
        }
      } catch {
        // Can't do anything more - storage might be completely full
      }
    }
  } catch (error) {
    // If anything fails, try to at least preserve auth token
    try {
      const authToken = localStorage.getItem('supabase.auth.token');
      if (!authToken) {
        // No auth token to preserve - safe to clear everything
        localStorage.clear();
      }
    } catch {
      // Can't do anything more
    }
  }
}

/**
 * Check storage quota and clean up if needed
 */
export function checkStorageQuota(): { isHealthy: boolean; action?: string } {
  if (typeof window === 'undefined') return { isHealthy: true };
  
  try {
    // Try to write a test value
    const testKey = '__quota_test__';
    const testValue = 'test';
    localStorage.setItem(testKey, testValue);
    localStorage.removeItem(testKey);
    
    // Check current log size
    const logs = getLogs();
    const logSize = getLogsSize(logs);
    
    // If logs are too large, clean them up
    if (logSize > MAX_LOG_SIZE_BYTES) {
      freeStorageSpace();
      return { isHealthy: false, action: 'cleaned_logs' };
    }
    
    return { isHealthy: true };
  } catch (error) {
    // Quota exceeded - aggressively free up space
    const isQuotaError = error instanceof DOMException && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
    
    if (isQuotaError) {
      freeStorageSpaceAggressively();
      return { isHealthy: false, action: 'quota_exceeded_cleaned_aggressively' };
    }
    
    return { isHealthy: false, action: 'unknown_error' };
  }
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  const logs = getLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Export logs as text (readable format)
 */
export function exportLogsAsText(): string {
  const logs = getLogs();
  
  return logs.map(log => {
    const date = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    let text = `[${date}] ${level} ${log.message}`;
    
    if (log.context?.component) {
      text += ` | Component: ${log.context.component}`;
    }
    if (log.context?.action) {
      text += ` | Action: ${log.context.action}`;
    }
    if (log.error) {
      text += `\n  Error: ${log.error.name}: ${log.error.message}`;
      if (log.error.stack) {
        text += `\n  Stack: ${log.error.stack}`;
      }
    }
    if (log.context && Object.keys(log.context).length > 0) {
      const contextStr = JSON.stringify(log.context, null, 2);
      if (contextStr.length < 500) {
        text += `\n  Context: ${contextStr}`;
      }
    }
    
    return text;
  }).join('\n\n');
}

/**
 * Set log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOG_LEVEL_KEY, level);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Get error count by level
 */
export function getErrorCounts(): {
  error: number;
  warn: number;
  info: number;
  debug: number;
  total: number;
} {
  const logs = getLogs();
  const counts = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    total: logs.length,
  };

  logs.forEach(log => {
    counts[log.level]++;
  });

  return counts;
}

/**
 * Get recent errors (last N errors)
 */
export function getRecentErrors(count: number = 10): ErrorLog[] {
  const logs = getLogs();
  return logs.filter(log => log.level === 'error').slice(0, count);
}

