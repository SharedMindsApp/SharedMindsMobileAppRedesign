/**
 * Planner Guide - Entry Point
 * 
 * Phase 9: Platform-aware Planner feature guide.
 */

import { PlannerGuideMobile } from './PlannerGuideMobile';
import { PlannerGuideWeb } from './PlannerGuideWeb';

interface PlannerGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  featureId?: string;
}

/**
 * Detect if we're on mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function PlannerGuide({
  isOpen,
  onClose,
  onBack,
  featureId,
}: PlannerGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <PlannerGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
        featureId={featureId}
      />
    );
  }

  return (
    <PlannerGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      featureId={featureId}
    />
  );
}
