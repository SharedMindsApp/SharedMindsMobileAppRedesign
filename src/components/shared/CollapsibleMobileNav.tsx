/**
 * CollapsibleMobileNav
 * 
 * Canonical calendar navigation for BOTH Planner and SpacesOS.
 * Any change here affects both.
 * 
 * ❌ Do not fork
 * ❌ Do not override styling per context
 * ✅ Context differences via props only
 * 
 * Features:
 * - Default expanded state
 * - Collapse via swipe down gesture
 * - Long-press on buttons to reveal collapse hint (▾)
 * - Minimal inline recovery handle (▴) when collapsed - no background bar
 * - Smooth fade animations (150-200ms)
 * - Mobile-only (hidden on desktop)
 * - Maximum content space preservation
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';

interface CollapsibleMobileNavProps {
  leftButton: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    isActive: boolean;
    ariaLabel: string;
  };
  rightButton: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    isActive: boolean;
    ariaLabel: string;
  };
  className?: string;
}

export function CollapsibleMobileNav({
  leftButton,
  rightButton,
  className = '',
}: CollapsibleMobileNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCollapseHint, setShowCollapseHint] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeThreshold = 30; // Minimum swipe distance
  
  // Track if long-press occurred to prevent normal navigation
  const longPressHandlersRef = useRef<ReturnType<typeof useLongPress> | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide collapse hint when navigation state changes
  useEffect(() => {
    setShowCollapseHint(false);
    if (longPressHandlersRef.current) {
      longPressHandlersRef.current.didLongPressRef.current = false;
      longPressHandlersRef.current.resetLongPress();
    }
  }, [isCollapsed]);

  // Long-press handler to show collapse hint
  const handleLongPress = () => {
    if (isCollapsed) return;
    if (longPressHandlersRef.current) {
      longPressHandlersRef.current.didLongPressRef.current = true;
    }
    setShowCollapseHint(true);
  };

  // Create long-press handlers (shared for both buttons)
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    threshold: 500,
    movementThreshold: 10,
  });

  // Store handlers ref for reset
  longPressHandlersRef.current = longPressHandlers;

  // Handle button click with long-press protection
  const handleButtonClick = (originalOnClick: () => void, e: React.MouseEvent | React.TouchEvent) => {
    // If long-press occurred, prevent normal navigation
    if (longPressHandlersRef.current?.didLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressHandlersRef.current.didLongPressRef.current = false;
      return;
    }
    originalOnClick();
  };

  // Handle swipe down to collapse
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Only track if touching the nav container, not action buttons
    if (target.closest('button[aria-label="Calendar"], button[aria-label="Life Areas"], button[aria-label="Widgets"]')) {
      return; // Don't track swipes on action buttons
    }
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current || isCollapsed) return;
    
    const target = e.target as HTMLElement;
    // Don't trigger swipe if user is interacting with buttons
    if (target.closest('button[aria-label="Calendar"], button[aria-label="Life Areas"], button[aria-label="Widgets"]')) {
      touchStartY.current = null;
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Only allow swipe down (positive deltaY)
    if (deltaY > swipeThreshold) {
      setIsCollapsed(true);
      setShowCollapseHint(false);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleCollapse = () => {
    setIsCollapsed(true);
    setShowCollapseHint(false);
    if (longPressHandlersRef.current) {
      longPressHandlersRef.current.didLongPressRef.current = false;
      longPressHandlersRef.current.resetLongPress();
    }
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    setShowCollapseHint(false);
    if (longPressHandlersRef.current) {
      longPressHandlersRef.current.didLongPressRef.current = false;
      longPressHandlersRef.current.resetLongPress();
    }
  };

  const handleCollapseHintClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleCollapse();
  };

  // Hide hint when clicking outside
  useEffect(() => {
    if (showCollapseHint && !isCollapsed) {
      const handleClickOutside = (e: Event) => {
        const target = e.target as HTMLElement;
        // Don't hide if clicking the hint button itself
        if (target.closest('button[aria-label="Hide navigation"]')) {
          return;
        }
        setShowCollapseHint(false);
        if (longPressHandlersRef.current) {
          longPressHandlersRef.current.didLongPressRef.current = false;
          longPressHandlersRef.current.resetLongPress();
        }
      };
      
      // Hide hint after a delay if not interacted with
      const timeoutId = setTimeout(() => {
        setShowCollapseHint(false);
        if (longPressHandlersRef.current) {
          longPressHandlersRef.current.didLongPressRef.current = false;
          longPressHandlersRef.current.resetLongPress();
        }
      }, 3000);

      document.addEventListener('touchstart', handleClickOutside, { once: true });
      document.addEventListener('mousedown', handleClickOutside, { once: true });

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCollapseHint, isCollapsed]);

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  const LeftIcon = leftButton.icon;
  const RightIcon = rightButton.icon;

  return (
    <>
      {/* Long-Press Collapse Hint (▾) - Appears on long-press */}
      {showCollapseHint && !isCollapsed && (
        <button
          onClick={handleCollapseHintClick}
          onTouchEnd={(e) => {
            e.currentTarget.style.opacity = '0.65';
            handleCollapseHintClick();
          }}
          className={`
            lg:hidden fixed left-1/2 -translate-x-1/2
            z-[60]
            min-w-[44px] min-h-[44px] flex items-center justify-center
            transition-opacity duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
            rounded-full
          `}
          style={{
            bottom: `calc(max(env(safe-area-inset-bottom, 0), 0px) + 60px)`,
            opacity: 0.65,
          }}
          aria-label="Hide navigation"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.65';
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
        >
          <ChevronDown 
            size={17} 
            className="text-gray-600 pointer-events-none" 
            style={{ opacity: 1 }}
          />
        </button>
      )}

      {/* Main Navigation Bar */}
      <nav
        ref={navRef}
        className={`
          lg:hidden fixed bottom-0 left-0 right-0
          bg-white/95 backdrop-blur-md border-t border-gray-300 shadow-2xl z-50
          safe-bottom overscroll-contain
          transition-transform duration-200 ease-in-out
          ${isCollapsed ? 'translate-y-full' : 'translate-y-0'}
          ${className}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Navigation collapsed' : 'Navigation expanded'}
      >
        {/* Menu Toggle Buttons */}
        <div className="flex items-center">
          <button
            onClick={(e) => handleButtonClick(leftButton.onClick, e)}
            onPointerDown={longPressHandlers.onPointerDown}
            onPointerMove={longPressHandlers.onPointerMove}
            onPointerUp={longPressHandlers.onPointerUp}
            onPointerCancel={longPressHandlers.onPointerCancel}
            onTouchStart={longPressHandlers.onTouchStart}
            onTouchMove={longPressHandlers.onTouchMove}
            onTouchEnd={(e) => {
              longPressHandlers.onTouchEnd(e);
            }}
            onTouchCancel={longPressHandlers.onTouchCancel}
            className={`
              flex-1 py-3 px-2 text-xs font-bold uppercase transition-colors
              min-h-[44px] flex flex-col items-center justify-center
              ${leftButton.isActive
                ? 'bg-blue-100 text-blue-700 active:bg-blue-200 ring-2 ring-blue-300'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }
            `}
            aria-label={leftButton.ariaLabel}
            aria-pressed={leftButton.isActive}
          >
            <LeftIcon className="w-4 h-4 mb-1" />
            {leftButton.label}
          </button>
          <button
            onClick={(e) => handleButtonClick(rightButton.onClick, e)}
            onPointerDown={longPressHandlers.onPointerDown}
            onPointerMove={longPressHandlers.onPointerMove}
            onPointerUp={longPressHandlers.onPointerUp}
            onPointerCancel={longPressHandlers.onPointerCancel}
            onTouchStart={longPressHandlers.onTouchStart}
            onTouchMove={longPressHandlers.onTouchMove}
            onTouchEnd={(e) => {
              longPressHandlers.onTouchEnd(e);
            }}
            onTouchCancel={longPressHandlers.onTouchCancel}
            className={`
              flex-1 py-3 px-2 text-xs font-bold uppercase transition-colors
              min-h-[44px] flex flex-col items-center justify-center
              ${rightButton.isActive
                ? 'bg-blue-100 text-blue-700 active:bg-blue-200 ring-2 ring-blue-300'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }
            `}
            aria-label={rightButton.ariaLabel}
            aria-pressed={rightButton.isActive}
          >
            <RightIcon className="w-4 h-4 mb-1" />
            {rightButton.label}
          </button>
        </div>
      </nav>

      {/* Minimal Inline Recovery Handle (▴) - Only visible when collapsed */}
      {isCollapsed && (
        <button
          onClick={handleExpand}
          className={`
            lg:hidden fixed left-1/2 -translate-x-1/2
            z-50
            min-w-[44px] min-h-[44px] flex items-center justify-center
            transition-opacity duration-150 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            rounded-full
          `}
          style={{
            bottom: `max(env(safe-area-inset-bottom, 0) + 8px, 8px)`,
            opacity: 0.5,
          }}
          aria-label="Show navigation"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5';
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.opacity = '0.5';
          }}
        >
          <ChevronUp 
            size={17} 
            className="text-gray-700 pointer-events-none" 
            style={{ opacity: 1 }}
          />
        </button>
      )}
    </>
  );
}
