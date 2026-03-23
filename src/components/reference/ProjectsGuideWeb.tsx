/**
 * Projects Guide - Web View
 * 
 * Phase 9: Web Projects guide using scrollable layout with quick navigation sidebar.
 */

import { X, ArrowLeft } from 'lucide-react';
import { ProjectsGuideCard } from './ProjectsGuideCard';
import { getAllProjectsGuideSections } from './projectsGuideContent';

interface ProjectsGuideWebProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

// Category sections (excluding intro and conclusion)
const CATEGORY_SECTIONS = [
  'event-organizing-projects',
  'creative-projects',
  'work-project-management',
  'personal-goals-life-projects',
  'academic-research-projects',
  'construction-renovation-projects',
  'marketing-campaign-projects',
  'software-development-projects',
  'business-management-projects',
  'education-training-projects',
  'healthcare-wellness-projects',
  'nonprofit-community-projects',
];

export function ProjectsGuideWeb({
  isOpen,
  onClose,
  onBack,
}: ProjectsGuideWebProps) {
  const sections = getAllProjectsGuideSections();

  function jumpToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
              )}
              <h2 className="text-2xl font-semibold text-gray-900">
                About Projects
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content with Sidebar */}
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Project Categories
              </h3>
              <div className="space-y-1">
                {CATEGORY_SECTIONS.map(sectionId => {
                  const section = sections.find(s => s.id === sectionId);
                  if (!section) return null;
                  return (
                    <button
                      key={sectionId}
                      onClick={() => jumpToSection(sectionId)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span className="mr-2">{section.icon}</span>
                      {section.title.replace(' Projects', '').replace(' & ', ' & ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl">
                {sections.map(section => (
                  <div key={section.id} id={section.id}>
                    <ProjectsGuideCard section={section} variant="web" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
