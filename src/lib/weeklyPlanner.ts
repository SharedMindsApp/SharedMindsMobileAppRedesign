import { supabase } from './supabase';

export interface WeeklyPlannerEntry {
  id: string;
  user_id: string;
  week_start_date: string;
  notes: string;
  goals: string[];
  created_at: string;
  updated_at: string;
}

// WeeklyPlannerEvent interface removed - calendar events now use PersonalCalendarEvent from calendarService

export function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function getWeeklyPlannerEntry(
  userId: string,
  weekStartDate: Date
): Promise<WeeklyPlannerEntry | null> {
  const dateString = weekStartDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_planner_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', dateString)
    .maybeSingle();

  if (error) {
    console.error('Error fetching weekly planner entry:', error);
    throw error;
  }

  return data;
}

export async function upsertWeeklyPlannerEntry(
  userId: string,
  weekStartDate: Date,
  updates: Partial<Omit<WeeklyPlannerEntry, 'id' | 'user_id' | 'week_start_date' | 'created_at' | 'updated_at'>>
): Promise<WeeklyPlannerEntry> {
  const dateString = weekStartDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_planner_entries')
    .upsert(
      {
        user_id: userId,
        week_start_date: dateString,
        ...updates,
      },
      {
        onConflict: 'user_id,week_start_date',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting weekly planner entry:', error);
    throw error;
  }

  return data;
}

// Legacy calendar event functions removed - use getPersonalEventsForDateRange() from calendarService instead
