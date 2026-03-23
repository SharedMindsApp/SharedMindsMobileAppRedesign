/**
 * Installed-PWA pull-to-refresh guard.
 *
 * Prevents native pull-to-refresh from escaping the SPA without forcing a
 * full-page reload of the current route. This keeps users on the page they are
 * already using, which is especially important for Pantry on mobile.
 */

import { isStandaloneApp } from './appContext';

let isGuardActive = false;
const EDGE_GESTURE_THRESHOLD_PX = 24;

function isScrollableElement(node: HTMLElement): boolean {
  const style = window.getComputedStyle(node);
  const overflowY = style.overflowY;
  return (
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    node.scrollHeight > node.clientHeight
  );
}

function hasScrollableAncestorAboveTop(target: EventTarget | null): boolean {
  let current = target instanceof HTMLElement ? target : null;

  while (current && current !== document.body) {
    if (isScrollableElement(current) && current.scrollTop > 0) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function hasHorizontallyScrollableAncestor(target: EventTarget | null): boolean {
  let current = target instanceof HTMLElement ? target : null;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      current.scrollWidth > current.clientWidth;

    if (canScrollX) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

/**
 * Initialize pull-to-refresh suppression for installed PWAs.
 * This blocks the browser refresh gesture but does not replace it with
 * `window.location.reload()`, which was causing Pantry to reset on mobile.
 */
export function initPullToRefreshGuard(): void {
  if (!isStandaloneApp() || isGuardActive) {
    return;
  }

  isGuardActive = true;

  let touchStartY = 0;
  let touchCurrentY = 0;
  let touchStartX = 0;

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCurrentY = touch.clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    touchCurrentY = touch.clientY;
    const deltaY = touchCurrentY - touchStartY;
    const startNearLeftEdge = touchStartX <= EDGE_GESTURE_THRESHOLD_PX;
    const startNearRightEdge = window.innerWidth - touchStartX <= EDGE_GESTURE_THRESHOLD_PX;

    if ((startNearLeftEdge || startNearRightEdge) && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      if (!hasHorizontallyScrollableAncestor(event.target)) {
        event.preventDefault();
      }
      return;
    }

    if (deltaY <= 0) {
      return;
    }

    if (hasScrollableAncestorAboveTop(event.target)) {
      return;
    }

    const rootScrollTop =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (rootScrollTop <= 0 && deltaY > 12) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    touchStartX = 0;
    touchStartY = 0;
    touchCurrentY = 0;
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      body {
        overscroll-behavior-y: contain;
      }
      @media (display-mode: standalone) {
        html, body, #root {
          overscroll-behavior-y: contain;
          overscroll-behavior-x: contain;
          touch-action: manipulation;
        }
      }
    `;
    document.head.appendChild(style);
  }

  console.log('[PullToRefreshGuard] Initialized for installed PWA');
}

export function cleanupPullToRefreshGuard(): void {
  if (!isGuardActive) {
    return;
  }

  isGuardActive = false;
}
