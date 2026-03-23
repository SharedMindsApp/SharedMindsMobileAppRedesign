/**
 * CategoryPicker Component
 * 
 * Shows scrollable category cards for habit discovery.
 * Used in blank state to help users find habits they want to build.
 * 
 * Design:
 * - 2-3 cards per row on mobile
 * - Each card shows icon, name, and 3 faint example habits
 * - Tapping opens HabitPickerPanel
 */

import { useState, useEffect } from 'react';
import { HABIT_CATEGORIES, getSuggestedCategories } from '../../../lib/habits/habitCategories';
import type { HabitCategory } from '../../../lib/habits/habitCategories';
import { HabitPickerPanel } from './HabitPickerPanel';

// Color mapping for Tailwind classes (must be explicit for JIT)
const COLOR_CLASSES: Record<string, {
  bg: string;
  bgHover: string;
  border: string;
  borderHover: string;
  icon: string;
  iconBg: string;
  iconBgHover: string;
}> = {
  amber: {
    bg: 'from-white to-amber-50/30',
    bgHover: 'hover:from-amber-50/50 hover:to-amber-100/30',
    border: 'border-amber-100',
    borderHover: 'hover:border-amber-200',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconBgHover: 'group-hover:bg-amber-200',
  },
  indigo: {
    bg: 'from-white to-indigo-50/30',
    bgHover: 'hover:from-indigo-50/50 hover:to-indigo-100/30',
    border: 'border-indigo-100',
    borderHover: 'hover:border-indigo-200',
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    iconBgHover: 'group-hover:bg-indigo-200',
  },
  emerald: {
    bg: 'from-white to-emerald-50/30',
    bgHover: 'hover:from-emerald-50/50 hover:to-emerald-100/30',
    border: 'border-emerald-100',
    borderHover: 'hover:border-emerald-200',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconBgHover: 'group-hover:bg-emerald-200',
  },
  purple: {
    bg: 'from-white to-purple-50/30',
    bgHover: 'hover:from-purple-50/50 hover:to-purple-100/30',
    border: 'border-purple-100',
    borderHover: 'hover:border-purple-200',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
    iconBgHover: 'group-hover:bg-purple-200',
  },
  rose: {
    bg: 'from-white to-rose-50/30',
    bgHover: 'hover:from-rose-50/50 hover:to-rose-100/30',
    border: 'border-rose-100',
    borderHover: 'hover:border-rose-200',
    icon: 'text-rose-600',
    iconBg: 'bg-rose-100',
    iconBgHover: 'group-hover:bg-rose-200',
  },
  slate: {
    bg: 'from-white to-slate-50/30',
    bgHover: 'hover:from-slate-50/50 hover:to-slate-100/30',
    border: 'border-slate-100',
    borderHover: 'hover:border-slate-200',
    icon: 'text-slate-600',
    iconBg: 'bg-slate-100',
    iconBgHover: 'group-hover:bg-slate-200',
  },
  gray: {
    bg: 'from-white to-gray-50/30',
    bgHover: 'hover:from-gray-50/50 hover:to-gray-100/30',
    border: 'border-gray-100',
    borderHover: 'hover:border-gray-200',
    icon: 'text-gray-600',
    iconBg: 'bg-gray-100',
    iconBgHover: 'group-hover:bg-gray-200',
  },
  green: {
    bg: 'from-white to-green-50/30',
    bgHover: 'hover:from-green-50/50 hover:to-green-100/30',
    border: 'border-green-100',
    borderHover: 'hover:border-green-200',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
    iconBgHover: 'group-hover:bg-green-200',
  },
};

interface CategoryPickerProps {
  userId: string;
  onHabitCreated: () => void;
  compact?: boolean;
  existingHabitsCount?: number;
}

export function CategoryPicker({
  userId,
  onHabitCreated,
  compact = false,
  existingHabitsCount = 0,
}: CategoryPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | null>(null);

  if (selectedCategory) {
    return (
      <HabitPickerPanel
        category={selectedCategory}
        userId={userId}
        onHabitCreated={() => {
          onHabitCreated();
          setSelectedCategory(null);
        }}
        onClose={() => setSelectedCategory(null)}
        compact={compact}
      />
    );
  }

  return (
    <CategoryGrid
      onCategorySelect={setSelectedCategory}
      compact={compact}
      userId={userId}
      existingHabitsCount={existingHabitsCount}
    />
  );
}

interface CategoryGridProps {
  onCategorySelect: (category: HabitCategory) => void;
  compact?: boolean;
  userId?: string;
  existingHabitsCount?: number;
}

function CategoryGrid({
  onCategorySelect,
  compact = false,
  userId,
  existingHabitsCount = 0,
}: CategoryGridProps) {
  const [categories, setCategories] = useState<HabitCategory[]>(HABIT_CATEGORIES);

  // Load suggested categories with context-aware sorting
  useEffect(() => {
    const loadCategories = async () => {
      if (userId) {
        try {
          const suggested = await getSuggestedCategories(userId, existingHabitsCount);
          setCategories(suggested);
        } catch (error) {
          console.error('[CategoryPicker] Error loading suggested categories:', error);
          setCategories(HABIT_CATEGORIES);
        }
      } else {
        setCategories(HABIT_CATEGORIES);
      }
    };
    loadCategories();
  }, [userId, existingHabitsCount]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-medium text-gray-900 mb-2`}>
          Start with one small ritual
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          You don't need to plan everything. Just pick one place to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const colors = COLOR_CLASSES[category.accentColor] || COLOR_CLASSES.gray;
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category)}
              className={`
                group
                text-left
                p-5
                rounded-2xl
                bg-gradient-to-br ${colors.bg}
                border ${colors.border}
                ${colors.borderHover}
                hover:shadow-md
                transition-all duration-200
                animate-in fade-in slide-in-from-bottom-2
              `}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`
                  p-2.5
                  rounded-xl
                  ${colors.iconBg}
                  ${colors.iconBgHover}
                  transition-colors
                `}>
                  <Icon size={20} className={colors.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Show 3 example habits */}
              <div className="space-y-1.5">
                {category.suggestedHabits.slice(0, 3).map((habit, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-400 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="truncate">{habit.title}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
