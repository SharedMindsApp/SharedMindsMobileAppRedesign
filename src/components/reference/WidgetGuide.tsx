/**
 * Widget Guide - Entry Point
 * 
 * Phase 9: Platform-aware widget guide that shows mobile or web layout.
 */

import { WidgetGuideMobile } from './WidgetGuideMobile';
import { WidgetGuideWeb } from './WidgetGuideWeb';

interface WidgetGuideProps {
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

export function WidgetGuide({
  isOpen,
  onClose,
  onBack,
}: WidgetGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <WidgetGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <WidgetGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
