import { Sparkles, Lightbulb } from 'lucide-react';
import { InsightContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

interface InsightCanvasWidgetProps {
  content: InsightContent;
  viewMode: WidgetViewMode;
}

export function InsightCanvasWidget({ content, viewMode }: InsightCanvasWidgetProps) {
  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full bg-violet-100 border-violet-200 border-2 rounded-2xl flex items-center justify-center">
        <Sparkles size={32} className="text-violet-600" />
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-violet-100 to-purple-100 border-violet-200 border-2 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={18} className="text-violet-600" />
          <h3 className="font-bold text-violet-900 text-xs truncate flex-1">{content.title || 'Insight'}</h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-gray-800 leading-snug line-clamp-3">
            {content.description || 'No description available'}
          </p>
        </div>
        {content.category && (
          <span className="mt-2 text-xs bg-violet-200 text-violet-700 px-2 py-1 rounded-full self-start">
            {content.category}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-purple-100 border-violet-200 border-2 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-violet-200 rounded-xl flex items-center justify-center">
          <Sparkles size={22} className="text-violet-700" />
        </div>
        <Lightbulb size={20} className="text-violet-600" />
      </div>
      <h3 className="font-bold text-violet-900 text-xl mb-3">{content.title || 'Household Insight'}</h3>
      <p className="text-gray-800 leading-relaxed flex-1">
        {content.description || 'No description available'}
      </p>
      {content.category && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-600 font-medium">Category:</span>
          <span className="text-xs bg-violet-200 text-violet-700 px-3 py-1 rounded-full font-medium">
            {content.category}
          </span>
        </div>
      )}
    </div>
  );
}
