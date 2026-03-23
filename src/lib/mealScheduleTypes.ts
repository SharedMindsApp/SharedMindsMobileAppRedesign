/**
 * Meal Schedule Types
 * 
 * Defines user-configurable meal schedules that support:
 * - Custom meal slots (not just breakfast/lunch/dinner)
 * - Fasting periods
 * - Different schedules per day of week
 * - Religious, cultural, medical, and lifestyle patterns
 */

export type MealSlotType = 'meal' | 'fast';

export interface MealSlot {
  id: string;
  label: string; // e.g. "Breakfast", "Iftar", "Suhoor", "Snack", "Fasting"
  type: MealSlotType; // 'meal' | 'fast'
  startTime?: string; // Optional (HH:mm format, e.g. "08:00")
  endTime?: string; // Optional (HH:mm format, e.g. "20:00")
  default: boolean; // System-provided (true) or user-created (false)
  order: number; // Display order within the day
  mealTypeMapping?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // Optional: map to recipe meal_type for suggestions
}

export interface DailyMealSchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday, matching JavaScript Date.getDay())
  slots: MealSlot[];
  enabled: boolean; // Whether this day's schedule is active
}

export interface MealSchedule {
  id: string;
  profile_id?: string | null; // References profiles(id) for personal schedules, null for household schedules
  household_id?: string | null; // null for personal schedules
  space_id: string; // Always set - either personal or household space
  name: string; // e.g. "Standard", "Ramadan", "Intermittent Fasting"
  is_default: boolean; // Whether this is the default schedule
  is_active: boolean; // Whether this schedule is currently active (used in meal planner)
  start_date?: string | null; // Optional start date (YYYY-MM-DD) - schedule becomes active on this date
  end_date?: string | null; // Optional end date (YYYY-MM-DD) - schedule becomes inactive after this date
  schedules: DailyMealSchedule[]; // One per day of week (0-6)
  created_at: string;
  updated_at: string;
}

/**
 * Check if a schedule is currently active based on its date range
 */
