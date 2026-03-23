import { Box } from 'lucide-react';
import { WidgetWithLayout, CustomContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface CustomWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function CustomWidget({ widget, sizeMode, highContrast }: CustomWidgetProps) {
  const content = widget.content as CustomContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Box size={28} className={highContrast ? 'text-white' : 'text-gray-700'} />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Box size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3 className={`font-semibold text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <div className={`text-xs ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
          {Object.keys(content).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(content).slice(0, 2).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-semibold">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          ) : (
            <p className={highContrast ? 'text-gray-400' : 'text-gray-600'}>
              Custom content
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Box size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.keys(content).length > 0 ? (
          <div className={`space-y-2 text-sm ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
            {Object.entries(content).map(([key, value]) => (
              <div key={key} className={`p-2 rounded-lg ${
                highContrast ? 'bg-gray-900' : 'bg-white/60'
              }`}>
                <div className={`text-xs uppercase tracking-wide mb-1 ${
                  highContrast ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {key}
                </div>
                <div className={`${highContrast ? 'text-white' : 'text-gray-900'} break-words`}>
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center p-4 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="text-sm">This is a custom widget.</p>
            <p className="text-xs mt-1">No content defined yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
