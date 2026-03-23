import { useEffect, useRef, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { NoteContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import { useUIPreferences } from '../../../contexts/UIPreferencesContext';

interface NoteWidgetProps {
  content: NoteContent;
  viewMode: WidgetViewMode;
  onContentChange?: (content: NoteContent) => void;
}

const colors = [
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800' },
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800' },
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800' },
];

export function NoteWidget({ content, viewMode, onContentChange }: NoteWidgetProps) {
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';
  const [localText, setLocalText] = useState(content.text || '');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const colorScheme = colors.find(c => c.bg === content.color) || colors[0];

  useEffect(() => {
    setLocalText(content.text || '');
  }, [content.text]);

  const handleTextChange = (newText: string) => {
    setLocalText(newText);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onContentChange?.({ ...content, text: newText });
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (viewMode === 'icon') {
    return (
      <div className={`w-full h-full flex items-center justify-center ${
        isNeonMode
          ? 'bg-[rgba(10,14,30,0.55)] backdrop-blur-[18px] saturate-[1.4] border border-[rgba(80,200,255,0.25)] rounded-[18px] shadow-[0_0_0_1px_rgba(80,200,255,0.15),0_0_25px_rgba(0,180,255,0.25),inset_0_0_12px_rgba(255,255,255,0.05)]'
          : `${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl`
      }`}>
        <StickyNote size={32} className={isNeonMode ? 'text-cyan-300' : colorScheme.text} />
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className={`w-full h-full p-4 flex flex-col ${
        isNeonMode
          ? 'bg-[rgba(10,14,30,0.55)] backdrop-blur-[18px] saturate-[1.4] border border-[rgba(80,200,255,0.25)] rounded-[18px] shadow-[0_0_0_1px_rgba(80,200,255,0.15),0_0_25px_rgba(0,180,255,0.25),inset_0_0_12px_rgba(255,255,255,0.05)]'
          : `${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl`
      }`}>
        <div className="flex items-start justify-between mb-2">
          <StickyNote size={18} className={isNeonMode ? 'text-cyan-300' : colorScheme.text} />
          {!isNeonMode && <div className={`w-3 h-3 ${colorScheme.bg.replace('100', '400')} rounded-full`}></div>}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className={`text-sm font-medium leading-snug line-clamp-4 ${
            isNeonMode ? 'text-cyan-100' : 'text-gray-800'
          }`}>
            {localText || 'Empty note...'}
          </p>
        </div>
        {content.author && (
          <p className={`text-xs mt-2 ${isNeonMode ? 'text-cyan-400/70' : 'text-gray-600'}`}>{content.author}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full h-full p-6 flex flex-col ${
      isNeonMode
        ? 'bg-[rgba(10,14,30,0.55)] backdrop-blur-[18px] saturate-[1.4] border border-[rgba(80,200,255,0.25)] rounded-[18px] shadow-[0_0_0_1px_rgba(80,200,255,0.15),0_0_25px_rgba(0,180,255,0.25),inset_0_0_12px_rgba(255,255,255,0.05)] hover:shadow-[0_0_0_1px_rgba(120,220,255,0.35),0_0_40px_rgba(0,200,255,0.45)] transition-all duration-[180ms] ease-out'
        : `${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl`
    }`}>
      <div className="flex items-start justify-between mb-4">
        <StickyNote size={24} className={isNeonMode ? 'text-cyan-300' : colorScheme.text} />
        {!isNeonMode && <div className={`w-4 h-4 ${colorScheme.bg.replace('100', '400')} rounded-full`}></div>}
      </div>
      <textarea
        className={`flex-1 w-full resize-none border-none focus:outline-none font-medium leading-relaxed ${
          isNeonMode
            ? 'bg-transparent text-cyan-100 placeholder-cyan-400/50'
            : `${colorScheme.bg} text-gray-800`
        }`}
        placeholder="Write your note here..."
        value={localText}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      {content.author && (
        <p className={`text-sm mt-4 ${isNeonMode ? 'text-cyan-400/70' : 'text-gray-600'}`}>{content.author}</p>
      )}
    </div>
  );
}
