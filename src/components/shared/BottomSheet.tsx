/**
 * BottomSheet Component
 * 
 * Mobile-first bottom sheet that slides up from bottom.
 * On desktop, falls back to centered modal behavior.
 * 
 * Features:
 * - Slides up from bottom on mobile
 * - Swipe-down to dismiss
 * - Keyboard-aware (input never covered)
 * - Three regions: Header (optional), Scrollable content, Sticky footer
 * - Only activates on mobile (window.innerWidth < 768)
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

/** Synchronous mobile check — avoids flash of desktop modal on first render */
function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const isMobileViewport = window.innerWidth < 768;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isMobileViewport || isStandalone || isTouchDevice || isMobileUA;
}

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string; // e.g., "90vh" or "600px"
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  preventClose?: boolean; // Prevents closing via swipe/backdrop
  closeOnRouteChange?: boolean; // Auto-close when route changes (default: true)
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  header,
  children,
  footer,
  maxHeight = '90vh',
  showCloseButton = true,
  closeOnBackdrop = true,
  preventClose = false,
  closeOnRouteChange = true,
}: BottomSheetProps) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(checkIsMobile);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [scrollState, setScrollState] = useState({ isScrolled: false, isScrollable: false, scrollTop: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isDragging: false, startY: 0, currentY: 0 });
  const pathnameWhenOpenedRef = useRef<string | null>(null);
  const isClosingRef = useRef(false);

  // Detect mobile vs desktop — keep in sync on resize
  useEffect(() => {
    const onResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard avoidance: detect virtual keyboard
  useEffect(() => {
    if (!isMobile || !isOpen) {
      setKeyboardHeight(0);
      return;
    }

    const handleResize = () => {
      // Calculate keyboard height by comparing viewport height to window height
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboard = Math.max(0, windowHeight - viewportHeight);
      setKeyboardHeight(keyboard);
    };

    // Use visualViewport API if available (better for mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    handleResize(); // Initial check

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile, isOpen]);

  // Track pathname when sheet opens for route-aware closing
  useEffect(() => {
    if (isOpen && closeOnRouteChange) {
      pathnameWhenOpenedRef.current = location.pathname;
      isClosingRef.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.log('[BottomSheet] Sheet opened, tracking pathname:', location.pathname);
      }
    } else if (!isOpen) {
      pathnameWhenOpenedRef.current = null;
      isClosingRef.current = false;
    }
  }, [isOpen, closeOnRouteChange, location.pathname]);

  // Auto-close on route change (global solution)
  useEffect(() => {
    if (!isOpen || !closeOnRouteChange || isClosingRef.current) return;
    
    // If pathname changed since sheet opened, close it
    if (pathnameWhenOpenedRef.current !== null && pathnameWhenOpenedRef.current !== location.pathname) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BottomSheet] Route changed, auto-closing sheet:', {
          from: pathnameWhenOpenedRef.current,
          to: location.pathname,
        });
      }
      isClosingRef.current = true;
      onClose();
    }
  }, [isOpen, closeOnRouteChange, location.pathname, onClose]);

  // Prevent body scroll when open - CRITICAL: Must restore on unmount
  // This ensures scroll is restored even if component unmounts unexpectedly
  useEffect(() => {
    if (!isOpen) {
      // Ensure scroll is restored when closed
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      return;
    }

    // Lock body scroll when sheet is open
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    
    // Prevent scroll position jump on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    return () => {
      // CRITICAL: Always restore scroll on cleanup
      document.body.style.overflow = originalOverflow || '';
      document.body.style.position = originalPosition || '';
      document.body.style.width = originalWidth || '';
    };
  }, [isOpen]);

  // Track scroll state
  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      setScrollState({ isScrolled: false, isScrollable: false, scrollTop: 0 });
      return;
    }

    const contentEl = contentRef.current;
    
    const handleScroll = () => {
      const scrollTop = contentEl.scrollTop;
      const scrollHeight = contentEl.scrollHeight;
      const clientHeight = contentEl.clientHeight;
      const isScrollable = scrollHeight > clientHeight;
      const isScrolled = scrollTop > 0;

      setScrollState({
        isScrolled,
        isScrollable,
        scrollTop,
      });
    };

    // Initial check
    handleScroll();

    contentEl.addEventListener('scroll', handleScroll);
    
    // Also check on resize (content might change)
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(contentEl);

    return () => {
      contentEl.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [isOpen, children]);

  useEffect(() => {
    if (!isOpen || !footer) {
      setFooterHeight(0);
      return;
    }

    const footerEl = footerRef.current;
    if (!footerEl) return;

    const updateFooterHeight = () => {
      setFooterHeight(footerEl.getBoundingClientRect().height);
    };

    updateFooterHeight();

    const resizeObserver = new ResizeObserver(updateFooterHeight);
    resizeObserver.observe(footerEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, footer]);

  // Touch handlers for swipe-down to dismiss (using native listeners to allow preventDefault)
  useEffect(() => {
    if (!isMobile || !isOpen || preventClose || !sheetRef.current) return;

    const sheetEl = sheetRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startY = touch.clientY;
      dragStateRef.current = { isDragging: true, startY, currentY: startY };
      setDragStartY(startY);
      setDragCurrentY(startY);
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStateRef.current.isDragging) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStateRef.current.startY;

      // Only allow downward swipes and prevent scrolling while dragging
      // Also check if content is scrollable and if we're at the top
      const contentEl = contentRef.current;
      const isContentScrollable = contentEl && contentEl.scrollHeight > contentEl.clientHeight;
      const isAtTop = !contentEl || contentEl.scrollTop === 0;

      // Only prevent default if:
      // 1. Dragging down (deltaY > 0)
      // 2. Either content is not scrollable, or we're at the top of the content
      if (deltaY > 0 && (!isContentScrollable || isAtTop)) {
        dragStateRef.current.currentY = touch.clientY;
        setDragCurrentY(touch.clientY);
        e.preventDefault(); // Prevent scrolling while dragging
      } else if (deltaY > 0) {
        // If content is scrollable and not at top, stop dragging
        dragStateRef.current = { isDragging: false, startY: 0, currentY: 0 };
        setIsDragging(false);
        setDragStartY(0);
        setDragCurrentY(0);
      }
    };

    const handleTouchEnd = () => {
      if (!dragStateRef.current.isDragging) return;

      const deltaY = dragStateRef.current.currentY - dragStateRef.current.startY;
      const threshold = 100; // Minimum swipe distance to dismiss

      if (deltaY > threshold) {
        onClose();
      }

      dragStateRef.current = { isDragging: false, startY: 0, currentY: 0 };
      setIsDragging(false);
      setDragStartY(0);
      setDragCurrentY(0);
    };

    // Attach native event listeners with passive: false on touchmove to allow preventDefault
    sheetEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheetEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheetEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      sheetEl.removeEventListener('touchstart', handleTouchStart);
      sheetEl.removeEventListener('touchmove', handleTouchMove);
      sheetEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, preventClose, onClose]);

  // Calculate transform for drag animation
  const dragOffset = isDragging ? Math.max(0, dragCurrentY - dragStartY) : 0;
  const dragOpacity = isDragging ? Math.max(0.3, 1 - dragOffset / 300) : 1;

  if (!isOpen) return null;

  // Portal target — always render at document.body to escape any parent
  // transform / will-change / filter that would break position:fixed
  const portalRoot = document.body;

  // Desktop: Render as centered modal
  if (!isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center safe-top safe-bottom">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Prevent closing if click is on space switcher trigger
            const target = e.target as HTMLElement;
            if (target.closest('[data-space-switcher="true"]')) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (closeOnBackdrop && !preventClose) {
              onClose();
            }
          }}
        />

        {/* Modal */}
        <div
          ref={sheetRef}
          className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] min-h-0 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with scroll shadow */}
          {(title || header || showCloseButton) && (
            <div 
              className={`flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 transition-shadow ${
                scrollState.isScrolled ? 'shadow-sm' : ''
              }`}
            >
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {header && <div className="flex-1">{header}</div>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Content - Desktop version */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden p-4"
            style={{
              minHeight: 0,
              overscrollBehavior: 'contain', // Prevent scroll chaining
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>,
      portalRoot
    );
  }

  // Mobile: Render as full-screen sheet
  return createPortal(
    <div className="fixed inset-0 z-[100]" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        style={{ opacity: dragOpacity }}
        onClick={(e) => {
          // Prevent closing if click is on space switcher trigger
          const target = e.target as HTMLElement;
          if (target.closest('[data-space-switcher="true"]')) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (closeOnBackdrop && !preventClose) {
            onClose();
          }
        }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute top-0 left-0 right-0 bottom-0 min-h-0 bg-white flex flex-col w-full"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          paddingTop: 'env(safe-area-inset-top)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        {!preventClose && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header with scroll shadow */}
        {(title || header || showCloseButton) && (
          <div 
            className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 transition-shadow ${
              scrollState.isScrolled ? 'shadow-sm' : ''
            }`}
          >
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {header && <div className="flex-1">{header}</div>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content - Single scroll authority for mobile */}
        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3"
          style={{
            paddingBottom: `calc(${footer ? `${footerHeight + 16}px` : '24px'} + env(safe-area-inset-bottom) + ${keyboardHeight}px)`,
            overscrollBehavior: 'contain', // Prevent scroll chaining
            WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
            touchAction: 'pan-y', // Allow vertical scrolling only
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            ref={footerRef}
            className="border-t border-gray-200 px-4 py-3 flex-shrink-0 safe-bottom bg-white"
            style={{ paddingBottom: `calc(12px + env(safe-area-inset-bottom))` }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
}
