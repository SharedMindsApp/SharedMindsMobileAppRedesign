/**
 * Projects Guide - Entry Point
 * 
 * Phase 9: Platform-aware Projects guide.
 */

import { ProjectsGuideMobile } from './ProjectsGuideMobile';
import { ProjectsGuideWeb } from './ProjectsGuideWeb';

interface ProjectsGuideProps {
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

export function ProjectsGuide({
  isOpen,
  onClose,
  onBack,
}: ProjectsGuideProps) {
  const mobile = isMobile();

  if (mobile) {
    return (
      <ProjectsGuideMobile
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
      />
    );
  }

  return (
    <ProjectsGuideWeb
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
