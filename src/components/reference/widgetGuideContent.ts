/**
 * Widget Guide Content
 * 
 * Phase 9: All widgets available in Spaces explained in plain language.
 * 
 * Each widget has:
 * - What it is (one sentence)
 * - When to use it (one sentence)
 * - Category grouping
 */

export interface WidgetGuideItem {
  id: string;
  title: string;
  icon: string;
  category: string;
  whatItIs: string;
  whenToUse: string;
}

export const WIDGET_GUIDE_ITEMS: WidgetGuideItem[] = [
  // Content Category
  {
    id: 'note',
    title: 'Note',
    icon: '📝',
    category: 'Content',
    whatItIs: 'A simple text widget for writing quick notes, memos, or reminders.',
    whenToUse: 'Use Notes when you need to jot down ideas, keep reminders, or store text information in your Space.',
  },
  {
    id: 'insight',
    title: 'Insight',
    icon: '✨',
    category: 'Content',
    whatItIs: 'A special widget for capturing important insights, realizations, or key learnings.',
    whenToUse: 'Use Insights when you want to highlight important thoughts or discoveries that deserve special attention.',
  },
  
  // Planning Category
  {
    id: 'reminder',
    title: 'Reminder',
    icon: '🔔',
    category: 'Planning',
    whatItIs: 'A widget that helps you set reminders and alerts for important tasks or events.',
    whenToUse: 'Use Reminders when you need to be notified about something at a specific time or date.',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    category: 'Planning',
    whatItIs: 'A calendar widget that shows your upcoming events and appointments.',
    whenToUse: 'Use Calendar to see what\'s happening today, this week, or this month in your Space.',
  },
  {
    id: 'meal_planner',
    title: 'Meal Planner',
    icon: '🍽️',
    category: 'Planning',
    whatItIs: 'A widget for planning your weekly meals and organizing your food schedule.',
    whenToUse: 'Use Meal Planner when you want to organize what you\'ll eat throughout the week.',
  },
  {
    id: 'grocery_list',
    title: 'Grocery List',
    icon: '🛒',
    category: 'Planning',
    whatItIs: 'A shopping list widget for tracking items you need to buy.',
    whenToUse: 'Use Grocery List to keep track of items you need to purchase, especially when meal planning.',
  },
  {
    id: 'todos',
    title: 'To-Do List',
    icon: '✅',
    category: 'Planning',
    whatItIs: 'A task list widget for tracking things you need to do.',
    whenToUse: 'Use To-Do List to organize tasks, check off completed items, and stay on top of your work.',
  },
  
  // Tracking Category
  {
    id: 'goal',
    title: 'Goal',
    icon: '🎯',
    category: 'Tracking',
    whatItIs: 'A widget for setting and tracking your goals with progress indicators.',
    whenToUse: 'Use Goals when you want to define what you\'re working toward and see how close you are.',
  },
  {
    id: 'habit',
    title: 'Habit',
    icon: '⚡',
    category: 'Tracking',
    whatItIs: 'A widget for building and maintaining daily habits with tracking features.',
    whenToUse: 'Use Habits when you want to develop a new routine or track a behavior you\'re trying to establish.',
  },
  {
    id: 'habit_tracker',
    title: 'Habit Tracker',
    icon: '📊',
    category: 'Tracking',
    whatItIs: 'A visual widget that shows your habit streaks and completion history.',
    whenToUse: 'Use Habit Tracker to see your progress over time and visualize how consistent you\'ve been.',
  },
  {
    id: 'achievements',
    title: 'Achievements',
    icon: '🏆',
    category: 'Tracking',
    whatItIs: 'A widget that displays your milestones, wins, and accomplishments.',
    whenToUse: 'Use Achievements to celebrate your progress and keep track of what you\'ve accomplished.',
  },
  
  // Media Category
  {
    id: 'photo',
    title: 'Photo',
    icon: '📷',
    category: 'Media',
    whatItIs: 'A widget for adding photos and images to your Space.',
    whenToUse: 'Use Photos when you want to include images, screenshots, or visual references in your Space.',
  },
  {
    id: 'graphics',
    title: 'Graphics',
    icon: '🎨',
    category: 'Media',
    whatItIs: 'A widget for uploading and placing SVG graphics and vector images.',
    whenToUse: 'Use Graphics when you need to add custom SVG graphics, icons, or vector illustrations to your Space.',
  },
  
  // Organization Category
  {
    id: 'stack_card',
    title: 'Stack Cards',
    icon: '📚',
    category: 'Organization',
    whatItIs: 'A widget that lets you organize information into stackable, card-like containers.',
    whenToUse: 'Use Stack Cards when you want to group related items together in an organized, visual way.',
  },
  {
    id: 'files',
    title: 'Files',
    icon: '📁',
    category: 'Organization',
    whatItIs: 'A widget for managing and organizing your files and documents.',
    whenToUse: 'Use Files when you need to store, organize, or access documents within your Space.',
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: '🗂️',
    category: 'Organization',
    whatItIs: 'A widget for curating and organizing references, links, or related items.',
    whenToUse: 'Use Collections when you want to gather and organize related resources or references together.',
  },
  {
    id: 'tables',
    title: 'Tables',
    icon: '📊',
    category: 'Organization',
    whatItIs: 'A spreadsheet-style widget for organizing data in rows and columns.',
    whenToUse: 'Use Tables when you need to organize structured data, compare items, or create lists with multiple columns.',
  },
];

/**
 * Get widgets by category
 */
export function getWidgetsByCategory(): Record<string, WidgetGuideItem[]> {
  const categories: Record<string, WidgetGuideItem[]> = {};
  
  WIDGET_GUIDE_ITEMS.forEach(widget => {
    if (!categories[widget.category]) {
      categories[widget.category] = [];
    }
    categories[widget.category].push(widget);
  });
  
  return categories;
}

/**
 * Get all widget guide items
 */
export function getAllWidgetGuideItems(): WidgetGuideItem[] {
  return WIDGET_GUIDE_ITEMS;
}
