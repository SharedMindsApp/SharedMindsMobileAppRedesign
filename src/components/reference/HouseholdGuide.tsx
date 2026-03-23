/**
 * Household Guide - Entry Point
 * 
 * Phase 9: Platform-aware Household guide.
 */

import { HouseholdGuideMobile } from './HouseholdGuideMobile';
import { HouseholdGuideWeb } from './HouseholdGuideWeb';

interface HouseholdGuideProps {
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

export function HouseholdGuide({
  isOpen,
  onClose,
  onBack,
}: HouseholdGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <HouseholdGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <HouseholdGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
