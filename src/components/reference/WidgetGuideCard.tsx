/**
 * Widget Guide Card Component
 * 
 * Phase 9: UI component for displaying a widget in the guide.
 * Used by both mobile and web layouts.
 */

import { WidgetGuideItem } from './widgetGuideContent';

interface WidgetGuideCardProps {
  widget: WidgetGuideItem;
  variant?: 'mobile' | 'web';
}

export function WidgetGuideCard({ widget, variant = 'web' }: WidgetGuideCardProps) {
  if (variant === 'mobile') {
    return (
      <div className="w-full bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl flex-shrink-0">{widget.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">{widget.title}</h3>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                {widget.category}
              </span>
            </div>
            <div className="space-y-3 text-gray-700">
              <p className="text-base leading-relaxed">
                <span className="font-medium text-gray-900">What it is:</span> {widget.whatItIs}
              </p>
              <p className="text-base leading-relaxed">
                <span className="font-medium text-gray-900">When to use it:</span> {widget.whenToUse}
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
        <div className="text-3xl flex-shrink-0">{widget.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              {widget.category}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-700">
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">What:</span> {widget.whatItIs}
        </p>
        <p className="leading-relaxed">
          <span className="font-medium text-gray-900">When:</span> {widget.whenToUse}
        </p>
      </div>
    </div>
  );
}
