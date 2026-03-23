/**
 * Phase 2: Memory Leak Prevention
 * 
 * Safe event listener hook that automatically cleans up on unmount.
 * Prevents memory leaks from event listeners that aren't properly removed.
 */

import { useEffect, useRef } from 'react';

export type EventTargetElement = Window | Document | HTMLElement | null;

/**
 * Hook for safely managing event listeners that automatically clean up on unmount.
 * 
 * @param eventName - Name of the event to listen to
 * @param handler - Event handler function
 * @param element - Element to attach listener to (default: window)
 * @param options - Optional event listener options (capture, passive, etc.)
 * 
 * @example
 * ```tsx
 * useSafeEventListener('resize', () => {
 *   console.log('Window resized');
 * });
 * 
 * useSafeEventListener('click', handleClick, ref.current, { passive: true });
 * ```
 */
export function useSafeEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: EventTargetElement = window,
  options?: boolean | AddEventListenerOptions
): void;

export function useSafeEventListener<T extends keyof DocumentEventMap>(
  eventName: T,
  handler: (event: DocumentEventMap[T]) => void,
  element: Document | HTMLElement | null,
  options?: boolean | AddEventListenerOptions
): void;

export function useSafeEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element: EventTargetElement = window,
  options?: boolean | AddEventListenerOptions
): void {
  const handlerRef = useRef(handler);
  const elementRef = useRef(element);

  // Update refs when they change
  useEffect(() => {
    handlerRef.current = handler;
    elementRef.current = element;
  }, [handler, element]);

  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) return;

    const eventListener = (event: Event) => {
      handlerRef.current(event);
    };

    currentElement.addEventListener(eventName, eventListener, options);

    // Cleanup on unmount or when deps change
    return () => {
      if (currentElement) {
        currentElement.removeEventListener(eventName, eventListener, options);
      }
    };
  }, [eventName, options]);
}