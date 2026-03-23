/**
 * Habit Color Assignment Helpers
 * 
 * Assigns meaningful colors to habits based on:
 * - Linked skills
 * - Linked goals
 * - Habit category (if available)
 * 
 * Color Intent:
 * - Blue/Indigo → Focus, thinking, learning
 * - Green/Mint → Health, maintenance
 * - Amber/Peach → Creativity, reflection
 * - Purple → Identity-building habits
 * 
 * No red/green "judgement" colors.
 */

import type { Activity } from '../activities/activityTypes';

export type HabitColorTheme = {
  gradient: string; // Tailwind gradient classes
  accentBorder: string; // Left border or top strip color
  buttonBg: string; // Primary action button background
  buttonHover: string; // Button hover state
  glow: string; // Subtle inner glow
};

export const HABIT_COLOR_THEMES: Record<string, HabitColorTheme> = {
  // Focus & Learning (Blue/Indigo)
  focus: {
    gradient: 'from-indigo-50 to-white',
    accentBorder: 'border-l-indigo-400',
    buttonBg: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-700',
    glow: 'shadow-indigo-100',
  },
  learning: {
    gradient: 'from-blue-50 to-white',
    accentBorder: 'border-l-blue-400',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    glow: 'shadow-blue-100',
  },
  
  // Health & Maintenance (Green/Mint)
  health: {
    gradient: 'from-emerald-50 to-white',
    accentBorder: 'border-l-emerald-400',
    buttonBg: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
    glow: 'shadow-emerald-100',
  },
  maintenance: {
    gradient: 'from-green-50 to-white',
    accentBorder: 'border-l-green-400',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
    glow: 'shadow-green-100',
  },
  
  // Creativity & Reflection (Amber/Peach)
  creativity: {
    gradient: 'from-amber-50 to-white',
    accentBorder: 'border-l-amber-400',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    glow: 'shadow-amber-100',
  },
  reflection: {
    gradient: 'from-orange-50 to-white',
    accentBorder: 'border-l-orange-400',
    buttonBg: 'bg-orange-600',
    buttonHover: 'hover:bg-orange-700',
    glow: 'shadow-orange-100',
  },
  
  // Identity & Growth (Purple)
  identity: {
    gradient: 'from-purple-50 to-white',
    accentBorder: 'border-l-purple-400',
    buttonBg: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
    glow: 'shadow-purple-100',
  },
  growth: {
    gradient: 'from-violet-50 to-white',
    accentBorder: 'border-l-violet-400',
    buttonBg: 'bg-violet-600',
    buttonHover: 'hover:bg-violet-700',
    glow: 'shadow-violet-100',
  },
  
  // Default (Neutral)
  default: {
    gradient: 'from-gray-50 to-white',
    accentBorder: 'border-l-gray-300',
    buttonBg: 'bg-gray-900',
    buttonHover: 'hover:bg-gray-800',
    glow: 'shadow-gray-100',
  },
};

/**
 * Apply time-of-day color shifts to a theme
 * Phase 1: Morning = warmer tones, Evening = cooler tones
 */
export function applyTimeOfDayColorShift(
  theme: HabitColorTheme,
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'exact'
): HabitColorTheme {
  if (!timeOfDay || timeOfDay === 'exact') {
    return theme; // No shift for exact times or undefined
  }

  // Create shifted variants
  const shiftMap: Record<string, Record<'morning' | 'afternoon' | 'evening', Partial<HabitColorTheme>>> = {
    // Blue/Indigo themes → shift based on time
    'from-indigo-50 to-white': {
      morning: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
      afternoon: { gradient: 'from-indigo-50 to-white', accentBorder: 'border-l-indigo-400' },
      evening: { gradient: 'from-slate-50 to-white', accentBorder: 'border-l-slate-400' },
    },
    'from-blue-50 to-white': {
      morning: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
      afternoon: { gradient: 'from-blue-50 to-white', accentBorder: 'border-l-blue-400' },
      evening: { gradient: 'from-purple-50 to-white', accentBorder: 'border-l-purple-400' },
    },
    // Green/Emerald themes → warmer in morning, cooler in evening
    'from-emerald-50 to-white': {
      morning: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
      afternoon: { gradient: 'from-emerald-50 to-white', accentBorder: 'border-l-emerald-400' },
      evening: { gradient: 'from-teal-50 to-white', accentBorder: 'border-l-teal-400' },
    },
    'from-green-50 to-white': {
      morning: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
      afternoon: { gradient: 'from-green-50 to-white', accentBorder: 'border-l-green-400' },
      evening: { gradient: 'from-slate-50 to-white', accentBorder: 'border-l-slate-400' },
    },
    // Amber/Orange themes → already warm, shift to peach in morning
    'from-amber-50 to-white': {
      morning: { gradient: 'from-orange-50 to-white', accentBorder: 'border-l-orange-400' },
      afternoon: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
      evening: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
    },
    'from-orange-50 to-white': {
      morning: { gradient: 'from-orange-50 to-white', accentBorder: 'border-l-orange-400' },
      afternoon: { gradient: 'from-orange-50 to-white', accentBorder: 'border-l-orange-400' },
      evening: { gradient: 'from-amber-50 to-white', accentBorder: 'border-l-amber-400' },
    },
    // Purple/Violet themes → cooler tones
    'from-purple-50 to-white': {
      morning: { gradient: 'from-indigo-50 to-white', accentBorder: 'border-l-indigo-400' },
      afternoon: { gradient: 'from-purple-50 to-white', accentBorder: 'border-l-purple-400' },
      evening: { gradient: 'from-slate-50 to-white', accentBorder: 'border-l-slate-400' },
    },
    'from-violet-50 to-white': {
      morning: { gradient: 'from-indigo-50 to-white', accentBorder: 'border-l-indigo-400' },
      afternoon: { gradient: 'from-violet-50 to-white', accentBorder: 'border-l-violet-400' },
      evening: { gradient: 'from-slate-50 to-white', accentBorder: 'border-l-slate-400' },
    },
  };

  const shift = shiftMap[theme.gradient]?.[timeOfDay];
  if (shift) {
    return { ...theme, ...shift };
  }

  return theme; // No shift available, return original
}

