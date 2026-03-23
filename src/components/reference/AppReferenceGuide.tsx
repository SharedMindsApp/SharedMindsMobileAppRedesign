/**
 * App Reference Guide - Entry Point
 * 
 * Phase 9: Platform-aware reference guide that shows mobile or web layout.
 * 
 * This is a mental map, not documentation.
 * Helps users understand core concepts and relationships.
 */

import { AppReferenceGuideMobile } from './AppReferenceGuideMobile';
import { AppReferenceGuideWeb } from './AppReferenceGuideWeb';

interface AppReferenceGuideProps {
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

export function AppReferenceGuide({
  isOpen,
  onClose,
}: AppReferenceGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <AppReferenceGuideMobile
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <AppReferenceGuideWeb
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
