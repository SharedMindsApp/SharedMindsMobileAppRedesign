/**
 * Planner Guide Content
 * 
 * Phase 9: All Planner features explained in plain language.
 * 
 * Each feature has:
 * - What it is (one sentence)
 * - When to use it (one sentence)
 */

export interface PlannerGuideItem {
  id: string;
  title: string;
  icon: string;
  whatItIs: string;
  whenToUse: string;
}

export const PLANNER_GUIDE_ITEMS: PlannerGuideItem[] = [
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    whatItIs: 'A calendar view that shows all your scheduled events and appointments across different life areas.',
    whenToUse: 'Use Calendar to see what\'s happening today, this week, or this month in one unified view.',
  },
  {
    id: 'personal',
    title: 'Personal',
    icon: '👤',
    whatItIs: 'A planning area for your personal goals, habits, and individual pursuits.',
    whenToUse: 'Use Personal when you want to plan and track things that are just for you, like hobbies or self-improvement.',
  },
  {
    id: 'work',
    title: 'Work',
    icon: '💼',
    whatItIs: 'A dedicated space for planning your professional tasks, projects, and career goals.',
    whenToUse: 'Use Work to organize your job-related activities, deadlines, and professional development.',
  },
  {
    id: 'education',
    title: 'Education',
    icon: '📚',
    whatItIs: 'A planning area for learning goals, courses, study schedules, and educational pursuits.',
    whenToUse: 'Use Education when you\'re taking classes, learning new skills, or pursuing academic goals.',
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: '💰',
    whatItIs: 'A planning space for tracking income, expenses, and financial goals.',
    whenToUse: 'Use Finance to plan your money, track spending, and work toward financial objectives.',
  },
  {
    id: 'budget',
    title: 'Budget',
    icon: '💳',
    whatItIs: 'A tool for creating and managing spending plans and financial limits.',
    whenToUse: 'Use Budget when you need to set spending limits, track expenses against plans, or manage money for specific goals.',
  },
  {
    id: 'vision',
    title: 'Vision',
    icon: '🎯',
    whatItIs: 'A space for long-term goals, dreams, and the big picture of where you want to be.',
    whenToUse: 'Use Vision to define your long-term aspirations and connect daily actions to bigger goals.',
  },
  {
    id: 'planning',
    title: 'Planning',
    icon: '📋',
    whatItIs: 'A general planning area for organizing tasks, projects, and activities that don\'t fit other categories.',
    whenToUse: 'Use Planning for general organization, task lists, and projects that span multiple life areas.',
  },
  {
    id: 'household',
    title: 'Household',
    icon: '🏠',
    whatItIs: 'A shared planning space for home-related tasks, family activities, and household management.',
    whenToUse: 'Use Household to coordinate with family members on chores, home projects, and shared responsibilities.',
  },
  {
    id: 'self-care',
    title: 'Self-Care',
    icon: '🧘',
    whatItIs: 'A dedicated area for planning activities that support your physical and mental well-being.',
    whenToUse: 'Use Self-Care to schedule rest, exercise, meditation, and other activities that help you recharge.',
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: '✈️',
    whatItIs: 'A planning space for trips, vacations, and travel-related activities.',
    whenToUse: 'Use Travel to plan trips, organize itineraries, and track travel-related tasks and expenses.',
  },
  {
    id: 'social',
    title: 'Social',
    icon: '👥',
    whatItIs: 'A planning area for social activities, events, and maintaining relationships.',
    whenToUse: 'Use Social to plan gatherings, track social commitments, and organize time with friends and family.',
  },
  {
    id: 'journal',
    title: 'Journal',
    icon: '📔',
    whatItIs: 'A space for reflection, notes, and capturing thoughts and experiences.',
    whenToUse: 'Use Journal to write down thoughts, reflect on your day, or keep notes about what\'s happening in your life.',
  },
];

/**
 * Get planner guide item by section ID
 */
export function getPlannerGuideItem(sectionId: string): PlannerGuideItem | undefined {
  return PLANNER_GUIDE_ITEMS.find(item => item.id === sectionId);
}

/**
 * Get all planner guide items
 */
export function getAllPlannerGuideItems(): PlannerGuideItem[] {
  return PLANNER_GUIDE_ITEMS;
}
