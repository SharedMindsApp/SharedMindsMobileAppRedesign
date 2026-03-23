/**
 * WidgetHeader Component
 * 
 * Standardized header layout for context-aware widgets.
 * Provides consistent placement of title, metadata, and space context switcher.
 */

import { ReactNode } from 'react';
import { SpaceContextSwitcher } from './SpaceContextSwitcher';

import { SpaceOption } from '../../hooks/useSpaceContext';

interface WidgetHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
  currentSpaceId?: string;
  onSpaceChange?: (spaceId: string) => void;
  availableSpaces?: SpaceOption[];
  showSpaceSwitcher?: boolean;
  className?: string;
}

export function WidgetHeader({
  icon,
  title,
  subtitle,
  actions,
  currentSpaceId,
  onSpaceChange,
  availableSpaces,
  showSpaceSwitcher = false,
  className = '',
}: WidgetHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 ${className}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            {/* Desktop space switcher - positioned next to title */}
            {showSpaceSwitcher && currentSpaceId && onSpaceChange && availableSpaces && (
              <div className="hidden sm:block">
                <SpaceContextSwitcher
                  currentSpaceId={currentSpaceId}
                  onSpaceChange={onSpaceChange}
                  availableSpaces={availableSpaces}
                />
              </div>
            )}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-700 font-medium mt-0.5">
              {typeof subtitle === 'string' ? <span>{subtitle}</span> : subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {actions}
      </div>
    </div>
  );
}
