/**
 * People Guide - Entry Point
 * 
 * Phase 9: Platform-aware People guide.
 */

import { PeopleGuideMobile } from './PeopleGuideMobile';
import { PeopleGuideWeb } from './PeopleGuideWeb';

interface PeopleGuideProps {
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

export function PeopleGuide({
  isOpen,
  onClose,
  onBack,
}: PeopleGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <PeopleGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <PeopleGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
