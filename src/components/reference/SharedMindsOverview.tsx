/**
 * SharedMinds Overview Guide - Entry Point
 * 
 * Phase 9: Platform-aware SharedMinds overview guide.
 */

import { SharedMindsOverviewMobile } from './SharedMindsOverviewMobile';
import { SharedMindsOverviewWeb } from './SharedMindsOverviewWeb';

interface SharedMindsOverviewProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Detect if we're on mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function SharedMindsOverview({
  isOpen,
  onClose,
}: SharedMindsOverviewProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <SharedMindsOverviewMobile
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <SharedMindsOverviewWeb
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
