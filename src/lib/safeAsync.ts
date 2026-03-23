/**
 * Phase 3: Enhanced Error Boundaries
 * 
 * Utilities for safe async execution that catch errors and handle them appropriately.
 * Prevents unhandled promise rejections and async errors in callbacks.
 */

import { logError } from './errorLogger';

export interface SafeAsyncOptions {
  /**
   * Context for error logging (e.g., "loadUserData", "handleSubmit")
   */
  context?: string;
  
  /**
   * Whether to log errors (default: true)
   */
  logError?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: Error) => void;
  
  /**
   * Fallback value if error occurs
   */
  fallback?: any;
  
  /**
   * Whether to rethrow error after handling (default: false)
   */
  rethrow?: boolean;
}

/**
 * Safely execute an async function, catching and handling any errors.
 * 
 * @param fn - Async function to execute
 * @param options - Options for error handling
 * @returns Result of the function or fallback value
 * 
 * @example
 * ```tsx
 * const data = await safeAsync(
 *   async () => await fetchUserData(userId),
 *   { context: 'loadUserData', fallback: null }
 * );
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  options: SafeAsyncOptions = {}
): Promise<T | undefined> {
  const {
    context = 'unknown',
    logError: shouldLog = true,
    onError,
    fallback,
    rethrow = false,
  } = options;

  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (shouldLog) {
      logError(
        `Safe async error [${context}]: ${err.message}`,
        err,
        {
          component: 'safeAsync',
          context,
          action: 'execute',
          timestamp: new Date().toISOString(),
        }
      );
    }

    if (onError) {
      onError(err);
    }

    if (rethrow) {
      throw err;
    }

    return fallback;
  }
}

/**
 * Safely execute a synchronous function, catching and handling any errors.
 * 
 * @param fn - Function to execute
 * @param options - Options for error handling
 * @returns Result of the function or fallback value
 * 
 * @example
 * ```tsx
 * const result = safeSync(
 *   () => JSON.parse(userInput),
 *   { context: 'parseUserInput', fallback: {} }
 * );
 * ```
 */
export function safeSync<T>(
  fn: () => T,
  options: SafeAsyncOptions = {}
): T | undefined {
  const {
    context = 'unknown',
    logError: shouldLog = true,
    onError,
    fallback,
    rethrow = false,
  } = options;

  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (shouldLog) {
      logError(
        `Safe sync error [${context}]: ${err.message}`,
        err,
        {
          component: 'safeSync',
          context,
          action: 'execute',
          timestamp: new Date().toISOString(),
        }
      );
    }

    if (onError) {
      onError(err);
    }

    if (rethrow) {
      throw err;
    }

    return fallback;
  }
}

/**
 * Wrap an event handler to safely catch errors.
 * 
 * @param handler - Event handler function
 * @param options - Options for error handling
 * @returns Wrapped event handler
 * 
 * @example
 * ```tsx
 * const handleClick = safeEventHandler(
 *   async (e) => {
 *     await submitForm();
 *   },
 *   { context: 'submitForm' }
 * );
 * 
 * <button onClick={handleClick}>Submit</button>
 * ```
 */
export function safeEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  options: SafeAsyncOptions = {}
): (...args: Parameters<T>) => void | Promise<void> {
  return (...args: Parameters<T>) => {
    return safeAsync(
      async () => {
        const result = handler(...args);
        // If handler returns a promise, await it
        if (result instanceof Promise) {
          await result;
        }
      },
      options
    );
  };
}

/**
 * Wrap a callback function to safely catch errors.
 * Useful for setTimeout/setInterval callbacks.
 * 
 * @param callback - Callback function
 * @param options - Options for error handling
 * @returns Wrapped callback
 * 
 * @example
 * ```tsx
 * const safeCallback = safeCallback(
 *   () => {
 *     updateTimer();
 *   },
 *   { context: 'updateTimer' }
 * );
 * 
 * setInterval(safeCallback, 1000);
 * ```
 */
export function safeCallback<T extends (...args: any[]) => any>(
  callback: T,
  options: SafeAsyncOptions = {}
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    try {
      const result = callback(...args);
      // If callback returns a promise, handle it safely
      if (result instanceof Promise) {
        result.catch((error) => {
          const err = error instanceof Error ? error : new Error(String(error));
          const context = options.context || 'unknown';
          
          if (options.logError !== false) {
            logError(
              `Safe callback error [${context}]: ${err.message}`,
              err,
              {
                component: 'safeCallback',
                context,
                action: 'execute',
                timestamp: new Date().toISOString(),
              }
            );
          }

          if (options.onError) {
            options.onError(err);
          }
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const context = options.context || 'unknown';
      
      if (options.logError !== false) {
        logError(
          `Safe callback error [${context}]: ${err.message}`,
          err,
          {
            component: 'safeCallback',
            context,
            action: 'execute',
            timestamp: new Date().toISOString(),
          }
        );
      }

      if (options.onError) {
        options.onError(err);
      }
    }
  };
}