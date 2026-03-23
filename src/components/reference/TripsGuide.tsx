/**
 * Trips Guide - Entry Point
 * 
 * Phase 9: Platform-aware Trips guide.
 */

import { TripsGuideMobile } from './TripsGuideMobile';
import { TripsGuideWeb } from './TripsGuideWeb';

interface TripsGuideProps {
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

export function TripsGuide({
  isOpen,
  onClose,
  onBack,
}: TripsGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <TripsGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <TripsGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
