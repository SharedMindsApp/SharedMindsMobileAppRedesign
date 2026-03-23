/**
 * Guardrails Guide Card Component
 * 
 * Phase 9: UI component for displaying a Guardrails feature in the guide.
 */

import { GuardrailsGuideItem } from './guardrailsGuideContent';

interface GuardrailsGuideCardProps {
  feature: GuardrailsGuideItem;
  variant?: 'mobile' | 'web';
}

export function GuardrailsGuideCard({ feature, variant = 'web' }: GuardrailsGuideCardProps) {
  if (variant === 'mobile') {
    return (
      <div className="w-full bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl flex-shrink-0">{feature.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
            <div className="space-y-3 text-gray-700">
              <p className="text-base leading-relaxed">
                <span className="font-medium text-gray-900">What it is:</span> {feature.whatItIs}
              </p>
              <p className="text-base leading-relaxed">
                <span className="font-medium text-gray-900">When to use it:</span> {feature.whenToUse}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Web variant
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">{feature.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
      </div>
      <div className="space-y-2 text-sm text-gray-700">
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">What:</span> {feature.whatItIs}
        </p>
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">When:</span> {feature.whenToUse}
        </p>
      </div>
    </div>
  );
}
