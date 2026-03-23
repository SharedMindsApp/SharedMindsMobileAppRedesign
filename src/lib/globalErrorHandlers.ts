/**
 * Global Error Handlers
 * 
 * Sets up global error handlers for unhandled errors, promise rejections,
 * and network errors to log them for mobile debugging.
 */

import { logError, logWarning, logInfo } from './errorLogger';

/**
 * Initialize global error handlers
 */
export function initGlobalErrorHandlers(): void {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message || 'Unknown error');
    
    logError(
      `Unhandled Error: ${error.message}`,
      error,
      {
        component: 'GlobalErrorHandler',
        action: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
      }
    );

    // Don't prevent default - let browser handle it too
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason || 'Unhandled promise rejection'));

    logError(
      `Unhandled Promise Rejection: ${error.message}`,
      error,
      {
        component: 'GlobalErrorHandler',
        action: 'unhandledrejection',
        url: window.location.href,
        reason: event.reason ? String(event.reason) : undefined,
      }
    );

    // Prevent default console error if we've logged it
    // But still log to console in dev
    if (import.meta.env.DEV) {
      console.error('[GlobalErrorHandler] Unhandled promise rejection:', error);
    }
  });

  // Log network errors
  window.addEventListener('online', () => {
    logInfo('Network connection restored', {
      component: 'GlobalErrorHandler',
      action: 'network.online',
    });
  });

  window.addEventListener('offline', () => {
    logWarning('Network connection lost', {
      component: 'GlobalErrorHandler',
      action: 'network.offline',
    });
  });

  // Log service worker errors
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', (event) => {
      logError(
        `Service Worker Error: ${event.message || 'Unknown service worker error'}`,
        event.error || new Error(event.message || 'Service worker error'),
        {
          component: 'GlobalErrorHandler',
          action: 'serviceWorker.error',
          message: event.message,
        }
      );
    });
  }

  // Log console errors (for additional context)
  // But skip logging errors from the error logger itself to prevent infinite loops
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // Call original first
    originalConsoleError(...args);
    
    // Skip logging if this error is from the error logger itself
    const message = args.find(arg => typeof arg === 'string') as string | undefined;
    if (message && message.includes('[ErrorLogger]')) {
      return; // Don't log logger errors to avoid recursion
    }
    
    // Extract error if present
    const error = args.find(arg => arg instanceof Error) as Error | undefined;
    
    if (error || message) {
      try {
        logError(
          `Console Error: ${message || error?.message || 'Unknown error'}`,
          error,
          {
            component: 'GlobalErrorHandler',
            action: 'console.error',
            args: args.map(arg => {
              if (arg instanceof Error) {
                return { type: 'Error', message: arg.message, name: arg.name };
              }
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg);
                } catch {
                  return String(arg);
                }
              }
              return String(arg);
            }),
          }
        );
      } catch {
        // If logging fails, just ignore it to prevent infinite loops
      }
    }
  };

  // Log console warnings
  // But skip logging warnings from the error logger itself to prevent infinite loops
  // Also skip deprecation warnings as they're expected and informational
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args.find(arg => typeof arg === 'string') as string | undefined;
    
    // Skip logging if this warning is from the error logger itself
    if (message && message.includes('[ErrorLogger]')) {
      return; // Don't log logger warnings to avoid recursion
    }
    
    // Skip deprecation warnings - they're expected and informational, not errors
    // Also skip showing them in console to reduce clutter
    if (message && (
      message.includes('DEPRECATED') ||
      message.includes('deprecated') ||
      message.includes('Deprecated') ||
      message.toLowerCase().includes('use instead')
    )) {
      return; // Don't log or show deprecation warnings
    }
    
    // Call original console.warn for non-deprecation warnings
    originalConsoleWarn(...args);
    
    if (message) {
      try {
        logWarning(
          `Console Warning: ${message}`,
          {
            component: 'GlobalErrorHandler',
            action: 'console.warn',
            args: args.map(arg => String(arg)),
          }
        );
      } catch {
        // If logging fails, just ignore it to prevent infinite loops
      }
    }
  };

  // Removed verbose logging - error handlers initialize silently
  // Only log actual errors, not initialization
}

