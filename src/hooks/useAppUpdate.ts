/**
 * useAppUpdate Hook
 * 
 * Manages app update detection and state for in-app update banner.
 * Checks for updates on load, foreground, and periodically.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkForUpdate, CURRENT_APP_VERSION, getLatestVersion, isVersionNewer } from '../lib/appVersion';

export interface AppUpdateState {
  updateAvailable: boolean;
  updateReady: boolean;
  dismissed: boolean;
  isOnline: boolean;
  currentVersion: string;
  latestVersion: string | null;
}

const CHECK_INTERVAL = 5 * 60 * 1000; // FIXED: Check every 5 minutes instead of 30 (more responsive)
const FOREGROUND_CHECK_DELAY = 1000; // 1 second after returning to foreground
const DISMISSED_VERSION_KEY = 'app_update_dismissed_version';
const LAST_APPLIED_VERSION_KEY = 'app_update_last_applied_version';

// Get dismissed version from localStorage
function getDismissedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

// Get last applied version from localStorage
function getLastAppliedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_APPLIED_VERSION_KEY);
  } catch {
    return null;
  }
}

// Store dismissed version in localStorage
function setDismissedVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    // Ignore localStorage errors
  }
}

// Store last applied version in localStorage
function setLastAppliedVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_APPLIED_VERSION_KEY, version);
  } catch {
    // Ignore localStorage errors
  }
}

// Clear dismissed version (for new updates)
function clearDismissedVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DISMISSED_VERSION_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    updateAvailable: false,
    updateReady: false,
    dismissed: false,
    isOnline: navigator.onLine,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: null,
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const serviceWorkerRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check for service worker update
  const checkServiceWorkerUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      serviceWorkerRegistrationRef.current = registration;

      // FIXED: Check for waiting service worker first (most reliable indicator)
      // A waiting service worker means a new version has been installed and is ready
      if (registration.waiting && navigator.serviceWorker.controller) {
        // When service worker is waiting, we have an update ready
        // Check version to confirm it's actually newer
        const latestVersion = await getLatestVersion();
        const lastApplied = getLastAppliedVersion();
        const dismissed = getDismissedVersion();
        
        // Show update if:
        // 1. We have a latest version from server
        // 2. It's newer than current version (or service worker is waiting, which indicates update)
        // 3. We haven't dismissed/applied this version
        const hasNewVersion = latestVersion && isVersionNewer(latestVersion, CURRENT_APP_VERSION);
        const shouldShow = hasNewVersion && 
                          dismissed !== latestVersion && 
                          lastApplied !== latestVersion;
        
        // Also show if service worker is waiting even if version check fails (fallback)
        // This handles cases where version.json might not be updated yet
        if (shouldShow || (registration.waiting && dismissed !== 'pending' && lastApplied !== 'pending')) {
          setState((prev) => ({
            ...prev,
            updateReady: true,
            updateAvailable: true,
            latestVersion: latestVersion || prev.latestVersion || 'pending',
          }));
        }
        return;
      }

      // Check if there's an installing service worker
      if (registration.installing) {
        const installingWorker = registration.installing;
        const handleStateChange = async () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Service worker is installed but not yet activated (waiting for skipWaiting)
            // This means a new version is ready
            const lastApplied = getLastAppliedVersion();
            const dismissed = getDismissedVersion();
            const latestVersion = await getLatestVersion();
            
            // Show update if version is newer or if service worker indicates update
            const hasNewVersion = latestVersion && isVersionNewer(latestVersion, CURRENT_APP_VERSION);
            const shouldShow = hasNewVersion && 
                              dismissed !== latestVersion && 
                              lastApplied !== latestVersion;
            
            // Also show if service worker indicates update (fallback)
            if (shouldShow || (dismissed !== 'installing' && lastApplied !== 'installing')) {
              setState((prev) => ({
                ...prev,
                updateReady: true,
                updateAvailable: true,
                latestVersion: latestVersion || prev.latestVersion || 'installing',
              }));
            }
          }
        };
        installingWorker.addEventListener('statechange', handleStateChange);
        // Clean up listener if component unmounts (though this is unlikely)
        return () => installingWorker.removeEventListener('statechange', handleStateChange);
      }

      // Periodically check for updates
      await registration.update();
    } catch (error) {
      console.warn('[useAppUpdate] Error checking service worker:', error);
    }
  }, []);

  // Check for version update
  const checkVersionUpdate = useCallback(async () => {
    if (!state.isOnline) return;

    try {
      const latestVersion = await getLatestVersion();
      if (!latestVersion) {
        // No latest version available, clear update state
        setState((prev) => ({
          ...prev,
          updateAvailable: false,
          latestVersion: null,
        }));
        return;
      }

      // Check if we're on the latest version
      const isNewerVersion = isVersionNewer(latestVersion, CURRENT_APP_VERSION);
      const dismissedVersion = getDismissedVersion();
      const lastAppliedVersion = getLastAppliedVersion();

      // If we're on the latest version (no newer version available), we've successfully applied the update
      // Clear any update state and mark current version as applied
      if (!isNewerVersion) {
        // If we haven't stored that we're on this version, do so now
        if (lastAppliedVersion !== CURRENT_APP_VERSION) {
          setLastAppliedVersion(CURRENT_APP_VERSION);
        }
        // Clear dismissed state when we're up to date
        clearDismissedVersion();
        // Clear update available state
        setState((prev) => ({
          ...prev,
          updateAvailable: false,
          latestVersion,
        }));
        return; // No update available, exit early
      }

      // We have a newer version available
      // Only show update if:
      // 1. We haven't dismissed this specific version
      // 2. We haven't already applied this version (i.e., we're still on old version)
      const shouldShowUpdate = dismissedVersion !== latestVersion &&
                               lastAppliedVersion !== latestVersion;

      setState((prev) => ({
        ...prev,
        updateAvailable: shouldShowUpdate,
        latestVersion,
      }));
    } catch (error) {
      console.warn('[useAppUpdate] Error checking version:', error);
    }
  }, [state.isOnline]);

  // Combined update check
  const performUpdateCheck = useCallback(async () => {
    await Promise.all([checkVersionUpdate(), checkServiceWorkerUpdate()]);
  }, [checkVersionUpdate, checkServiceWorkerUpdate]);

  // Listen for service worker update events
  useEffect(() => {
    const handleUpdateAvailable = async (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Only show if we haven't dismissed/applied this update
      const lastApplied = getLastAppliedVersion();
      const dismissed = getDismissedVersion();
      const latestVersion = await getLatestVersion();
      
      // Only show if there's actually a newer version and we haven't dismissed/applied it
      if (latestVersion && 
          isVersionNewer(latestVersion, CURRENT_APP_VERSION) &&
          dismissed !== latestVersion &&
          lastApplied !== latestVersion) {
        setState((prev) => ({
          ...prev,
          updateReady: true,
          updateAvailable: true,
          latestVersion,
        }));
      }
      
      // Also check registration to ensure we have the latest state
      checkServiceWorkerUpdate();
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', handleUpdateAvailable);
  }, [checkServiceWorkerUpdate]);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      // Check for update when coming back online
      setTimeout(() => performUpdateCheck(), FOREGROUND_CHECK_DELAY);
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performUpdateCheck]);

  // Listen for visibility change (app returning to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.isOnline) {
        // Delay check slightly to avoid interrupting user actions
        setTimeout(() => performUpdateCheck(), FOREGROUND_CHECK_DELAY);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performUpdateCheck, state.isOnline]);

  // Initial check on mount (only once)
  useEffect(() => {
    // On mount, verify we're not showing an update for a version we already have
    const lastApplied = getLastAppliedVersion();
    const dismissed = getDismissedVersion();
    
    // If we just applied an update and we're on that version now, clear update state
    if (lastApplied && !isVersionNewer(lastApplied, CURRENT_APP_VERSION) && lastApplied === CURRENT_APP_VERSION) {
      setState((prev) => ({
        ...prev,
        updateAvailable: false,
        dismissed: false, // Reset dismissed so we can see future updates
      }));
      // Clear dismissed version since we're up to date
      clearDismissedVersion();
    }

    // FIXED: More aggressive initial check - check immediately and then again after delay
    // This ensures we catch updates that happened while app was closed
    performUpdateCheck();
    
    // Also check after a delay to catch any updates that are still installing
    const timeoutId = setTimeout(() => {
      performUpdateCheck();
    }, 3000); // Wait 3 seconds after mount for second check

    return () => clearTimeout(timeoutId);
  }, []); // Only run on mount

  // Periodic check (only if not dismissed)
  useEffect(() => {
    if (state.dismissed) return; // Don't check if dismissed

    checkIntervalRef.current = setInterval(() => {
      performUpdateCheck();
    }, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [performUpdateCheck, state.dismissed]);

  // Dismiss update banner
  const dismissUpdate = useCallback(() => {
    setState((prev) => {
      // Store the version we're dismissing so we don't show it again
      if (prev.latestVersion) {
        setDismissedVersion(prev.latestVersion);
      }
      return { ...prev, dismissed: true };
    });
  }, []);

  // Apply update (reload app)
  const applyUpdate = useCallback(async () => {
    try {
      const registration = serviceWorkerRegistrationRef.current;
      
      // Store the version we're applying so we don't show the banner again after reload
      setState((prev) => {
        if (prev.latestVersion) {
          setLastAppliedVersion(prev.latestVersion);
          // Clear dismissed state since we're applying the update
          clearDismissedVersion();
        }
        return prev;
      });

      // Service worker update scenario
      if (registration && registration.waiting) {
        // Send skipWaiting message to waiting service worker
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Listen for controllerchange to know when new service worker takes control
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          window.location.reload();
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        // Fallback: reload after timeout if controllerchange doesn't fire
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          window.location.reload();
        }, 1000);
      } else {
        // No waiting service worker, just reload (version update scenario or fallback)
        window.location.reload();
      }
    } catch (error) {
      console.error('[useAppUpdate] Error applying update:', error);
      // Fallback: just reload
      window.location.reload();
    }
  }, []);

  return {
    ...state,
    dismissUpdate,
    applyUpdate,
    checkForUpdate: performUpdateCheck,
  };
}

