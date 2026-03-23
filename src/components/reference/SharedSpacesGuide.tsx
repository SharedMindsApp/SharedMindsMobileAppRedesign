/**
 * Shared Spaces Guide - Entry Point
 * 
 * Phase 9: Platform-aware Shared Spaces guide.
 */

import { SharedSpacesGuideMobile } from './SharedSpacesGuideMobile';
import { SharedSpacesGuideWeb } from './SharedSpacesGuideWeb';

interface SharedSpacesGuideProps {
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

export function SharedSpacesGuide({
  isOpen,
  onClose,
  onBack,
}: SharedSpacesGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <SharedSpacesGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <SharedSpacesGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
