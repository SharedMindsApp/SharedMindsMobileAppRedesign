import { Calendar } from 'lucide-react';
import { WidgetWithLayout, CalendarContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface CalendarWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function CalendarWidget({ widget, sizeMode, highContrast }: CalendarWidgetProps) {
  const content = widget.content as CalendarContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Calendar size={24} className={highContrast ? 'text-white' : 'text-gray-700'} />
        {content.eventCount > 0 && (
          <div className={`text-xs font-bold mt-1 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {content.eventCount}
          </div>
        )}
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3 className={`font-semibold text-xs ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <div className={`text-2xl font-bold mb-1 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.eventCount}
        </div>
        <p className={`text-xs ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          {content.eventCount === 1 ? 'event' : 'events'} this week
        </p>
        {content.nextEvent && (
          <div className={`mt-auto text-xs ${highContrast ? 'text-gray-400' : 'text-gray-700'}`}>
            Next: {content.nextEvent.title}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      <div className={`text-4xl font-bold mb-2 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
        {content.eventCount}
      </div>
      <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        {content.eventCount === 1 ? 'event' : 'events'} this week
      </p>
      {content.nextEvent && (
        <div className={`p-3 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-white/60'}`}>
          <p className={`text-xs uppercase tracking-wide mb-1 ${
            highContrast ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Next Event
          </p>
          <p className={`text-sm font-semibold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {content.nextEvent.title}
          </p>
          <p className={`text-xs mt-1 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
            {new Date(content.nextEvent.date).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
