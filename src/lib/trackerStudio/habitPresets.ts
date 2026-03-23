/**
 * Habit Presets
 * 
 * Predefined list of common habits users might want to track.
 * These are distinct from existing tracker templates to avoid conflicts.
 */

export interface HabitPreset {
  name: string;
  icon: string; // Lucide-react icon name
  category: 'health' | 'productivity' | 'mindfulness' | 'lifestyle' | 'personal-growth';
  description?: string;
}

export const HABIT_PRESETS: HabitPreset[] = [
  // Health & Wellness
  { name: 'Drink Water', icon: 'Droplet', category: 'health' },
  { name: 'Take Vitamins', icon: 'Pill', category: 'health' },
  { name: 'Morning Stretch', icon: 'Activity', category: 'health' },
  { name: 'Take Medication', icon: 'Heart', category: 'health' },
  { name: 'Skin Care Routine', icon: 'Sparkles', category: 'health' },
  { name: 'Cold Shower', icon: 'Droplet', category: 'health' },
  
  // Productivity & Learning
  { name: 'Read', icon: 'BookOpen', category: 'productivity' },
  { name: 'Write/Journal', icon: 'PenTool', category: 'productivity' },
  { name: 'Learn Something New', icon: 'GraduationCap', category: 'productivity' },
  { name: 'Review Goals', icon: 'Target', category: 'productivity' },
  { name: 'Plan Next Day', icon: 'Calendar', category: 'productivity' },
  { name: 'Deep Work Session', icon: 'Zap', category: 'productivity' },
  { name: 'No Social Media', icon: 'Smartphone', category: 'productivity' },
  { name: 'Digital Detox', icon: 'Wifi', category: 'productivity' },
  
  // Mindfulness & Self-Care
  { name: 'Meditation', icon: 'Wind', category: 'mindfulness' },
  { name: 'Gratitude Practice', icon: 'Heart', category: 'mindfulness' },
  { name: 'Breathing Exercise', icon: 'Activity', category: 'mindfulness' },
  { name: 'Mindful Walking', icon: 'Footprints', category: 'mindfulness' },
  { name: 'Nature Time', icon: 'Trees', category: 'mindfulness' },
  { name: 'Self Reflection', icon: 'Brain', category: 'mindfulness' },
  
  // Lifestyle & Personal Growth
  { name: 'Make Bed', icon: 'Bed', category: 'lifestyle' },
  { name: 'Tidy Room', icon: 'Home', category: 'lifestyle' },
  { name: 'Cook at Home', icon: 'ChefHat', category: 'lifestyle' },
  { name: 'Call Family/Friends', icon: 'Phone', category: 'lifestyle' },
  { name: 'Creative Activity', icon: 'Palette', category: 'personal-growth' },
  { name: 'Practice Instrument', icon: 'Music', category: 'personal-growth' },
  { name: 'Practice Language', icon: 'Languages', category: 'personal-growth' },
  { name: 'Evening Wind-down', icon: 'Moon', category: 'lifestyle' },
  { name: 'Quality Sleep Prep', icon: 'Bed', category: 'lifestyle' },
  { name: 'Limit Caffeine', icon: 'Coffee', category: 'lifestyle' },
  
  // Habits to Break
  { name: 'Stop Smoking', icon: 'X', category: 'health' },
  { name: 'No Alcohol', icon: 'Droplet', category: 'health' },
  { name: 'Limit Screen Time', icon: 'Smartphone', category: 'productivity' },
  { name: 'No Fast Food', icon: 'UtensilsCrossed', category: 'health' },
  { name: 'Stop Nail Biting', icon: 'Hand', category: 'health' },
  { name: 'Reduce Procrastination', icon: 'Clock', category: 'productivity' },
  { name: 'Stop Overspending', icon: 'DollarSign', category: 'lifestyle' },
  { name: 'No Snooze Button', icon: 'Clock', category: 'lifestyle' },
  { name: 'Stop Stress Eating', icon: 'Heart', category: 'health' },
  { name: 'No Negative Self-Talk', icon: 'Brain', category: 'mindfulness' },
  { name: 'Stop Late Night Snacking', icon: 'Moon', category: 'health' },
  { name: 'No Impulse Purchases', icon: 'ShoppingCart', category: 'lifestyle' },
  { name: 'Stop Multitasking', icon: 'Target', category: 'productivity' },
  { name: 'No Skipping Meals', icon: 'UtensilsCrossed', category: 'health' },
  { name: 'Stop Complaining', icon: 'MessageCircle', category: 'mindfulness' },
];

/**
 * Get habits by category
 */
export function getHabitsByCategory(): Map<string, HabitPreset[]> {
  const byCategory = new Map<string, HabitPreset[]>();
  
  for (const habit of HABIT_PRESETS) {
    if (!byCategory.has(habit.category)) {
      byCategory.set(habit.category, []);
    }
    byCategory.get(habit.category)!.push(habit);
  }
  
  return byCategory;
}

/**
 * Get all habit names (for validation/checking)
 */
export function getAllHabitNames(): string[] {
  return HABIT_PRESETS.map(h => h.name);
}

/**
 * Get habit preset by name
 */
export function getHabitPreset(name: string): HabitPreset | undefined {
  return HABIT_PRESETS.find(h => h.name.toLowerCase() === name.toLowerCase());
}

/**
 * Shuffle array randomly (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get randomized habit presets
 */
export function getRandomizedHabits(): HabitPreset[] {
  return shuffleArray(HABIT_PRESETS);
}
