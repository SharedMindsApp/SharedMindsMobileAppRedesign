/**
 * Planner Features Index
 * 
 * Phase 9: Main page showing all Planner features as selectable cards.
 * Users can click any feature to read about it.
 */

import { PlannerGuideItem } from './plannerGuideContent';
import { getAllPlannerGuideItems } from './plannerGuideContent';

interface PlannerFeaturesIndexProps {
  features: PlannerGuideItem[];
  onSelectFeature: (featureId: string) => void;
  variant?: 'mobile' | 'web';
}

export function PlannerFeaturesIndex({
  features,
  onSelectFeature,
  variant = 'web',
}: PlannerFeaturesIndexProps) {
  if (variant === 'mobile') {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Planner Features
          </h3>
          <p className="text-sm text-gray-600">
            Tap any feature to learn more about it
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {features.map(feature => (
            <button
              key={feature.id}
              onClick={() => onSelectFeature(feature.id)}
              className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {feature.whatItIs}
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Web variant
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Planner Features
        </h3>
        <p className="text-sm text-gray-600">
          Click any feature to learn more about it
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(feature => (
          <button
            key={feature.id}
            onClick={() => onSelectFeature(feature.id)}
            className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="text-3xl flex-shrink-0">{feature.icon}</div>
              <h4 className="text-lg font-semibold text-gray-900">
                {feature.title}
              </h4>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {feature.whatItIs}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
