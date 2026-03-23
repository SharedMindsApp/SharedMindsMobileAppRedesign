import { Zap, Check } from 'lucide-react';
import { HabitContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import { useUIPreferences } from '../../../contexts/UIPreferencesContext';

interface HabitCanvasWidgetProps {
  content: HabitContent;
  viewMode: WidgetViewMode;
  onContentChange?: (content: HabitContent) => void;
}

export function HabitCanvasWidget({ content, viewMode, onContentChange }: HabitCanvasWidgetProps) {
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';
  const streak = content.streak || 0;
  const completedToday = content.completedToday || false;

  if (viewMode === 'icon') {
    return (
      <div className={`w-full h-full ${
        isNeonMode
          ? 'neon-dark-widget'
          : completedToday ? 'bg-teal-100 border-teal-200' : 'bg-amber-100 border-amber-200'
      } ${!isNeonMode ? 'border-2' : ''} rounded-2xl flex items-center justify-center`}>
        {completedToday ? (
          <Check size={32} className="text-teal-600" />
        ) : (
          <Zap size={32} className="text-amber-600" />
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className={`w-full h-full ${
        isNeonMode
          ? 'neon-dark-widget'
          : completedToday ? 'bg-teal-100 border-teal-200' : 'bg-amber-100 border-amber-200'
      } ${!isNeonMode ? 'border-2' : ''} rounded-2xl p-4 flex flex-col`}>
        <div className="flex items-center gap-2 mb-2">
          {completedToday ? (
            <Check size={18} className="text-teal-600" />
          ) : (
            <Zap size={18} className="text-amber-600" />
          )}
          <h3 className="font-bold text-gray-900 text-xs truncate flex-1">{content.title || 'Habit'}</h3>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className={`text-center py-3 rounded-lg ${completedToday ? 'bg-teal-200' : 'bg-amber-200'}`}>
            <p className="text-2xl font-bold text-gray-900">{streak}</p>
            <p className="text-xs text-gray-700">day streak</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${
      isNeonMode
        ? 'neon-dark-widget'
        : completedToday ? 'bg-teal-100 border-teal-200' : 'bg-amber-100 border-amber-200'
    } ${!isNeonMode ? 'border-2' : ''} rounded-2xl p-6 flex flex-col`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${completedToday ? 'bg-teal-200' : 'bg-amber-200'} rounded-xl flex items-center justify-center`}>
          {completedToday ? (
            <Check size={22} className="text-teal-700" />
          ) : (
            <Zap size={22} className="text-amber-700" />
          )}
        </div>
        <button
          onClick={() => onContentChange?.({ ...content, completedToday: !completedToday, streak: !completedToday ? streak + 1 : streak })}
          className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            completedToday
              ? 'bg-teal-200 text-teal-700 hover:bg-teal-300'
              : 'bg-amber-200 text-amber-700 hover:bg-amber-300'
          }`}
        >
          {completedToday ? 'Done Today!' : 'Mark Complete'}
        </button>
      </div>
      <input
        type="text"
        className="w-full bg-transparent border-none focus:outline-none text-gray-800 font-bold text-lg mb-6"
        placeholder="Habit name..."
        value={content.title || ''}
        onChange={(e) => onContentChange?.({ ...content, title: e.target.value })}
      />
      <div className={`text-center py-6 rounded-xl mb-6 ${completedToday ? 'bg-teal-200' : 'bg-amber-200'}`}>
        <p className="text-5xl font-bold text-gray-900 mb-1">{streak}</p>
        <p className="text-sm text-gray-700 font-medium">Day Streak</p>
      </div>
      {content.participants && content.participants.length > 0 && (
        <div className="mt-auto">
          <p className="text-xs text-gray-600 mb-2">Tracking with:</p>
          <div className="flex flex-wrap gap-1">
            {content.participants.map((person, i) => (
              <span key={i} className="text-xs bg-white/60 px-2 py-1 rounded-full">
                {person}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
