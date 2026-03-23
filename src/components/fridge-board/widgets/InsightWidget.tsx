import { Sparkles, Lightbulb } from 'lucide-react';
import { WidgetWithLayout, InsightContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface InsightWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function InsightWidget({ widget, sizeMode, highContrast }: InsightWidgetProps) {
  const content = widget.content as InsightContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Sparkles size={28} className={highContrast ? 'text-white' : 'text-amber-600'} />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={16} className={highContrast ? 'text-white' : 'text-amber-600'} />
          <span className={`text-xs uppercase tracking-wide font-bold ${
            highContrast ? 'text-gray-300' : 'text-amber-700'
          }`}>
            {content.category}
          </span>
        </div>
        <p className={`text-xs leading-relaxed line-clamp-4 ${
          highContrast ? 'text-white' : 'text-gray-900'
        }`}>
          {content.summary}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={20} className={highContrast ? 'text-white' : 'text-amber-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      <div className={`mb-3 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start ${
        highContrast ? 'bg-gray-900' : 'bg-amber-100'
      }`}>
        <Lightbulb size={14} className={highContrast ? 'text-white' : 'text-amber-700'} />
        <span className={`text-xs uppercase tracking-wide font-bold ${
          highContrast ? 'text-white' : 'text-amber-700'
        }`}>
          {content.category}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <p className={`text-sm leading-relaxed ${
          highContrast ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {content.summary}
        </p>
      </div>
    </div>
  );
}
