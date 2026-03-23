/**
 * useOrientation Hook
 * 
 * Phase 8.1: Orientation-Aware Layout
 * 
 * Lightweight hook to detect device orientation (portrait vs landscape).
 * Used for responsive UI adjustments in roadmap views.
 * 
 * Rules:
 * - No global state
 * - No persistence
 * - No server dependency
 * - CSS-first approach (uses matchMedia)
 */

import { useState, useEffect } from 'react';

export interface OrientationResult {
  isLandscape: boolean;
  isPortrait: boolean;
}

/**
 * Hook to detect device orientation
 * 
 * @returns Object with isLandscape and isPortrait booleans
 */
export function useOrientation(): OrientationResult {
  const [isLandscape, setIsLandscape] = useState(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    const mq = window.matchMedia('(orientation: landscape)');
    
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsLandscape(e.matches);
    };

    // Initial check
    handler(mq);

    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  return {
    isLandscape,
    isPortrait: !isLandscape,
  };
}