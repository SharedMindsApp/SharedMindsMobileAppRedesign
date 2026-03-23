/**
 * Guardrails Guide - Entry Point
 * 
 * Phase 9: Platform-aware Guardrails feature guide.
 */

import { GuardrailsGuideMobile } from './GuardrailsGuideMobile';
import { GuardrailsGuideWeb } from './GuardrailsGuideWeb';

interface GuardrailsGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  sectionId?: string;
}

/**
 * Detect if we're on mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function GuardrailsGuide({
  isOpen,
  onClose,
  onBack,
  sectionId,
}: GuardrailsGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <GuardrailsGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
        sectionId={sectionId}
      />
    );
  }

  return (
    <GuardrailsGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      sectionId={sectionId}
    />
  );
}
