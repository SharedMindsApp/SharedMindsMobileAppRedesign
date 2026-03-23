/**
 * PillActionNav
 * 
 * Unified pill-style bottom action navigation for Calendar, Planner, and Guardrails.
 * 
 * A single floating pill containing three actions:
 * - Left: Settings/Configuration
 * - Middle: Quick Actions
 * - Right: Areas/Life Areas
 * 
 * Features:
 * - Pill-shaped floating navigation (mobile-only)
 * - Fixed to bottom center
 * - Soft shadow and background blur
 * - Three independently tappable sections
 * - Active press states
 * - Always visible (non-dismissible)
 * 
 * ⚠️ CRITICAL: This component is render-only. No services, no navigation logic.
 * Parent controls visibility & callbacks.
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface PillAction {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

export interface PillActionNavProps {
  leftAction: PillAction;
  middleAction?: PillAction;
  rightAction: PillAction;
  visible?: boolean;
  leftActive?: boolean;
  middleActive?: boolean;
  rightActive?: boolean;
}

export function PillActionNav({
  leftAction,
  middleAction,
  rightAction,
  visible = true,
  leftActive = false,
  middleActive = false,
  rightActive = false,
}: PillActionNavProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [leftPressed, setLeftPressed] = useState(false);
  const [middlePressed, setMiddlePressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on desktop
  if (!isMobile || !visible) {
    return null;
  }

  const handleLeftPress = () => {
    setLeftPressed(true);
    setTimeout(() => setLeftPressed(false), 150);
    leftAction.onPress();
  };

  const handleMiddlePress = () => {
    if (!middleAction) return;
    setMiddlePressed(true);
    setTimeout(() => setMiddlePressed(false), 150);
    middleAction.onPress();
  };

  const handleRightPress = () => {
    setRightPressed(true);
    setTimeout(() => setRightPressed(false), 150);
    rightAction.onPress();
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-4 safe-bottom"
      aria-label="Bottom action navigation"
      style={{
        // Z-Index Layer: 200 - Pill Action Nav
        // This component sits above main content but below overlays and side navigation
        // See z-index hierarchy documentation in GuardrailsLayout.tsx
        zIndex: 200,
      }}
    >
      {/* Pill Container */}
      <div
        className={`
          flex items-center
          bg-white/95 backdrop-blur-md
          rounded-full
          shadow-lg border border-gray-200/50
          overflow-hidden
          transition-all duration-200
        `}
        style={{
          minHeight: '56px',
          // Icon-only: smaller width needed
          minWidth: middleAction ? '168px' : '112px',
        }}
      >
        {/* Left Action */}
        <button
          onClick={handleLeftPress}
          onTouchStart={() => setLeftPressed(true)}
          onTouchEnd={() => {
            setTimeout(() => setLeftPressed(false), 150);
          }}
          className={`
            flex-1 flex items-center justify-center
            px-4 py-3
            min-h-[56px]
            transition-all duration-150
            border-r border-gray-200/50
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-inset
            ${leftActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }
            ${leftPressed ? 'scale-95 opacity-80' : ''}
          `}
          aria-label={leftAction.label}
          aria-pressed={leftActive}
          style={{
            minWidth: '56px', // Minimum tap target
          }}
        >
          <div
            className={`
              flex-shrink-0
              ${leftActive ? 'text-blue-600' : 'text-gray-600'}
              transition-colors duration-150
            `}
            style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {leftAction.icon}
          </div>
        </button>

        {/* Middle Action (if provided) */}
        {middleAction && (
          <button
            onClick={handleMiddlePress}
            onTouchStart={() => setMiddlePressed(true)}
            onTouchEnd={() => {
              setTimeout(() => setMiddlePressed(false), 150);
            }}
            className={`
              flex-1 flex items-center justify-center
              px-4 py-3
              min-h-[56px]
              transition-all duration-150
              border-r border-gray-200/50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-inset
              ${middleActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              }
              ${middlePressed ? 'scale-95 opacity-80' : ''}
            `}
            aria-label={middleAction.label}
            aria-pressed={middleActive}
            style={{
              minWidth: '56px', // Minimum tap target
            }}
          >
            <div
              className={`
                flex-shrink-0
                ${middleActive ? 'text-blue-600' : 'text-gray-600'}
                transition-colors duration-150
              `}
              style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {middleAction.icon}
            </div>
          </button>
        )}

        {/* Right Action */}
        <button
          onClick={handleRightPress}
          onTouchStart={() => setRightPressed(true)}
          onTouchEnd={() => {
            setTimeout(() => setRightPressed(false), 150);
          }}
          className={`
            flex-1 flex items-center justify-center
            px-4 py-3
            min-h-[56px]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-inset
            ${rightActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }
            ${rightPressed ? 'scale-95 opacity-80' : ''}
          `}
          aria-label={rightAction.label}
          aria-pressed={rightActive}
          style={{
            minWidth: '56px', // Minimum tap target
          }}
        >
          <div
            className={`
              flex-shrink-0
              ${rightActive ? 'text-blue-600' : 'text-gray-600'}
              transition-colors duration-150
            `}
            style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {rightAction.icon}
          </div>
        </button>
      </div>
    </nav>
  );
}
