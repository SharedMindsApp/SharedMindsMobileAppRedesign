import { StickyNote } from 'lucide-react';
import { WidgetWithLayout, NoteContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface NoteWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function NoteWidget({ widget, sizeMode, highContrast }: NoteWidgetProps) {
  const content = widget.content as NoteContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <StickyNote size={28} className={highContrast ? 'text-white' : 'text-gray-700'} />
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3
            className={`font-semibold text-xs truncate ${
              highContrast ? 'text-white' : 'text-gray-900'
            }`}
          >
            {widget.title}
          </h3>
        </div>
        <p
          className={`text-xs leading-relaxed line-clamp-4 ${
            highContrast ? 'text-gray-300' : 'text-gray-700'
          }`}
          style={{
            fontFamily: '"OpenDyslexic", "Comic Sans MS", sans-serif',
          }}
        >
          {content.text}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3
          className={`font-bold text-sm ${
            highContrast ? 'text-white' : 'text-gray-900'
          }`}
        >
          {widget.title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <p
          className={`text-sm leading-relaxed ${
            highContrast ? 'text-gray-300' : 'text-gray-700'
          }`}
          style={{
            fontFamily: '"OpenDyslexic", "Comic Sans MS", sans-serif',
            fontSize: content.fontSize || '14px',
          }}
        >
          {content.text}
        </p>
      </div>
    </div>
  );
}
