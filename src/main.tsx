// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/offlineInit'; // Phase 4B: Initialize offline action handlers
import { initGlobalErrorHandlers } from './lib/globalErrorHandlers'; // Phase 11: Initialize global error handlers
import { logInitError } from './lib/initDiagnostics';

// 👉 Import Supabase and expose it for debugging
import { supabase } from './lib/supabase';

// Make Supabase available in browser devtools:
// Run: supabase.auth.getUser().then(console.log)
(window as any).supabase = supabase;

// Phase 2A: Mobile Safety - Global input focus scroll handler
// Ensures inputs scroll into view when focused on mobile to prevent keyboard covering
document.addEventListener('focusin', (e: FocusEvent) => {
  const target = e.target as HTMLElement;
  if (
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
    target.type !== 'hidden' &&
    !target.closest('[data-no-scroll-on-focus]') // Allow opt-out
  ) {
    // Small delay to allow keyboard animation on mobile
    setTimeout(() => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 300);
  }
});

// Phase 8: Global error handlers for chunk load errors
import { handleChunkLoadError } from './lib/serviceWorkerRecovery';

// Phase 8: Handle chunk load errors globally
window.addEventListener('error', (event) => {
  if (event.error) {
    const handled = handleChunkLoadError(event.error);
    if (handled) {
      event.preventDefault(); // Prevent default error handling
    }
  }
});

// Phase 8: Handle unhandled promise rejections (chunk load errors often appear here)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason instanceof Error) {
    const handled = handleChunkLoadError(event.reason);
    if (handled) {
      event.preventDefault(); // Prevent default error handling
    }
  }
});

// Phase 3A: Register Service Worker (Production Only)
// Phase 3C: Enhanced with update handling
// Phase 8: Enhanced with recovery detection
// Service worker is disabled in dev to avoid caching issues during development
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // FIXED: More frequent update checks (moved below, see above)

        // FIXED: Enhanced service worker update detection
        // Phase 3C: Handle service worker updates
        // Phase 8: Don't auto-reload, let boot system handle it
        // Phase 9: Enhanced update detection for in-app update banner
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Phase 9: Signal update available - service worker is waiting
                // The update banner will show and allow user to confirm
                console.log('[ServiceWorker] New version installed, waiting for activation');
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { waiting: true, state: 'installed' }
                }));
              }
            });
          }
        });

        // Phase 9: Check for waiting service worker on registration (immediate check)
        if (registration.waiting && navigator.serviceWorker.controller) {
          console.log('[ServiceWorker] Waiting service worker detected on registration');
          window.dispatchEvent(new CustomEvent('sw-update-available', {
            detail: { waiting: true, state: 'waiting' }
          }));
        }
        
        // FIXED: Also check periodically for updates (more aggressive checking)
        // Check every 5 minutes instead of just on registration
        setInterval(() => {
          registration.update().catch(err => {
            console.warn('[ServiceWorker] Update check failed:', err);
          });
        }, 5 * 60 * 1000); // 5 minutes
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
        // Phase 8: Signal service worker error to boot system
        window.dispatchEvent(new CustomEvent('sw-registration-failed', { detail: error }));
      });
  });
}

// Phase 3A: Detect Standalone Mode
// Phase 3B: Use centralized app context detection
// Phase 3C: Enhanced visual identity
import { isStandaloneApp } from './lib/appContext';
import { preventInstallPromptInApp } from './lib/installPrompt';
// Phase 8B: Pull-to-refresh guard for installed PWA
import { initPullToRefreshGuard } from './lib/pullToRefreshGuard';

// Phase 3C: Add standalone mode class for styling
if (isStandaloneApp()) {
  document.documentElement.classList.add('standalone-mode');
  // Phase 3C: Prevent any install prompts in installed app
  preventInstallPromptInApp();
  // Phase 8B: Initialize pull-to-refresh guard
  initPullToRefreshGuard();
}

// Phase 11: Initialize global error handlers for mobile debugging
import { checkStorageQuota } from './lib/errorLogger';

// Check storage quota before initializing error handlers
checkStorageQuota();

initGlobalErrorHandlers();

// ---- Mount App ----
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

const root = createRoot(rootElement);

// Wrap render in try-catch to catch initialization errors
try {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  // If rendering fails, show error message
  logInitError('render', error);
  console.error('[main.tsx] Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto;">
      <h1 style="color: #dc2626; margin-bottom: 10px;">Application Error</h1>
      <p style="color: #4b5563; margin-bottom: 10px;">Failed to initialize the application.</p>
      <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px; max-width: 100%;">${error instanceof Error ? error.message : String(error)}</pre>
      <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">Check browser console (F12) for more details. Errors are also logged to localStorage under 'app-init-errors'.</p>
    </div>
  `;
}
