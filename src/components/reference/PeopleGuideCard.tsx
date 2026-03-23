/**
 * People Guide Card Component
 * 
 * Phase 9: UI component for displaying a People guide section with visual connections.
 */

import { PeopleGuideSection } from './peopleGuideContent';
import { ArrowRight } from 'lucide-react';

interface PeopleGuideCardProps {
  section: PeopleGuideSection;
  variant?: 'mobile' | 'web';
}

export function PeopleGuideCard({ section, variant = 'web' }: PeopleGuideCardProps) {
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
            {section.visualNote && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {section.visualNote}
                </p>
              </div>
            )}
            {section.connections && section.connections.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Connections:</h4>
                <div className="space-y-3">
                  {section.connections.map((connection, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-600">{connection.from}</span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600">{connection.to}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{connection.description}</p>
                      </div>
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
      {section.visualNote && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-900">
            {section.visualNote}
          </p>
        </div>
      )}
      {section.connections && section.connections.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Connections:</h4>
          <div className="space-y-2">
            {section.connections.map((connection, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-gray-600">{connection.from}</span>
                  <ArrowRight size={12} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">{connection.to}</span>
                </div>
                <p className="text-xs text-gray-600">{connection.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
