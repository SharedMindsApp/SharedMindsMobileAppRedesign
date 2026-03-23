/**
 * Hard Reset Utility - Complete App Recovery
 * 
 * Provides a nuclear reset option that clears ALL app state, caches, and storage.
 * This should be used when the app is completely wedged and needs a fresh start.
 * 
 * IMPORTANT: This clears EVERYTHING - use only as a last resort recovery mechanism.
 */

import { supabase } from './supabase';

export interface HardResetOptions {
  /**
   * Whether to clear authentication state and redirect to login
   */
  clearAuth?: boolean;
  /**
   * Whether to clear all localStorage
   */
  clearLocalStorage?: boolean;
  /**
   * Whether to clear all sessionStorage
   */
  clearSessionStorage?: boolean;
  /**
   * Whether to unregister all service workers
   */
  clearServiceWorkers?: boolean;
  /**
   * Whether to clear all caches
   */
  clearCaches?: boolean;
  /**
   * Whether to redirect to a specific route after reset
   */
  redirectTo?: string;
  /**
   * Whether to reload the page after reset
   */
  reload?: boolean;
}

const DEFAULT_OPTIONS: Required<HardResetOptions> = {
  clearAuth: true,
  clearLocalStorage: true,
  clearSessionStorage: true,
  clearServiceWorkers: true,
  clearCaches: true,
  redirectTo: '/auth/login',
  reload: true,
};

/**
 * Performs a hard reset of the application, clearing all state, caches, and storage.
 * This is the nuclear option for when the app is completely wedged.
 * 
 * @param options - Configuration options for the reset
 */
export async function hardReset(options: Partial<HardResetOptions> = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Step 1: Clear authentication state (if requested)
    if (opts.clearAuth) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[HardReset] Error signing out:', error);
        // Continue anyway - we'll clear storage below
      }
    }

    // Step 2: Unregister all service workers (if requested)
    if (opts.clearServiceWorkers && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      } catch (error) {
        console.error('[HardReset] Error unregistering service workers:', error);
        // Continue anyway
      }
    }

    // Step 3: Clear all caches (if requested)
    if (opts.clearCaches && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (error) {
        console.error('[HardReset] Error clearing caches:', error);
        // Continue anyway
      }
    }

    // Step 4: Clear sessionStorage (if requested)
    if (opts.clearSessionStorage) {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.error('[HardReset] Error clearing sessionStorage:', error);
        // Continue anyway
      }
    }

    // Step 5: Clear localStorage (if requested)
    if (opts.clearLocalStorage) {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('[HardReset] Error clearing localStorage:', error);
        // If clear() fails, try removing keys one by one
        try {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
          }
          keys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch {
              // Ignore individual key errors
            }
          });
        } catch {
          // Can't do anything more
        }
      }
    }

    // Step 6: Force clear any remaining Supabase auth state
    // This is a last-ditch attempt to clear auth even if signOut failed
    try {
      // Remove all Supabase-related keys
      const supabaseKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          supabaseKeys.push(key);
        }
      }
      supabaseKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      });
    } catch {
      // Ignore
    }

    // Step 7: Reload or redirect (if requested)
    if (opts.reload) {
      if (opts.redirectTo) {
        // Use replace to avoid adding to history
        window.location.replace(opts.redirectTo);
      } else {
        window.location.reload();
      }
    } else if (opts.redirectTo) {
      window.location.href = opts.redirectTo;
    }
  } catch (error) {
    console.error('[HardReset] Fatal error during hard reset:', error);
    // Last resort: force reload
    try {
      window.location.replace('/auth/login');
    } catch {
      // Can't do anything more - app is completely broken
    }
  }
}

/**
 * Clears only authentication-related state without clearing other app data.
 * Useful for logout scenarios where we want to preserve some user preferences.
 */
export async function clearAuthStateOnly(): Promise<void> {
  try {
    // Sign out
    await supabase.auth.signOut();
    
    // Clear only auth-related localStorage keys
    const authKeys = [
      'supabase.auth.token',
      'sb-auth-token',
      'sb-auth-token-code-verifier',
      'supabase.auth.refreshToken',
    ];
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    });
    
    // Clear Supabase-related keys
    const supabaseKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.startsWith('sb-'))) {
        supabaseKeys.push(key);
      }
    }
    supabaseKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    });
    
    // Redirect to login
    window.location.replace('/auth/login');
  } catch (error) {
    console.error('[HardReset] Error clearing auth state:', error);
    // Force redirect anyway
    window.location.replace('/auth/login');
  }
}
