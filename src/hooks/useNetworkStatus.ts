/**
 * Phase 4B: Network Status Hook
 * 
 * Provides real-time network connectivity status using navigator.onLine
 * and online/offline window events.
 */

import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize from navigator.onLine (may be unreliable, but best we have)
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    // Update state when network status changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check navigator.onLine periodically as a fallback
    // (some browsers don't fire events reliably)
    const checkInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== isOnline) {
        setIsOnline(navigator.onLine);
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [isOnline]);

  return { isOnline, isOffline: !isOnline };
}



