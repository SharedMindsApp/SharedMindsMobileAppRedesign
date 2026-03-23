/**
 * Phase 8B: Pull-to-Refresh Guard for Installed PWA
 * 
 * Prevents pull-to-refresh from escaping to Vercel error pages.
 * Ensures refresh stays within the SPA context.
 */

import { isStandaloneApp } from './appContext';

let isGuardActive = false;

/**
 * Phase 8B: Initialize pull-to-refresh guard for installed PWA
 * Should be called once during app initialization
 */
export function initPullToRefreshGuard(): void {
  // Only activate in installed PWA
  if (!isStandaloneApp()) {
    return;
  }

  if (isGuardActive) {
    return; // Already initialized
  }

  isGuardActive = true;

  // Phase 8B: Prevent default pull-to-refresh behavior
  // This ensures refresh stays within the SPA
  let touchStartY = 0;
  let touchEndY = 0;
  let isScrolling = false;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
    isScrolling = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndY = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // FIXED: Check if app guide is open - if so, prevent all pull-to-refresh
    const appGuideOpen = sessionStorage.getItem('app_guide_open') === 'true';
    if (appGuideOpen && scrollTop === 0 && touchEndY > touchStartY) {
      // App guide is open - prevent pull-to-refresh completely
      e.preventDefault();
      isScrolling = false; // Don't mark as scrolling to prevent reload
      return;
    }
    
    // FIXED: Check if add widget modal is open - if so, prevent all pull-to-refresh
    const addWidgetModalOpen = sessionStorage.getItem('add_widget_modal_open') === 'true';
    if (addWidgetModalOpen && scrollTop === 0 && touchEndY > touchStartY) {
      // Add widget modal is open - prevent pull-to-refresh completely
      e.preventDefault();
      isScrolling = false; // Don't mark as scrolling to prevent reload
      return;
    }
    
    // FIXED: Check if user is on Spaces page - prevent pull-to-refresh on Spaces
    // Spaces routes: /spaces, /spaces/personal, /spaces/shared, /spaces/:spaceId
    const isOnSpacesPage = window.location.pathname.startsWith('/spaces');
    if (isOnSpacesPage && scrollTop === 0 && touchEndY > touchStartY) {
      // User is on Spaces page - prevent pull-to-refresh to keep them on the page
      e.preventDefault();
      isScrolling = false; // Don't mark as scrolling to prevent reload
      return;
    }
    
    // Phase 8B: If user is at top of page and pulling down, prevent default
    // This prevents native pull-to-refresh that could escape to error page
    if (scrollTop === 0 && touchEndY > touchStartY) {
      // Only prevent if pull is significant (more than 50px)
      if (touchEndY - touchStartY > 50) {
        e.preventDefault();
        isScrolling = true;
      }
    }
  };

  const handleTouchEnd = () => {
    // FIXED: Check if app guide is open before reloading
    // If guide is open, prevent reload to keep user in guide
    const appGuideOpen = sessionStorage.getItem('app_guide_open') === 'true';
    
    // FIXED: Check if add widget modal is open before reloading
    // If modal is open, prevent reload to keep user in modal
    const addWidgetModalOpen = sessionStorage.getItem('add_widget_modal_open') === 'true';
    
    // FIXED: Check if user is on Spaces page before reloading
    // If on Spaces, prevent reload to keep user on the page
    // Spaces routes: /spaces, /spaces/personal, /spaces/shared, /spaces/:spaceId
    const isOnSpacesPage = window.location.pathname.startsWith('/spaces');
    
    // Phase 8B: If user pulled down significantly at top, reload app shell
    // This ensures refresh happens within SPA context
    // BUT: Don't reload if app guide, add widget modal, or Spaces page is open
    if (isScrolling && touchEndY - touchStartY > 100) {
      if (appGuideOpen) {
        // App guide is open - prevent reload to keep user in guide
        console.log('[PullToRefreshGuard] App guide is open, preventing reload');
        touchStartY = 0;
        touchEndY = 0;
        isScrolling = false;
        return;
      }
      if (addWidgetModalOpen) {
        // Add widget modal is open - prevent reload to keep user in modal
        console.log('[PullToRefreshGuard] Add widget modal is open, preventing reload');
        touchStartY = 0;
        touchEndY = 0;
        isScrolling = false;
        return;
      }
      if (isOnSpacesPage) {
        // User is on Spaces page - prevent reload to keep them on the page
        console.log('[PullToRefreshGuard] User is on Spaces page, preventing reload');
        touchStartY = 0;
        touchEndY = 0;
        isScrolling = false;
        return;
      }
      // Reload the app shell (will be handled by service worker)
      window.location.reload();
    }
    touchStartY = 0;
    touchEndY = 0;
    isScrolling = false;
  };

  // Phase 8B: Add touch event listeners
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Phase 8B: Also prevent overscroll behavior that could trigger refresh
  // This CSS approach works on some browsers
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      body {
        overscroll-behavior-y: contain;
      }
      @media (display-mode: standalone) {
        body {
          overscroll-behavior-y: contain;
          overscroll-behavior-x: contain;
        }
      }
    `;
    document.head.appendChild(style);
  }

  console.log('[PullToRefreshGuard] Initialized for installed PWA');
}

/**
 * Phase 8B: Cleanup pull-to-refresh guard
 */
export function cleanupPullToRefreshGuard(): void {
  if (!isGuardActive) {
    return;
  }

  // Note: We don't remove event listeners here as they're attached to document
  // This is fine as the guard should persist for the app lifetime
  isGuardActive = false;
}


