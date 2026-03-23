import { TrendingUp, Flame } from 'lucide-react';
import { WidgetWithLayout, HabitContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface HabitWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function HabitWidget({ widget, sizeMode, highContrast }: HabitWidgetProps) {
  const content = widget.content as HabitContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Flame size={24} className={highContrast ? 'text-white' : 'text-orange-600'} />
        <div className={`text-xs font-bold mt-1 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.streak}
        </div>
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3 className={`font-semibold text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Flame size={32} className={highContrast ? 'text-white' : 'text-orange-500'} />
          <div>
            <div className={`text-2xl font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
              {content.streak}
            </div>
            <div className={`text-xs ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
              day streak
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Flame size={48} className={highContrast ? 'text-white' : 'text-orange-500'} />
        <div>
          <div className={`text-4xl font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {content.streak}
          </div>
          <div className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
            day streak
          </div>
        </div>
      </div>
      <div className={`p-3 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-white/60'}`}>
        <p className={`text-xs uppercase tracking-wide mb-1 ${
          highContrast ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Frequency
        </p>
        <p className={`text-sm font-semibold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.frequency}
        </p>
      </div>
      {content.lastCompleted && (
        <p className={`text-xs ${highContrast ? 'text-gray-400' : 'text-gray-600'} mt-auto`}>
          Last: {new Date(content.lastCompleted).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
