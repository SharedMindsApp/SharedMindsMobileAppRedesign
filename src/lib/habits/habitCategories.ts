/**
 * Habit Category System
 * 
 * Curated, human categories for habit discovery and creation.
 * Categories are discovery surfaces, not rigid taxonomies.
 * 
 * Design Principles:
 * - Human language, not productivity jargon
 * - Supportive, not prescriptive
 * - Progressive disclosure
 * - No judgment or pressure
 */

import { 
  Sun, 
  Brain, 
  Heart, 
  Palette, 
  Users, 
  Home, 
  MinusCircle, 
  Sprout,
  UtensilsCrossed,
  Briefcase,
  Moon
} from 'lucide-react';
import type { HabitTarget } from './habitsService';

export type HabitCategoryType = 'build' | 'break' | 'both';

export interface SuggestedHabit {
  title: string;
  intent?: string; // Short reason why this helps (e.g., "Keeps mornings light")
  reason?: string; // Contextual hint (e.g., "Common first habit")
  defaultTarget?: HabitTarget; // Optional default target for this habit
}

export interface HabitCategory {
  id: string;
  name: string;
  description: string; // 1 short supportive sentence
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string; // Tailwind color class
  type: HabitCategoryType;
  suggestedHabits: SuggestedHabit[];
}

/**
 * Curated habit categories for discovery
 */
