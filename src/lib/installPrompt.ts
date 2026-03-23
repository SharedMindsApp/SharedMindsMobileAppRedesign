// Phase 3C: Install Prompt Prevention
// Ensures install prompts never show in installed app
// Respects native browser install heuristics (no custom banners)

import { isStandaloneApp } from './appContext';

/**
 * Phase 3C: Prevent install prompt from showing in installed app
 * Should be called early in app lifecycle
 */
export function preventInstallPromptInApp(): void {
  // Phase 3C: If app is already installed, do nothing
  if (isStandaloneApp()) {
    return;
  }

  // Phase 3C: For browser users, let native install prompts work naturally
  // We don't implement custom install banners - let browser handle it
  // This respects user preferences and avoids spam
}

/**
 * Phase 3C: Check if install prompt should be shown
 * Returns false if app is installed, true if in browser (but we don't show custom prompts)
 */
export function shouldShowInstallPrompt(): boolean {
  // Phase 3C: Never show install prompt if app is already installed
  if (isStandaloneApp()) {
    return false;
  }

  // Phase 3C: In browser, we let native prompts work (no custom implementation)
  return false; // We don't implement custom prompts
}



