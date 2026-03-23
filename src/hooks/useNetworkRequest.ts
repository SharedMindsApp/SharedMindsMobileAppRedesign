/**
 * Phase 4: Network Resilience
 * 
 * Hook for making network requests with timeout, retry, and cancellation support.
 * Automatically cancels requests on component unmount.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { networkRequest, supabaseQuery, NetworkRequestOptions } from '../lib/networkRequest';
import { useIsMounted } from './useMountedState';

export interface UseNetworkRequestOptions extends Omit<NetworkRequestOptions, 'signal'> {
  /**
   * Whether to execute the request immediately on mount. Default: false
   */
  immediate?: boolean;
  
  /**
   * Whether to retry on error. Default: true
   */
  retryOnError?: boolean;
}

export interface UseNetworkRequestReturn<T> {
  /**
   * Response data
   */
  data: T | null;
  
  /**
   * Loading state
   */
  loading: boolean;
  
  /**
   * Error state
   */
  error: Error | null;
  
  /**
   * Whether the request was aborted
   */
  aborted: boolean;
  
  /**
   * Execute the request manually
   */
  execute: () => Promise<void>;
  
  /**
   * Cancel the current request
   */
  cancel: () => void;
  
  /**
   * Reset state
   */
  reset: () => void;
}

/**
 * Hook for making network requests with automatic cleanup.
 * 
 * @param url - Request URL (or null to disable)
 * @param options - Request options
 * @returns Request state and control functions
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useNetworkRequest<UserData>(
 *   userId ? `/api/users/${userId}` : null,
 *   {
 *     timeout: 5000,
 *     context: { component: 'UserProfile', action: 'loadUser' }
 *   }
 * );
 * 
 * useEffect(() => {
 *   if (userId) {
 *     execute();
 *   }
 * }, [userId, execute]);
 * ```
 */
export function useNetworkRequest<T = any>(
  url: string | null,
  options: UseNetworkRequestOptions = {}
): UseNetworkRequestReturn<T> {
  const {
    immediate = false,
    retryOnError = true,
    ...requestOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [aborted, setAborted] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(async () => {
    if (!url || !isMounted()) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setAborted(false);

    try {
      const result = await networkRequest<T>(url, {
        ...requestOptions,
        signal: abortController.signal,
      });

      if (!isMounted()) return;

      if (result.aborted) {
        setAborted(true);
        setLoading(false);
        return;
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      if (!isMounted()) return;

      if (abortController.signal.aborted) {
        setAborted(true);
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        if (retryOnError) {
          // Retry logic is handled by networkRequest
        }
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [url, retryOnError, isMounted, ...Object.values(requestOptions)]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setAborted(true);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setAborted(false);
  }, [cancel]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate && url) {
      execute();
    }
  }, [immediate, url, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    aborted,
    execute,
    cancel,
    reset,
  };
}

/**
 * Hook for making Supabase queries with automatic cleanup.
 * 
 * @param queryFn - Function that returns a Supabase query promise (or null to disable)
 * @param options - Request options
 * @returns Query state and control functions
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useSupabaseQuery(
 *   () => userId ? supabase.from('users').select('*').eq('id', userId) : null,
 *   {
 *     timeout: 5000,
 *     context: { component: 'UserProfile', action: 'loadUser' }
 *   }
 * );
 * 
 * useEffect(() => {
 *   if (userId) {
 *     execute();
 *   }
 * }, [userId, execute]);
 * ```
 */
export function useSupabaseQuery<T = any>(
  queryFn: (() => Promise<{ data: T | null; error: any }>) | null,
  options: UseNetworkRequestOptions = {}
): UseNetworkRequestReturn<T> {
  const {
    immediate = false,
    retryOnError = true,
    ...requestOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [aborted, setAborted] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(async () => {
    if (!queryFn || !isMounted()) return;

    // Cancel any existing query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setAborted(false);

    try {
      const result = await supabaseQuery<T>(queryFn, {
        ...requestOptions,
        signal: abortController.signal,
      });

      if (!isMounted()) return;

      if (result.aborted) {
        setAborted(true);
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error instanceof Error ? result.error : new Error(String(result.error)));
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      if (!isMounted()) return;

      if (abortController.signal.aborted) {
        setAborted(true);
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [queryFn, retryOnError, isMounted, ...Object.values(requestOptions)]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setAborted(true);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setAborted(false);
  }, [cancel]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate && queryFn) {
      execute();
    }
  }, [immediate, queryFn, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    aborted,
    execute,
    cancel,
    reset,
  };
}