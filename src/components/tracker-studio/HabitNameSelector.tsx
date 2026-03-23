/**
 * Habit Name Selector Component
 * 
 * Provides a tag-based UI for selecting habits from a predefined list.
 * Habits are displayed as selectable tags with icons, randomized order.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  List,
  type LucideIcon,
} from 'lucide-react';
import {
  HABIT_PRESETS,
  getRandomizedHabits,
  type HabitPreset,
} from '../../lib/trackerStudio/habitPresets';
import {
  Activity,
  Bed,
  BookOpen,
  Brain,
  Calendar,
  ChefHat,
  Coffee,
  Clock,
  DollarSign,
  Droplet,
  Footprints,
  GraduationCap,
  Hand,
  Heart,
  Home,
  Languages,
  MessageCircle,
  Moon,
  Music,
  Palette,
  PenTool,
  Phone,
  Pill,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  Trees,
  UtensilsCrossed,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react';

// Icon mapping for habit presets
const ICON_MAP: Record<string, LucideIcon> = {
  Droplet,
  Pill,
  Activity,
  Heart,
  Sparkles,
  BookOpen,
  PenTool,
  GraduationCap,
  Target,
  Calendar,
  Zap, // For "Deep Work Session" (using Zap as focus/work icon)
  Smartphone,
  Wifi,
  Wind,
  Trees,
  Brain,
  Footprints,
  Bed,
  Home,
  ChefHat,
  Phone,
  Palette,
  Music,
  Languages,
  Moon,
  Coffee,
  // Icons for habits to break
  X, // Stop Smoking
  UtensilsCrossed, // No Fast Food, No Skipping Meals
  Hand, // Stop Nail Biting
  Clock, // Reduce Procrastination, No Snooze Button
  DollarSign, // Stop Overspending
  ShoppingCart, // No Impulse Purchases
  MessageCircle, // Stop Complaining
};

interface HabitNameSelectorProps {
  value: string;
  onChange: (habitName: string) => void;
  disabled?: boolean;
  theme?: {
    accentBg: string;
    borderColor: string;
    accentText: string;
  };
  allowFreeType?: boolean; // If true, shows input field with list selector button
}

export function HabitNameSelector({
  value,
  onChange,
  disabled = false,
  theme,
  allowFreeType = false,
}: HabitNameSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [favoriteHabits, setFavoriteHabits] = useState<string[]>([]);

  // Load favorite habits from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('habit_tracker_favorites');
      if (saved) {
        setFavoriteHabits(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorite habits:', err);
    }
  }, []);

  // Save favorite habits to localStorage
  const toggleFavorite = (habitName: string) => {
    const newFavorites = favoriteHabits.includes(habitName)
      ? favoriteHabits.filter(h => h !== habitName)
      : [...favoriteHabits, habitName];
    
    setFavoriteHabits(newFavorites);
    try {
      localStorage.setItem('habit_tracker_favorites', JSON.stringify(newFavorites));
    } catch (err) {
      console.error('Failed to save favorite habits:', err);
    }
  };

  // Get randomized habits, with favorites first
  const displayHabits = useMemo(() => {
    const randomized = getRandomizedHabits();
    const favorites = randomized.filter(h => favoriteHabits.includes(h.name));
    const nonFavorites = randomized.filter(h => !favoriteHabits.includes(h.name));
    return [...favorites, ...nonFavorites];
  }, [favoriteHabits]);

  const selectedPreset = useMemo(() => {
    return displayHabits.find(h => h.name === value);
  }, [displayHabits, value]);

  const IconComponent = selectedPreset ? ICON_MAP[selectedPreset.icon] || Activity : Activity;

  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-semibold text-gray-900">
        Habit Name <span className="text-red-500">*</span>
      </label>

      {/* Free Type Mode: Input with List Selector Button */}
      {allowFreeType ? (
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type a habit name or select from list..."
              disabled={disabled}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-9 sm:pr-10 min-h-[48px] sm:min-h-[44px] rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                theme?.borderColor || 'border-gray-300'
              } focus:border-blue-500 focus:ring-blue-500 bg-white`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 p-1.5 sm:p-1 rounded-lg text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                title="Clear"
                aria-label="Clear habit name"
              >
                <X size={16} className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => !disabled && setShowSelector(!showSelector)}
            disabled={disabled}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 min-h-[48px] sm:min-h-[44px] min-w-[48px] sm:min-w-[44px] rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation ${
              theme?.borderColor || 'border-gray-300'
            } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400 active:bg-gray-100`}
            title="Browse habit list"
            aria-label="Browse habit list"
          >
            <List size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-500" />
          </button>
        </div>
      ) : (
        /* Tag Selection Mode: Button-based selection */
        <>
          {value ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !disabled && setShowSelector(!showSelector)}
                disabled={disabled}
                className={`flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 min-h-[48px] sm:min-h-[44px] rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
                  theme?.borderColor || 'border-gray-300'
                } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400 active:bg-gray-100`}
              >
                <IconComponent size={18} className={`w-4 h-4 sm:w-5 sm:h-5 ${theme?.accentText || 'text-gray-700'} flex-shrink-0`} />
                <span className={`flex-1 text-left font-medium text-xs sm:text-sm truncate ${theme?.accentText || 'text-gray-900'}`}>
                  {value}
                </span>
                <List size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-500 flex-shrink-0" />
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-2 min-w-[44px] min-h-[44px] rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation flex items-center justify-center flex-shrink-0"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !disabled && setShowSelector(true)}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] sm:min-h-[44px] rounded-lg border-2 border-dashed transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
                theme?.borderColor || 'border-gray-300'
              } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400 active:bg-gray-100`}
            >
              <List size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-500" />
              <span className="text-xs sm:text-sm text-gray-600 font-medium">Select a habit</span>
            </button>
          )}
        </>
      )}

      {/* Habit Selector Modal */}
      {showSelector && !disabled && (
        <div className={`relative z-50 ${theme?.accentBg || 'bg-gray-50'} border-2 ${theme?.borderColor || 'border-gray-200'} rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 mt-2 max-h-[60vh] overflow-y-auto`}>
          <div className="flex items-center justify-between sticky top-0 bg-inherit pb-2 z-10">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Choose a Habit</h3>
            <button
              type="button"
              onClick={() => setShowSelector(false)}
              className="p-1.5 sm:p-1 min-w-[36px] min-h-[36px] rounded-lg text-gray-500 hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation flex items-center justify-center"
              aria-label="Close habit selector"
            >
              <X size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Favorite Habits Section (if any) */}
          {favoriteHabits.length > 0 && (
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2">Favorites</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {displayHabits
                  .filter(h => favoriteHabits.includes(h.name))
                  .map((habit) => {
                    const HabitIcon = ICON_MAP[habit.icon] || Activity;
                    const isSelected = value === habit.name;
                    
                    return (
                      <button
                        key={habit.name}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange(habit.name);
                          setShowSelector(false);
                        }}
                        className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[40px] sm:min-h-[36px] rounded-lg border-2 transition-all touch-manipulation active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
                        }`}
                      >
                        <HabitIcon size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{habit.name}</span>
                        {isSelected ? (
                          <CheckCircle2 size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                        ) : (
                          <Circle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* All Habits Section */}
          <div>
            {favoriteHabits.length > 0 && (
              <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-2">All Habits</p>
            )}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {displayHabits.map((habit) => {
                const HabitIcon = ICON_MAP[habit.icon] || Activity;
                const isSelected = value === habit.name;
                const isFavorite = favoriteHabits.includes(habit.name);
                
                return (
                  <button
                    key={habit.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(habit.name);
                      setShowSelector(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(habit.name);
                    }}
                    title={isFavorite ? 'Long press to unfavorite' : 'Long press to favorite'}
                    className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[40px] sm:min-h-[36px] rounded-lg border-2 transition-all touch-manipulation active:scale-95 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
                    }`}
                  >
                    <HabitIcon size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{habit.name}</span>
                    {isSelected ? (
                      <CheckCircle2 size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                    ) : (
                      <Circle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-blue-400 flex-shrink-0" />
                    )}
                    {isFavorite && !isSelected && (
                      <span className="absolute -top-0.5 -right-0.5 text-[10px] sm:text-xs">⭐</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
              💡 Long press any habit to favorite it
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
