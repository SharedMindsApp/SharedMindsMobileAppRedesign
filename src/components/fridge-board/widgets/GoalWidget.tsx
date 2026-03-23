import { Target } from 'lucide-react';
import { WidgetWithLayout, GoalContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface GoalWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function GoalWidget({ widget, sizeMode, highContrast }: GoalWidgetProps) {
  const content = widget.content as GoalContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Target size={24} className={highContrast ? 'text-white' : 'text-gray-700'} />
        <div className={`text-xs font-bold mt-1 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.progress}%
        </div>
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3 className={`font-semibold text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <div className={`text-2xl font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.progress}%
        </div>
        <div className={`w-full rounded-full h-2 mt-2 ${highContrast ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div
            className={`h-2 rounded-full ${highContrast ? 'bg-white' : 'bg-blue-500'}`}
            style={{ width: `${content.progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Target size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      {content.description && (
        <p className={`text-sm mb-4 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
          {content.description}
        </p>
      )}
      <div className={`text-4xl font-bold mb-3 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
        {content.progress}%
      </div>
      <div className={`w-full rounded-full h-3 mb-2 ${highContrast ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div
          className={`h-3 rounded-full ${highContrast ? 'bg-white' : 'bg-blue-500'} transition-all`}
          style={{ width: `${content.progress}%` }}
        />
      </div>
      {content.targetDate && (
        <p className={`text-xs ${highContrast ? 'text-gray-400' : 'text-gray-600'} mt-auto`}>
          Target: {new Date(content.targetDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
