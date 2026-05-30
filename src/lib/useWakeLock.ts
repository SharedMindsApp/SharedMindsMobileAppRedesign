/**
 * useWakeLock — keep the screen awake while `active` is true.
 *
 * Uses the Screen Wake Lock API (navigator.wakeLock). Works with or without
 * the camera on — handy during focus/coworking sessions where the user isn't
 * touching the screen and the phone would otherwise dim and lock.
 *
 * The OS releases a wake lock whenever the page is hidden (tab switch, screen
 * already off, app backgrounded), so we re-acquire it on visibilitychange when
 * we come back to the foreground. Degrades silently where unsupported (older
 * iOS Safari, etc.).
 */

import { useEffect } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    }).wakeLock;
    if (!wakeLock) return; // unsupported — nothing to do

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        sentinel = await wakeLock.request('screen');
      } catch {
        // Permission/policy denial, low battery, etc. — non-fatal.
        sentinel = null;
      }
    };

    // Re-acquire when the page returns to the foreground (the OS drops the
    // lock while hidden).
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
