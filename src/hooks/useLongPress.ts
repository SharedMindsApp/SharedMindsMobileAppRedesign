/**
 * useLongPress Hook
 * 
 * Detects long-press gestures (≥500ms) with proper cancellation on movement or early release.
 * Prefers Pointer Events, falls back to Touch Events.
 * 
 * Returns handlers and state for long-press detection.
 */

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  threshold?: number; // milliseconds, default 500
  movementThreshold?: number; // pixels, default 10
}

interface UseLongPressReturn {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  // Touch fallback
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
  // State
  didLongPressRef: React.MutableRefObject<boolean>;
  resetLongPress: () => void;
}

export function useLongPress({
  onLongPress,
  threshold = 500,
  movementThreshold = 10,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);
  const isPointerEventRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPositionRef.current = null;
    pointerIdRef.current = null;
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number, pointerId?: number) => {
    didLongPressRef.current = false;
    startPositionRef.current = { x: clientX, y: clientY };
    if (pointerId !== undefined) {
      pointerIdRef.current = pointerId;
    }

    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onLongPress();
      cancelLongPress();
    }, threshold);
  }, [onLongPress, threshold, cancelLongPress]);

  const handleMove = useCallback((clientX: number, clientY: number, pointerId?: number) => {
    // Check if this is the same pointer
    if (pointerId !== undefined && pointerIdRef.current !== null && pointerId !== pointerIdRef.current) {
      return;
    }

    if (!startPositionRef.current) return;

    const deltaX = Math.abs(clientX - startPositionRef.current.x);
    const deltaY = Math.abs(clientY - startPositionRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > movementThreshold) {
      cancelLongPress();
    }
  }, [movementThreshold, cancelLongPress]);

  const handleEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  // Pointer Events (preferred)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary pointer (left mouse button or touch)
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    
    isPointerEventRef.current = true;
    handleStart(e.clientX, e.clientY, e.pointerId);
  }, [handleStart]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerEventRef.current) return;
    handleMove(e.clientX, e.clientY, e.pointerId);
  }, [handleMove]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPointerEventRef.current) return;
    handleEnd();
  }, [handleEnd]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    if (!isPointerEventRef.current) return;
    cancelLongPress();
  }, [cancelLongPress]);

  // Touch Events (fallback)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only use touch if pointer events aren't being used
    if (isPointerEventRef.current) return;
    
    const touch = e.touches[0];
    if (touch) {
      handleStart(touch.clientX, touch.clientY);
    }
  }, [handleStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPointerEventRef.current) return;
    
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPointerEventRef.current) return;
    handleEnd();
  }, [handleEnd]);

  const onTouchCancel = useCallback((e: React.TouchEvent) => {
    if (isPointerEventRef.current) return;
    cancelLongPress();
  }, [cancelLongPress]);

  const resetLongPress = useCallback(() => {
    didLongPressRef.current = false;
    cancelLongPress();
  }, [cancelLongPress]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    didLongPressRef,
    resetLongPress,
  };
}
