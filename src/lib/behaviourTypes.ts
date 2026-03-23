export type RepeatType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type AchievementType =
  | 'streak'
  | 'milestone'
  | 'goal_progress'
  | 'habit_mastery'
  | 'calendar_consistency';

export type AchievementCategory =
  | 'streaks'
  | 'habits'
  | 'goals'
  | 'consistency'
  | 'calendar';

export type EventColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple' | 'gray' | 'orange' | 'pink';

export interface RepeatConfig {
  days?: number[];
  interval?: number;
  weekdays?: string[];
  monthDay?: number;
}

export interface Habit {
  id: string;
  household_id: string;
  created_by: string;
  assigned_to: string[];
  goal_id?: string | null;
  title: string;
  description: string;
  repeat_type: RepeatType;
  repeat_config: RepeatConfig;
  starts_at: string;
  ends_at?: string | null;
  color: EventColor;
  reset_on_miss: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitData {
  household_id: string;
  title: string;
  description?: string;
  repeat_type: RepeatType;
  repeat_config?: RepeatConfig;
  starts_at?: string;
  ends_at?: string | null;
  assigned_to?: string[];
  goal_id?: string | null;
  color?: EventColor;
  reset_on_miss?: boolean;
}

export interface UpdateHabitData {
  title?: string;
  description?: string;
  repeat_type?: RepeatType;
  repeat_config?: RepeatConfig;
  starts_at?: string;
  ends_at?: string | null;
  assigned_to?: string[];
  goal_id?: string | null;
  color?: EventColor;
  reset_on_miss?: boolean;
  is_active?: boolean;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  profile_id: string;
  entry_date: string;
  completed: boolean;
  completed_at: string;
  notes: string;
}

export interface CreateHabitEntryData {
  habit_id: string;
  profile_id: string;
  entry_date: string;
  completed?: boolean;
  notes?: string;
}

export interface HabitWithEntries extends Habit {
  entries?: HabitEntry[];
  current_streak?: number;
  total_completions?: number;
  completion_rate?: number;
}

export interface AchievementMeta {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  category: AchievementCategory;
  created_at: string;
}

export interface AchievementLog {
  id: string;
  household_id: string;
  profile_id: string;
  habit_id?: string | null;
  goal_id?: string | null;
  type: AchievementType;
  label: string;
  value: number;
  created_at: string;
}

export interface AchievementWithMeta extends AchievementLog {
  meta?: AchievementMeta;
  progress?: number;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate: number;
  last_completed?: string;
}

export interface HabitStats {
  habit_id: string;
  profile_id: string;
  streak_info: StreakInfo;
  weekly_completions: number;
  monthly_completions: number;
  achievements_unlocked: AchievementLog[];
}

export interface ReminderData {
  id: string;
  household_id: string;
  created_by: string;
  assigned_to: string[];
  habit_id?: string | null;
  title: string;
  description: string;
  reminder_date: string;
  reminder_time?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface CreateReminderData {
  household_id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time?: string | null;
  assigned_to?: string[];
  habit_id?: string | null;
}

export interface BehaviourLoopContext {
  household_id: string;
  profile_id: string;
  habits: Habit[];
  goals: any[];
  calendar_events: any[];
  reminders: ReminderData[];
  achievements: AchievementLog[];
}

export interface CompletionResult {
  success: boolean;
  habit_entry?: HabitEntry;
  new_achievements?: AchievementLog[];
  goal_progress_updated?: boolean;
  streak_info?: StreakInfo;
  reminders_cleared?: number;
}
