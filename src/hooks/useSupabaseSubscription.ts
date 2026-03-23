/**
 * Phase 2: Memory Leak Prevention
 * 
 * Safe Supabase subscription hook that automatically cleans up on unmount.
 * Prevents memory leaks from Supabase realtime subscriptions.
 */

import { useEffect, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type SupabaseSubscriptionCallback<T = any> = (
  payload: RealtimePostgresChangesPayload<T>
) => void;

export interface SupabaseSubscriptionOptions<T = any> {
  /**
   * Channel name (optional, will be generated if not provided)
   */
  channelName?: string;
  
  /**
   * Event type: 'INSERT', 'UPDATE', 'DELETE', or '*' for all
   */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  
  /**
   * Schema name (default: 'public')
   */
  schema?: string;
  
  /**
   * Table name
   */
  table: string;
  
  /**
   * Filter for specific rows (e.g., 'id=eq.123')
   */
  filter?: string;
  
  /**
   * Callback when event is received
   */
  onEvent: SupabaseSubscriptionCallback<T>;
  
  /**
   * Callback when subscription is established
   */
  onSubscribe?: () => void;
  
  /**
   * Callback when subscription error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for safely managing Supabase realtime subscriptions that automatically clean up on unmount.
 * 
 * @param options - Subscription configuration
 * 
 * @returns Object with channel and unsubscribe function
 * 
 * @example
 * ```tsx
 * useSupabaseSubscription({
 *   table: 'messages',
 *   event: 'INSERT',
 *   filter: 'conversation_id=eq.123',
 *   onEvent: (payload) => {
 *     console.log('New message:', payload.new);
 *   },
 * });
 * ```
 */
export function useSupabaseSubscription<T = any>(
  options: SupabaseSubscriptionOptions<T>
): { channel: RealtimeChannel | null; unsubscribe: () => void } {
  const {
    channelName,
    event = '*',
    schema = 'public',
    table,
    filter,
    onEvent,
    onSubscribe,
    onError,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  const onSubscribeRef = useRef(onSubscribe);
  const onErrorRef = useRef(onError);

  // Update refs when they change
  useEffect(() => {
    onEventRef.current = onEvent;
    onSubscribeRef.current = onSubscribe;
    onErrorRef.current = onError;
  }, [onEvent, onSubscribe, onError]);

  useEffect(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Create new subscription
    const channel = channelName
      ? supabase.channel(channelName)
      : supabase.channel(`table:${schema}:${table}${filter ? `:${filter}` : ''}`);

    // Set up postgres changes listener
    const subscription = channel
      .on<RealtimePostgresChangesPayload<T>>(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload) => {
          onEventRef.current(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          onSubscribeRef.current?.();
        } else if (status === 'CHANNEL_ERROR' && err) {
          const error = err instanceof Error ? err : new Error(String(err));
          onErrorRef.current?.(error);
          console.error('[useSupabaseSubscription] Subscription error:', error);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when deps change
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, event, schema, table, filter]);

  const unsubscribe = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  };

  return {
    channel: channelRef.current,
    unsubscribe,
  };
}