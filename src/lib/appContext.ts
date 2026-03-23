// Phase 3B: App Context Detection
// Phase 3C: Enhanced with install prompt prevention
// Detects whether the app is running as an installed PWA (standalone mode)
// or in a normal browser tab

/**
 * Detects if the app is running in standalone mode (installed PWA)
 * Uses display-mode media query (standard) and navigator.standalone (iOS fallback)
 */
export function isStandaloneApp(): boolean {
  // Standard method: Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS Safari fallback: navigator.standalone is true when added to home screen
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Returns the app context type for conditional behavior
 */
export type AppContext = 'app' | 'browser';

export function getAppContext(): AppContext {
  return isStandaloneApp() ? 'app' : 'browser';
}

/**
 * Phase 3C: Prevent install prompts in installed app
 * Returns true if app is already installed, false if in browser
 */
export function isAppInstalled(): boolean {
  return isStandaloneApp();
}