export const HABIT_CATEGORIES: HabitCategory[] = [
  {
    id: 'daily-foundations',
    name: 'Morning & Daily Foundations',
    description: 'Small stabilising habits that make days easier.',
    icon: Sun,
    accentColor: 'amber',
    type: 'build',
    suggestedHabits: [
      { title: 'Make the bed' },
      { title: 'Wake up at a consistent time' },
      { title: 'Drink a glass of water' },
      { title: 'Brush teeth (morning)' },
      { title: 'Wash face' },
      { title: 'Take vitamins or medication' },
      { 
        title: 'Stretch for 5 minutes',
        defaultTarget: {
          metricType: 'duration',
          targetValue: 5,
          unit: 'minutes',
          comparison: 'at_least',
          description: 'At least 5 minutes of stretching'
        }
      },
      { title: 'Get daylight exposure' },
      { 
        title: 'No phone for first 30 minutes',
        defaultTarget: {
          metricType: 'duration',
          targetValue: 30,
          unit: 'minutes',
          comparison: 'at_least',
          description: 'At least 30 minutes phone-free'
        }
      },
      { title: 'Eat breakfast' },
    ],
  },
  {
    id: 'focus-mental-clarity',
    name: 'Focus & Mental Clarity',
    description: 'Habits that reduce cognitive noise.',
    icon: Brain,
    accentColor: 'indigo',
    type: 'build',
    suggestedHabits: [
      { title: 'Plan the day' },
      { title: 'Review top 3 priorities' },
      { title: 'Single-task for 25 minutes' },
      { title: 'Journal (any amount)' },
      { title: 'Gratitude entry' },
      { title: 'Breathing exercise' },
      { title: 'Meditation' },
      { title: 'Brain dump thoughts' },
      { title: 'Limit social media' },
      { title: 'No doomscrolling' },
    ],
  },
  {
    id: 'health-energy',
    name: 'Health & Physical Wellbeing',
    description: 'Low-pressure health maintenance.',
    icon: Heart,
    accentColor: 'emerald',
    type: 'build',
    suggestedHabits: [
      { 
        title: 'Walk 5,000+ steps',
        defaultTarget: {
          metricType: 'count',
          targetValue: 5000,
          unit: 'steps',
          comparison: 'at_least',
          description: 'At least 5,000 steps'
        }
      },
      { title: 'Exercise (any type)' },
      { title: 'Strength training' },
      { title: 'Cardio' },
      { title: 'Mobility work' },
      { 
        title: 'Drink 2L of water',
        defaultTarget: {
          metricType: 'count',
          targetValue: 2,
          unit: 'liters',
          comparison: 'at_least',
          description: 'At least 2 liters of water'
        }
      },
      { title: 'Eat fruit' },
      { title: 'Eat vegetables' },
      { title: 'Avoid sugary drinks' },
      { 
        title: 'Limit caffeine',
        defaultTarget: {
          metricType: 'limit',
          targetValue: 1,
          unit: 'cups',
          comparison: 'at_most',
          description: 'Up to 1 caffeinated drink'
        }
      },
    ],
  },
  {
    id: 'nutrition-eating',
    name: 'Nutrition & Eating Habits',
    description: 'Gentle eating habits that support wellbeing.',
    icon: UtensilsCrossed,
    accentColor: 'emerald',
    type: 'build',
    suggestedHabits: [
      { title: 'Eat mindfully' },
      { title: 'No late-night snacking' },
      { title: 'Cook a meal' },
      { title: 'Protein with meals' },
      { title: 'Balanced lunch' },
      { title: 'Pack lunch' },
      { title: 'Track meals' },
      { title: 'No ultra-processed food' },
      { title: 'Stop eating before bedtime' },
      { title: 'Eat without screens' },
    ],
  },
  {
    id: 'creativity-expression',
    name: 'Creativity & Expression',
    description: 'Identity-building habits.',
    icon: Palette,
    accentColor: 'purple',
    type: 'build',
    suggestedHabits: [
      { title: 'Write (any amount)' },
      { title: 'Read 10 pages' },
      { title: 'Practice an instrument' },
      { title: 'Draw or sketch' },
      { title: 'Photography practice' },
      { title: 'Record an idea' },
      { title: 'Learn something new' },
      { title: 'Creative free time' },
      { title: 'Watch something inspiring' },
      { title: 'Work on a personal project' },
    ],
  },
  {
    id: 'relationships-connection',
    name: 'Relationships & Connection',
    description: 'Light social habits.',
    icon: Users,
    accentColor: 'rose',
    type: 'build',
    suggestedHabits: [
      { title: 'Message a friend' },
      { title: 'Check in with partner' },
      { title: 'Quality time (no screens)' },
      { title: 'Express appreciation' },
      { title: 'Call family member' },
      { title: 'Listen without interrupting' },
      { title: 'Social interaction' },
      { title: 'Do something kind' },
      { title: 'Hug someone' },
      { title: 'Respond to messages mindfully' },
    ],
  },
  {
    id: 'environment-order',
    name: 'Environment & Order',
    description: 'Habits that reduce background stress.',
    icon: Home,
    accentColor: 'slate',
    type: 'build',
    suggestedHabits: [
      { title: 'Tidy one small area' },
      { title: 'Wash dishes' },
      { title: 'Clean workspace' },
      { title: 'Take out rubbish' },
      { title: 'Laundry task' },
      { title: 'Make living space calm' },
      { title: 'Reset room before bed' },
      { title: 'Organise one item' },
      { title: 'Open windows' },
      { title: 'Prepare clothes for tomorrow' },
    ],
  },
  {
    id: 'work-life-maintenance',
    name: 'Work & Life Maintenance',
    description: 'Habits that support work-life balance.',
    icon: Brain,
    accentColor: 'blue',
    type: 'build',
    suggestedHabits: [
      { title: 'Check emails intentionally' },
      { title: 'Log work hours' },
      { title: 'Deep work session' },
      { title: 'Admin task' },
      { title: 'Update task list' },
      { title: 'Review progress' },
      { title: 'Learn a work skill' },
      { title: 'Follow up on something' },
      { title: 'Finish one small task' },
      { title: 'Stop work on time' },
    ],
  },
  {
    id: 'evening-wind-down',
    name: 'Evening & Wind-Down',
    description: 'Habits that support restful evenings.',
    icon: Moon,
    accentColor: 'indigo',
    type: 'build',
    suggestedHabits: [
      { title: 'Brush teeth (night)' },
      { title: 'Skincare routine' },
      { title: 'Reflect on the day' },
      { title: 'Screen-free before bed' },
      { title: 'Read before sleep' },
      { title: 'Stretch before bed' },
      { title: 'Prepare for tomorrow' },
      { title: 'Go to bed on time' },
      { title: 'Lights out at consistent time' },
      { title: 'Gratitude reflection' },
    ],
  },
  {
    id: 'reduce-break',
    name: 'Habits to Reduce',
    description: 'Non-judgemental framing for habit reduction.',
    icon: MinusCircle,
    accentColor: 'gray',
    type: 'break',
    suggestedHabits: [
      { title: 'Pause before scrolling' },
      { 
        title: 'Limit social media time',
        defaultTarget: {
          metricType: 'limit',
          targetValue: 30,
          unit: 'minutes',
          comparison: 'at_most',
          description: 'Up to 30 minutes of social media'
        }
      },
      { title: 'No phone in bed' },
      { title: 'Reduce snacking' },
      { 
        title: 'Reduce caffeine after midday',
        defaultTarget: {
          metricType: 'limit',
          targetValue: 0,
          unit: 'cups',
          comparison: 'at_most',
          description: 'No caffeine after midday'
        }
      },
      { title: 'Reduce negative self-talk' },
      { title: 'Reduce impulsive spending' },
      { title: 'Reduce late nights' },
      { title: 'Reduce multitasking' },
      { title: 'Reduce screen time' },
    ],
  },
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): HabitCategory | undefined {
  return HABIT_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get categories by type
 */
export function getCategoriesByType(type: HabitCategoryType): HabitCategory[] {
  return HABIT_CATEGORIES.filter(cat => cat.type === type || cat.type === 'both');
}

/**
 * Get suggested categories based on context
 */
export async function getSuggestedCategories(
  userId: string,
  existingHabitsCount: number
): Promise<HabitCategory[]> {
  const hour = new Date().getHours();
  const categories = [...HABIT_CATEGORIES];

  // If user has no habits, prioritize "Daily Foundations"
  if (existingHabitsCount === 0) {
    const dailyFoundations = categories.find(c => c.id === 'daily-foundations');
    const others = categories.filter(c => c.id !== 'daily-foundations');
    return dailyFoundations ? [dailyFoundations, ...others] : categories;
  }

  // If morning, prioritize "Daily Foundations"
  if (hour < 12) {
    const dailyFoundations = categories.find(c => c.id === 'daily-foundations');
    const others = categories.filter(c => c.id !== 'daily-foundations');
    return dailyFoundations ? [dailyFoundations, ...others] : categories;
  }

  // Check if user has goals and prioritize related categories
  try {
    const { listGoals } = await import('../goals/goalsService');
    const { getActivity } = await import('../activities/activityService');
    const goals = await listGoals(userId);
    
    if (goals.length > 0) {
      // Check goal titles for keywords to suggest relevant categories
      const goalKeywords = new Set<string>();
      for (const goal of goals.slice(0, 5)) {
        try {
          const activity = await getActivity(goal.goal_activity_id);
          if (activity) {
            const titleLower = activity.title.toLowerCase();
            if (titleLower.includes('health') || titleLower.includes('fitness') || titleLower.includes('wellness')) {
              goalKeywords.add('health');
            }
            if (titleLower.includes('focus') || titleLower.includes('productivity') || titleLower.includes('concentration')) {
              goalKeywords.add('focus');
            }
            if (titleLower.includes('creativity') || titleLower.includes('art') || titleLower.includes('creative')) {
              goalKeywords.add('creativity');
            }
            if (titleLower.includes('learn') || titleLower.includes('study') || titleLower.includes('education')) {
              goalKeywords.add('growth');
            }
          }
        } catch {
          // Skip if goal activity can't be loaded
        }
      }

      // Reorder categories based on goal keywords
      if (goalKeywords.size > 0) {
        const prioritized: HabitCategory[] = [];
        const others: HabitCategory[] = [];

        for (const category of categories) {
          const categoryNameLower = category.name.toLowerCase();
          let isRelevant = false;

          if (goalKeywords.has('health') && (categoryNameLower.includes('health') || category.id === 'health-energy' || category.id === 'nutrition-eating')) {
            isRelevant = true;
          }
          if (goalKeywords.has('focus') && (categoryNameLower.includes('focus') || category.id === 'focus-mental-clarity')) {
            isRelevant = true;
          }
          if (goalKeywords.has('creativity') && (categoryNameLower.includes('creativity') || category.id === 'creativity-expression')) {
            isRelevant = true;
          }
          if (goalKeywords.has('growth') && (categoryNameLower.includes('growth') || categoryNameLower.includes('work'))) {
            isRelevant = true;
          }

          if (isRelevant) {
            prioritized.push(category);
          } else {
            others.push(category);
          }
        }

        return [...prioritized, ...others];
      }
    }
  } catch (error) {
    // Non-fatal: continue with default ordering
    console.warn('[habitCategories] Error checking goals:', error);
  }

  // Default: return all categories
  return categories;
}
