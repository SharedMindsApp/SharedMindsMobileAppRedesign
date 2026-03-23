/**
 * Calendar Guide - Entry Point
 * 
 * Phase 9: Platform-aware Calendar guide.
 */

import { CalendarGuideMobile } from './CalendarGuideMobile';
import { CalendarGuideWeb } from './CalendarGuideWeb';

interface CalendarGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

/**
 * Detect if we're on mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function CalendarGuide({
  isOpen,
  onClose,
  onBack,
}: CalendarGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <CalendarGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <CalendarGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