export function isScheduleActive(schedule: MealSchedule, checkDate?: Date): boolean {
  if (!schedule.is_active) {
    return false;
  }

  const date = checkDate || new Date();
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Check start date
  if (schedule.start_date) {
    const startDate = new Date(schedule.start_date);
    startDate.setHours(0, 0, 0, 0);
    if (today < startDate) {
      return false;
    }
  }

  // Check end date
  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two schedules have overlapping date ranges
 */
export function schedulesOverlap(schedule1: MealSchedule, schedule2: MealSchedule): boolean {
  // If either schedule has no date range, they overlap if both are active
  if (!schedule1.start_date && !schedule1.end_date && !schedule2.start_date && !schedule2.end_date) {
    return schedule1.is_active && schedule2.is_active;
  }

  // Convert dates to comparable format
  const s1Start = schedule1.start_date ? new Date(schedule1.start_date) : null;
  const s1End = schedule1.end_date ? new Date(schedule1.end_date) : null;
  const s2Start = schedule2.start_date ? new Date(schedule2.start_date) : null;
  const s2End = schedule2.end_date ? new Date(schedule2.end_date) : null;

  // If no dates, check if both are active
  if (!s1Start && !s1End && !s2Start && !s2End) {
    return schedule1.is_active && schedule2.is_active;
  }

  // If one has no dates, it's always active (overlaps with everything)
  if ((!s1Start && !s1End) || (!s2Start && !s2End)) {
    return schedule1.is_active && schedule2.is_active;
  }

  // Check for overlap: s1 starts before s2 ends AND s1 ends after s2 starts
  const s1StartTime = s1Start ? s1Start.getTime() : 0;
  const s1EndTime = s1End ? s1End.getTime() : Number.MAX_SAFE_INTEGER;
  const s2StartTime = s2Start ? s2Start.getTime() : 0;
  const s2EndTime = s2End ? s2End.getTime() : Number.MAX_SAFE_INTEGER;

  return schedule1.is_active && schedule2.is_active && s1StartTime <= s2EndTime && s1EndTime >= s2StartTime;
}

/**
 * Default meal schedule (backward compatible)
 * Provides breakfast, lunch, dinner for all days
 */
export function getDefaultMealSchedule(): MealSchedule {
  const defaultSlots: MealSlot[] = [
    {
      id: 'breakfast',
      label: 'Breakfast',
      type: 'meal',
      default: true,
      order: 0,
      mealTypeMapping: 'breakfast',
    },
    {
      id: 'lunch',
      label: 'Lunch',
      type: 'meal',
      default: true,
      order: 1,
      mealTypeMapping: 'lunch',
    },
    {
      id: 'dinner',
      label: 'Dinner',
      type: 'meal',
      default: true,
      order: 2,
      mealTypeMapping: 'dinner',
    },
  ];

  const schedules: DailyMealSchedule[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    slots: defaultSlots,
    enabled: true,
  }));

  return {
    id: 'default',
    name: 'Standard',
    is_default: true,
    schedules,
    space_id: '', // Will be set when creating
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Preset meal schedules
 */
export const MEAL_SCHEDULE_PRESETS: Omit<MealSchedule, 'id' | 'space_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Standard',
    is_default: true,
    schedules: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: true,
      slots: [
        { id: 'breakfast', label: 'Breakfast', type: 'meal', default: true, order: 0, mealTypeMapping: 'breakfast' },
        { id: 'lunch', label: 'Lunch', type: 'meal', default: true, order: 1, mealTypeMapping: 'lunch' },
        { id: 'dinner', label: 'Dinner', type: 'meal', default: true, order: 2, mealTypeMapping: 'dinner' },
      ],
    })),
  },
  {
    name: 'Intermittent Fasting',
    is_default: false,
    schedules: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: true,
      slots: [
        { id: 'fast', label: 'Fasting', type: 'fast', default: true, order: 0 },
        { id: 'lunch', label: 'Lunch', type: 'meal', default: true, order: 1, mealTypeMapping: 'lunch' },
        { id: 'dinner', label: 'Dinner', type: 'meal', default: true, order: 2, mealTypeMapping: 'dinner' },
      ],
    })),
  },
  {
    name: 'Ramadan',
    is_default: false,
    schedules: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: true,
      slots: [
        { id: 'suhoor', label: 'Suhoor', type: 'meal', default: true, order: 0, startTime: '04:00', mealTypeMapping: 'breakfast' },
        { id: 'fast', label: 'Fasting', type: 'fast', default: true, order: 1 },
        { id: 'iftar', label: 'Iftar', type: 'meal', default: true, order: 2, startTime: '19:00', mealTypeMapping: 'dinner' },
      ],
    })),
  },
  {
    name: 'Shift Worker',
    is_default: false,
    schedules: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: true,
      slots: [
        { id: 'late-meal', label: 'Late Meal', type: 'meal', default: true, order: 0, startTime: '14:00', mealTypeMapping: 'lunch' },
        { id: 'night-meal', label: 'Night Meal', type: 'meal', default: true, order: 1, startTime: '22:00', mealTypeMapping: 'dinner' },
      ],
    })),
  },
];

/**
 * Get meal schedule for a specific day
 */
export function getMealScheduleForDay(
  schedule: MealSchedule,
  dayOfWeek: number
): DailyMealSchedule | null {
  const daySchedule = schedule.schedules.find(s => s.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.enabled) {
    return null;
  }
  return daySchedule;
}

/**
 * Get active meal slots (non-fasting) for a day
 */
export function getActiveMealSlots(schedule: MealSchedule, dayOfWeek: number): MealSlot[] {
  const daySchedule = getMealScheduleForDay(schedule, dayOfWeek);
  if (!daySchedule) {
    return [];
  }
  return daySchedule.slots.filter(slot => slot.type === 'meal');
}

/**
 * Check if a slot is a fasting slot
 */
export function isFastingSlot(slot: MealSlot): boolean {
  return slot.type === 'fast';
}

/**
 * Get all meal slots (including fasting) for a day, sorted by order
 */
export function getAllSlotsForDay(schedule: MealSchedule, dayOfWeek: number): MealSlot[] {
  const daySchedule = getMealScheduleForDay(schedule, dayOfWeek);
  if (!daySchedule) {
    return [];
  }
  return [...daySchedule.slots].sort((a, b) => a.order - b.order);
}
