/**
 * Phase 8: Service Worker Safety Net
 * 
 * Detects broken or stale service workers and automatically recovers.
 * Unregisters service worker, clears cache, and reloads once per session.
 */

interface ServiceWorkerRecoveryState {
  hasAttemptedRecovery: boolean;
  isRecovering: boolean;
}

const RECOVERY_STORAGE_KEY = 'sw_recovery_attempted';
const RECOVERY_SESSION_KEY = 'sw_recovery_session';

/**
 * Phase 8: Check if service worker recovery has been attempted this session
 */
function hasRecoveryBeenAttempted(): boolean {
  if (typeof window === 'undefined') return false;
  
  const sessionId = sessionStorage.getItem(RECOVERY_SESSION_KEY);
  const currentSessionId = Date.now().toString();
  
  // If no session ID or different session, reset
  if (!sessionId || sessionId !== currentSessionId) {
    sessionStorage.setItem(RECOVERY_SESSION_KEY, currentSessionId);
    return false;
  }
  
  return sessionStorage.getItem(RECOVERY_STORAGE_KEY) === 'true';
}

/**
 * Phase 8: Mark that recovery has been attempted
 */
function markRecoveryAttempted(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RECOVERY_STORAGE_KEY, 'true');
}

/**
 * Phase 8: Detect if service worker is broken or stale
 */
export async function detectBrokenServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      return false; // No service worker controlling, not broken
    }

    // Phase 8: Check if service worker is responding
    // Send a ping message and wait for response
    const pingPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2000); // 2 second timeout
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data === 'pong');
      };
      
      controller.postMessage({ type: 'ping' }, [channel.port2]);
    });

    const isResponding = await pingPromise;
    return !isResponding;
  } catch (error) {
    console.warn('[ServiceWorkerRecovery] Error detecting broken service worker:', error);
    // If we can't detect, assume it's not broken (conservative)
    return false;
  }
}

/**
 * Phase 8: Recover from broken service worker
 */
export async function recoverFromBrokenServiceWorker(): Promise<void> {
  if (hasRecoveryBeenAttempted()) {
    console.warn('[ServiceWorkerRecovery] Recovery already attempted this session, skipping');
    return;
  }

  markRecoveryAttempted();

  try {
    console.log('[ServiceWorkerRecovery] Starting recovery...');

    // Phase 8: Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[ServiceWorkerRecovery] Unregistered service worker');
      }
    }

    // Phase 8: Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          console.log(`[ServiceWorkerRecovery] Deleting cache: ${name}`);
          return caches.delete(name);
        })
      );
    }

    // Phase 8: Reload once (only once per session)
    console.log('[ServiceWorkerRecovery] Reloading page...');
    window.location.reload();
  } catch (error) {
    console.error('[ServiceWorkerRecovery] Error during recovery:', error);
    throw error;
  }
}

/**
 * Phase 8: Check for chunk load errors and trigger recovery if needed
 */
export function handleChunkLoadError(error: Error): boolean {
  const isChunkError =
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module');

  if (isChunkError && !hasRecoveryBeenAttempted()) {
    console.warn('[ServiceWorkerRecovery] Chunk load error detected, attempting recovery...');
    recoverFromBrokenServiceWorker().catch((recoveryError) => {
      console.error('[ServiceWorkerRecovery] Recovery failed:', recoveryError);
    });
    return true; // Indicates recovery was triggered
  }

  return false;
}

/**
 * Phase 8: Monitor service worker health during boot
 */
export async function monitorServiceWorkerHealth(
  onBroken: () => void,
  timeout: number = 5000
): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const startTime = Date.now();

  const checkHealth = async () => {
    if (Date.now() - startTime > timeout) {
      // Timeout reached, assume service worker might be broken
      const isBroken = await detectBrokenServiceWorker();
      if (isBroken) {
        onBroken();
      }
      return;
    }

    const isBroken = await detectBrokenServiceWorker();
    if (isBroken) {
      onBroken();
    } else {
      // Check again after a delay
      setTimeout(checkHealth, 1000);
    }
  };

  // Start checking after a brief delay
  setTimeout(checkHealth, 1000);
}


