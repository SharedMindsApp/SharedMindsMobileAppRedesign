/**
 * Projects Guide Card Component
 * 
 * Phase 9: UI component for displaying a Projects guide section.
 */

import { ProjectsGuideSection } from './projectsGuideContent';

interface ProjectsGuideCardProps {
  section: ProjectsGuideSection;
  variant?: 'mobile' | 'web';
}

export function ProjectsGuideCard({ section, variant = 'web' }: ProjectsGuideCardProps) {
  if (variant === 'mobile') {
    return (
      <div className="w-full bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl flex-shrink-0">{section.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h3>
            <p className="text-base leading-relaxed text-gray-700 mb-4">
              {section.content}
            </p>
            {section.examples && section.examples.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Examples:</h4>
                <div className="space-y-4">
                  {section.examples.map((example, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900 mb-1">{example.title}</h5>
                      <p className="text-xs text-gray-600 mb-2">{example.description}</p>
                      <p className="text-xs text-gray-500 italic">{example.useCase}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Web variant
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">{section.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-gray-700 mb-3">
        {section.content}
      </p>
      {section.examples && section.examples.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Examples:</h4>
          <div className="space-y-2">
            {section.examples.map((example, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <h5 className="text-xs font-semibold text-gray-900 mb-1">{example.title}</h5>
                <p className="text-xs text-gray-600 mb-1">{example.description}</p>
                <p className="text-xs text-gray-500 italic">{example.useCase}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
