/**
 * Trackers Guide - Entry Point
 * 
 * Phase 9: Platform-aware Trackers guide.
 */

import { TrackersGuideMobile } from './TrackersGuideMobile';
import { TrackersGuideWeb } from './TrackersGuideWeb';

interface TrackersGuideProps {
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

export function TrackersGuide({
  isOpen,
  onClose,
  onBack,
}: TrackersGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <TrackersGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <TrackersGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
