/**
 * useSwipeGesture Hook
 * 
 * Detects vertical and horizontal swipe gestures with configurable thresholds.
 * Supports axis locking to prevent conflicts between horizontal and vertical gestures.
 * Designed for mobile-first interactions like calendar navigation and expanding views.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSwipeGestureOptions {
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  enabled?: boolean; // Whether gesture detection is enabled
  preventDefault?: boolean; // Whether to prevent default touch behavior
  axisLock?: boolean; // Whether to lock to one axis based on initial movement
}

interface SwipeState {
  startY: number | null;
  startX: number | null;
  currentY: number | null;
  currentX: number | null;
  isDragging: boolean;
  axisLocked: 'horizontal' | 'vertical' | null; // Lock to one axis once movement starts
}

export function useSwipeGesture({
  onSwipeDown,
  onSwipeUp,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
  preventDefault = false,
  axisLock = true,
}: UseSwipeGestureOptions = {}) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startY: null,
    startX: null,
    currentY: null,
    currentX: null,
    isDragging: false,
    axisLocked: null,
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef(swipeState);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = swipeState;
  }, [swipeState]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    const newState = {
      startY: touch.clientY,
      startX: touch.clientX,
      currentY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true,
      axisLocked: null,
    };
    
    setSwipeState(newState);
    stateRef.current = newState;

    if (preventDefault) {
      e.preventDefault();
    }
  }, [enabled, preventDefault]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Use ref to get current state and avoid stale closures
    const currentState = stateRef.current;
    if (!currentState.isDragging || currentState.startY === null || currentState.startX === null) return;

    const touch = e.touches[0];
    if (!touch) return;

    const currentY = touch.clientY;
    const currentX = touch.clientX;
    const deltaY = currentY - currentState.startY;
    const deltaX = currentX - currentState.startX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);

    // Axis locking: determine which axis to lock to based on initial movement
    let axisLocked = currentState.axisLocked;
    if (axisLock && !axisLocked && (absDeltaX > 10 || absDeltaY > 10)) {
      // Lock to the axis with greater initial movement
      axisLocked = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
    }

    // If axis is locked, ignore movement on the other axis
    if (axisLock && axisLocked) {
      if (axisLocked === 'horizontal' && absDeltaY > absDeltaX) {
        // Locked to horizontal but vertical movement is greater - cancel
        const cancelState = {
          startY: null,
          startX: null,
          currentY: null,
          currentX: null,
          isDragging: false,
          axisLocked: null,
        };
        setSwipeState(cancelState);
        stateRef.current = cancelState;
        return;
      }
      if (axisLocked === 'vertical' && absDeltaX > absDeltaY) {
        // Locked to vertical but horizontal movement is greater - cancel
        const cancelState = {
          startY: null,
          startX: null,
          currentY: null,
          currentX: null,
          isDragging: false,
          axisLocked: null,
        };
        setSwipeState(cancelState);
        stateRef.current = cancelState;
        return;
      }
    }

    // Only prevent default if we're actually dragging in the locked direction
    if (preventDefault && (absDeltaX > 10 || absDeltaY > 10)) {
      e.preventDefault();
    }

    const updatedState = {
      ...currentState,
      currentY: currentY,
      currentX: currentX,
      axisLocked: axisLocked || currentState.axisLocked,
    };
    setSwipeState(updatedState);
    stateRef.current = updatedState;
  }, [enabled, preventDefault, axisLock]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) {
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    // Use ref to get current state and avoid stale closures
    const currentState = stateRef.current;
    if (!currentState.isDragging || currentState.startY === null || currentState.startX === null) {
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    const finalTouch = e.changedTouches[0];
    if (!finalTouch) {
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    const deltaY = finalTouch.clientY - currentState.startY;
    const deltaX = finalTouch.clientX - currentState.startX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);

    // Determine which axis to use based on axis lock or movement dominance
    const useAxis = currentState.axisLocked || (absDeltaX > absDeltaY ? 'horizontal' : 'vertical');

    if (useAxis === 'horizontal' && absDeltaX >= threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right
        onSwipeRight?.();
      } else {
        // Swipe left
        onSwipeLeft?.();
      }
    } else if (useAxis === 'vertical' && absDeltaY >= threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        // Swipe down
        onSwipeDown?.();
      } else {
        // Swipe up
        onSwipeUp?.();
      }
    }

    const resetState = {
      startY: null,
      startX: null,
      currentY: null,
      currentX: null,
      isDragging: false,
      axisLocked: null,
    };
    setSwipeState(resetState);
    stateRef.current = resetState;
  }, [enabled, threshold, onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight]);

  // Mouse event handlers for desktop testing (Chrome DevTools touch emulation)
  // Only trigger if there's actual movement (drag), not just a click
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled || e.button !== 0) return; // Only left mouse button
    
    // Don't interfere with clicks on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
      return;
    }
    
    const newState = {
      startY: e.clientY,
      startX: e.clientX,
      currentY: e.clientY,
      currentX: e.clientX,
      isDragging: true,
      axisLocked: null,
    };
    
    setSwipeState(newState);
    stateRef.current = newState;

    if (preventDefault) {
      e.preventDefault();
    }
  }, [enabled, preventDefault]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
    const currentState = stateRef.current;
    if (!currentState.isDragging || currentState.startY === null || currentState.startX === null) return;

    const currentY = e.clientY;
    const currentX = e.clientX;
    const deltaY = currentY - currentState.startY;
    const deltaX = currentX - currentState.startX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);

    // Axis locking: determine which axis to lock to based on initial movement
    let axisLocked = currentState.axisLocked;
    if (axisLock && !axisLocked && (absDeltaX > 10 || absDeltaY > 10)) {
      axisLocked = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
    }

    // If axis is locked, ignore movement on the other axis
    if (axisLock && axisLocked) {
      if (axisLocked === 'horizontal' && absDeltaY > absDeltaX) {
        const cancelState = {
          startY: null,
          startX: null,
          currentY: null,
          currentX: null,
          isDragging: false,
          axisLocked: null,
        };
        setSwipeState(cancelState);
        stateRef.current = cancelState;
        return;
      }
      if (axisLocked === 'vertical' && absDeltaX > absDeltaY) {
        const cancelState = {
          startY: null,
          startX: null,
          currentY: null,
          currentX: null,
          isDragging: false,
          axisLocked: null,
        };
        setSwipeState(cancelState);
        stateRef.current = cancelState;
        return;
      }
    }

    if (preventDefault && (absDeltaX > 10 || absDeltaY > 10)) {
      e.preventDefault();
    }

    const updatedState = {
      ...currentState,
      currentY: currentY,
      currentX: currentX,
      axisLocked: axisLocked || currentState.axisLocked,
    };
    setSwipeState(updatedState);
    stateRef.current = updatedState;
  }, [enabled, preventDefault, axisLock]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!enabled) {
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    const currentState = stateRef.current;
    if (!currentState.isDragging || currentState.startY === null || currentState.startX === null) {
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    const deltaY = e.clientY - currentState.startY;
    const deltaX = e.clientX - currentState.startX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);

    // Only trigger if there was actual movement (not just a click)
    if (absDeltaX < 5 && absDeltaY < 5) {
      // Click without movement - reset and don't trigger swipe
      const resetState = {
        startY: null,
        startX: null,
        currentY: null,
        currentX: null,
        isDragging: false,
        axisLocked: null,
      };
      setSwipeState(resetState);
      stateRef.current = resetState;
      return;
    }

    const useAxis = currentState.axisLocked || (absDeltaX > absDeltaY ? 'horizontal' : 'vertical');

    if (useAxis === 'horizontal' && absDeltaX >= threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (useAxis === 'vertical' && absDeltaY >= threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    const resetState = {
      startY: null,
      startX: null,
      currentY: null,
      currentX: null,
      isDragging: false,
      axisLocked: null,
    };
    setSwipeState(resetState);
    stateRef.current = resetState;
  }, [enabled, threshold, onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight]);

  const setRef = useCallback((node: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current.removeEventListener('mousedown', handleMouseDown);
      elementRef.current.removeEventListener('mousemove', handleMouseMove);
      elementRef.current.removeEventListener('mouseup', handleMouseUp);
    }

    elementRef.current = node;

    if (node && enabled) {
      // Touch events (primary for mobile)
      node.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
      node.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
      node.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
      
      // Mouse events (for desktop testing with Chrome DevTools touch emulation)
      node.addEventListener('mousedown', handleMouseDown);
      node.addEventListener('mousemove', handleMouseMove);
      node.addEventListener('mouseup', handleMouseUp);
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, preventDefault]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchmove', handleTouchMove);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
        elementRef.current.removeEventListener('mousedown', handleMouseDown);
        elementRef.current.removeEventListener('mousemove', handleMouseMove);
        elementRef.current.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    ref: setRef,
    isDragging: swipeState.isDragging,
    deltaY: swipeState.startY !== null && swipeState.currentY !== null
      ? swipeState.currentY - swipeState.startY
      : 0,
    deltaX: swipeState.startX !== null && swipeState.currentX !== null
      ? swipeState.currentX - swipeState.startX
      : 0,
    axisLocked: swipeState.axisLocked,
  };
}
