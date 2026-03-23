/**
 * Phase 4: Network Resilience
 * 
 * Utilities for network requests with timeout, retry, and cancellation support.
 * Provides robust network request handling with AbortController and request deduplication.
 */

import { retryWithBackoff } from './connectionHealth';
import { logError, logWarning, logInfo } from './errorLogger';

export interface NetworkRequestOptions {
  /**
   * Timeout in milliseconds. Default: 10000 (10 seconds)
   */
  timeout?: number;
  
  /**
   * Maximum number of retries. Default: 3
   */
  maxRetries?: number;
  
  /**
   * Initial retry delay in milliseconds. Default: 1000 (1 second)
   */
  retryDelay?: number;
  
  /**
   * AbortController for cancellation. If not provided, one will be created.
   */
  signal?: AbortSignal;
  
  /**
   * Request deduplication key. Requests with the same key will be deduplicated.
   */
  dedupeKey?: string;
  
  /**
   * Context for error logging
   */
  context?: {
    component?: string;
    action?: string;
  };
  
  /**
   * Custom headers
   */
  headers?: Record<string, string>;
  
  /**
   * Request method. Default: 'GET'
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  /**
   * Request body
   */
  body?: BodyInit | null;
}

export interface NetworkRequestResult<T> {
  data: T;
  response: Response;
  aborted: boolean;
}

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Create a fetch request with timeout, retry, and cancellation support.
 * 
 * @param url - Request URL
 * @param options - Request options
 * @returns Promise resolving to the response data
 * 
 * @example
 * ```typescript
 * const data = await networkRequest<MyDataType>(
 *   'https://api.example.com/data',
 *   {
 *     timeout: 5000,
 *     maxRetries: 3,
 *     context: { component: 'MyComponent', action: 'fetchData' }
 *   }
 * );
 * ```
 */
export async function networkRequest<T = any>(
  url: string,
  options: NetworkRequestOptions = {}
): Promise<NetworkRequestResult<T>> {
  const {
    timeout = 10000,
    maxRetries = 3,
    retryDelay = 1000,
    signal: providedSignal,
    dedupeKey,
    context,
    headers = {},
    method = 'GET',
    body,
  } = options;

  // Request deduplication
  if (dedupeKey) {
    const pending = pendingRequests.get(dedupeKey);
    if (pending) {
      logInfo('Deduplicating request', {
        ...context,
        dedupeKey,
        action: 'networkRequest',
      });
      return pending;
    }
  }

  // Create AbortController if not provided
  const abortController = providedSignal
    ? null
    : new AbortController();
  const signal = providedSignal || abortController!.signal;

  // Create request promise
  const requestPromise = retryWithBackoff(
    async () => {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);

        // Clear timeout if request completes
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });

      // Create fetch promise
      const fetchPromise = fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body,
        signal,
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      // Check if request was aborted
      if (signal.aborted) {
        throw new Error('Request aborted');
      }

      // Check response status
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse response
      const data = await response.json();

      return {
        data,
        response,
        aborted: false,
      } as NetworkRequestResult<T>;
    },
    maxRetries,
    retryDelay,
    context
  );

  // Store in deduplication cache if key provided
  if (dedupeKey) {
    pendingRequests.set(dedupeKey, requestPromise);
    requestPromise
      .finally(() => {
        pendingRequests.delete(dedupeKey);
      })
      .catch(() => {
        // Error already handled in retryWithBackoff
      });
  }

  try {
    return await requestPromise;
  } catch (error) {
    // Check if request was aborted
    if (signal.aborted || (error instanceof Error && error.message.includes('aborted'))) {
      return {
        data: null as any,
        response: null as any,
        aborted: true,
      };
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Create a Supabase query with timeout and cancellation support.
 * 
 * @param queryFn - Function that returns a Supabase query promise
 * @param options - Request options
 * @returns Promise resolving to the query result
 * 
 * @example
 * ```typescript
 * const { data, error } = await supabaseQuery(
 *   () => supabase.from('table').select('*'),
 *   {
 *     timeout: 5000,
 *     context: { component: 'MyComponent', action: 'loadData' }
 *   }
 * );
 * ```
 */
export async function supabaseQuery<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: Omit<NetworkRequestOptions, 'method' | 'body' | 'headers'> = {}
): Promise<{ data: T | null; error: any; aborted: boolean }> {
  const {
    timeout = 10000,
    maxRetries = 3,
    retryDelay = 1000,
    signal,
    dedupeKey,
    context,
  } = options;

  // Request deduplication
  if (dedupeKey) {
    const pending = pendingRequests.get(dedupeKey);
    if (pending) {
      logInfo('Deduplicating Supabase query', {
        ...context,
        dedupeKey,
        action: 'supabaseQuery',
      });
      return pending;
    }
  }

  // Create AbortController if not provided
  const abortController = signal
    ? null
    : new AbortController();
  const querySignal = signal || abortController!.signal;

  // Create query promise
  const queryPromise = retryWithBackoff(
    async () => {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Supabase query timeout after ${timeout}ms`));
        }, timeout);

        // Clear timeout if query completes
        querySignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });

      // Execute query
      const queryResult = await Promise.race([
        queryFn(),
        timeoutPromise,
      ]);

      // Check if query was aborted
      if (querySignal.aborted) {
        throw new Error('Query aborted');
      }

      return {
        ...queryResult,
        aborted: false,
      };
    },
    maxRetries,
    retryDelay,
    context
  );

  // Store in deduplication cache if key provided
  if (dedupeKey) {
    pendingRequests.set(dedupeKey, queryPromise);
    queryPromise
      .finally(() => {
        pendingRequests.delete(dedupeKey);
      })
      .catch(() => {
        // Error already handled in retryWithBackoff
      });
  }

  try {
    return await queryPromise;
  } catch (error) {
    // Check if query was aborted
    if (querySignal.aborted || (error instanceof Error && error.message.includes('aborted'))) {
      return {
        data: null,
        error: null,
        aborted: true,
      };
    }

    // Return error in Supabase format
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      aborted: false,
    };
  }
}

/**
 * Clear all pending requests (useful for cleanup or testing)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get count of pending requests
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}