/**
 * Determine habit color theme based on context
 * Phase 1: Now includes time-of-day color shifts
 */
export async function getHabitColorTheme(
  habit: Activity,
  userId: string,
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'exact'
): Promise<HabitColorTheme> {
  try {
    // 1. Check linked skills (highest priority)
    const { getSkillsForHabit } = await import('./habitContextHelpers');
    const skills = await getSkillsForHabit(userId, habit.id);
    
    if (skills.length > 0) {
      const skillName = skills[0].skill.name.toLowerCase();
      
      // Map skill names to color themes
      if (skillName.includes('focus') || skillName.includes('concentration') || skillName.includes('attention')) {
        return HABIT_COLOR_THEMES.focus;
      }
      if (skillName.includes('learning') || skillName.includes('study') || skillName.includes('knowledge')) {
        return HABIT_COLOR_THEMES.learning;
      }
      if (skillName.includes('health') || skillName.includes('fitness') || skillName.includes('wellness')) {
        return HABIT_COLOR_THEMES.health;
      }
      if (skillName.includes('creativity') || skillName.includes('art') || skillName.includes('creative')) {
        return HABIT_COLOR_THEMES.creativity;
      }
      if (skillName.includes('reflection') || skillName.includes('mindfulness') || skillName.includes('meditation')) {
        return HABIT_COLOR_THEMES.reflection;
      }
      if (skillName.includes('identity') || skillName.includes('growth') || skillName.includes('development')) {
        return HABIT_COLOR_THEMES.identity;
      }
      
      // Default to identity/growth for skills
      return HABIT_COLOR_THEMES.identity;
    }
    
    // 2. Check linked goals
    const { getGoalsForHabit } = await import('./habitContextHelpers');
    const goals = await getGoalsForHabit(userId, habit.id);
    
    if (goals.length > 0) {
      const goalTitle = goals[0].activity.title.toLowerCase();
      
      if (goalTitle.includes('health') || goalTitle.includes('fitness') || goalTitle.includes('wellness')) {
        return HABIT_COLOR_THEMES.health;
      }
      if (goalTitle.includes('focus') || goalTitle.includes('productivity') || goalTitle.includes('concentration')) {
        return HABIT_COLOR_THEMES.focus;
      }
      if (goalTitle.includes('creativity') || goalTitle.includes('art') || goalTitle.includes('creative')) {
        return HABIT_COLOR_THEMES.creativity;
      }
      if (goalTitle.includes('learn') || goalTitle.includes('study') || goalTitle.includes('education')) {
        return HABIT_COLOR_THEMES.learning;
      }
      
      // Default to growth for goals
      return HABIT_COLOR_THEMES.growth;
    }
    
    // 3. Check habit title/description for keywords
    const titleLower = habit.title.toLowerCase();
    const descLower = (habit.description || '').toLowerCase();
    const combined = `${titleLower} ${descLower}`;
    
    if (combined.includes('water') || combined.includes('hydrate') || combined.includes('drink')) {
      return HABIT_COLOR_THEMES.health;
    }
    if (combined.includes('exercise') || combined.includes('workout') || combined.includes('fitness')) {
      return HABIT_COLOR_THEMES.health;
    }
    if (combined.includes('meditation') || combined.includes('mindfulness') || combined.includes('reflect')) {
      return HABIT_COLOR_THEMES.reflection;
    }
    if (combined.includes('read') || combined.includes('study') || combined.includes('learn')) {
      return HABIT_COLOR_THEMES.learning;
    }
    if (combined.includes('write') || combined.includes('journal') || combined.includes('creative')) {
      return HABIT_COLOR_THEMES.creativity;
    }
    if (combined.includes('stretch') || combined.includes('yoga') || combined.includes('movement')) {
      return HABIT_COLOR_THEMES.health;
    }
    
    // 4. Default to neutral
    const baseTheme = HABIT_COLOR_THEMES.default;
    
    // Apply time-of-day shift if provided
    if (timeOfDay) {
      return applyTimeOfDayColorShift(baseTheme, timeOfDay);
    }
    
    return baseTheme;
  } catch (error) {
    console.error('[habitColorHelpers] Error determining color theme:', error);
    const fallbackTheme = HABIT_COLOR_THEMES.default;
    return timeOfDay ? applyTimeOfDayColorShift(fallbackTheme, timeOfDay) : fallbackTheme;
  }
}
