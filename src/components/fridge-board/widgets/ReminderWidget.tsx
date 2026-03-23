import { Bell, Clock, AlertCircle } from 'lucide-react';
import { WidgetWithLayout, ReminderContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface ReminderWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function ReminderWidget({ widget, sizeMode, highContrast }: ReminderWidgetProps) {
  const content = widget.content as ReminderContent;

  const priorityColors = {
    low: highContrast ? 'text-white' : 'text-blue-600',
    medium: highContrast ? 'text-white' : 'text-orange-600',
    high: highContrast ? 'text-white' : 'text-red-600',
  };

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Bell size={28} className={priorityColors[content.priority]} />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className={priorityColors[content.priority]} />
          <h3 className={`font-semibold text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <p className={`text-xs leading-relaxed line-clamp-3 ${
          highContrast ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {content.message}
        </p>
        {content.time && (
          <div className={`mt-auto flex items-center gap-1 text-xs ${
            highContrast ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Clock size={12} />
            {new Date(content.time).toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={20} className={priorityColors[content.priority]} />
          <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        {content.priority === 'high' && (
          <AlertCircle size={18} className={highContrast ? 'text-white' : 'text-red-600'} />
        )}
      </div>
      <div className={`mb-3 px-3 py-1 rounded-lg inline-flex items-center self-start ${
        highContrast ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <span className={`text-xs uppercase tracking-wide font-bold ${
          priorityColors[content.priority]
        }`}>
          {content.priority} Priority
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <p className={`text-sm leading-relaxed ${
          highContrast ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {content.message}
        </p>
      </div>
      {content.time && (
        <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-sm ${
          highContrast ? 'border-gray-800 text-gray-400' : 'border-gray-300 text-gray-600'
        }`}>
          <Clock size={16} />
          {new Date(content.time).toLocaleString()}
        </div>
      )}
    </div>
  );
}
