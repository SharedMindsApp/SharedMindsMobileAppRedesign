/**
 * Teams Guide - Entry Point
 * 
 * Phase 9: Platform-aware Teams guide.
 */

import { TeamsGuideMobile } from './TeamsGuideMobile';
import { TeamsGuideWeb } from './TeamsGuideWeb';

interface TeamsGuideProps {
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

export function TeamsGuide({
  isOpen,
  onClose,
  onBack,
}: TeamsGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <TeamsGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <TeamsGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
