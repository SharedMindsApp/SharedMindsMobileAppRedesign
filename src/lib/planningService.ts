import { supabase } from './supabase';
import type { LongTermGoal } from './visionService';
import { getPersonalEventsForDateRange } from './personalSpaces/calendarService';

export interface PlanningTodo {
  id: string;
  entry_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
  entry_date?: {
    year: number;
    month: number;
  };
}

export interface PlanningEvent {
  id: string;
  title: string;
  description?: string;
  date?: string;
  day_of_week?: number;
  hour?: number;
  duration_minutes?: number;
  color: string;
  source: 'weekly' | 'monthly' | 'daily';
  created_at: string;
}

export interface DailyEntry {
  id: string;
  date: string;
  focus_text?: string;
  notes?: string;
  mood_rating?: number;
  sleep_rating?: number;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  hydration_count?: number;
  improvements?: string;
}

export interface WeeklyEntry {
  id: string;
  week_start_date: string;
  notes?: string;
  goals: string[];
}

export interface MonthlyEntry {
  id: string;
  year: number;
  month: number;
  notes?: string;
}

export async function getTodosForPeriod(period: 'today' | 'week' | 'month' | 'all' = 'all') {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let query = supabase
    .from('monthly_planner_todos')
    .select(`
      *,
      entry:monthly_planner_entries!inner(year, month, user_id)
    `)
    .order('order_index', { ascending: true });

  if (period === 'month') {
    query = query.eq('entry.year', currentYear).eq('entry.month', currentMonth);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(todo => ({
    id: todo.id,
    entry_id: todo.entry_id,
    title: todo.title,
    completed: todo.completed,
    order_index: todo.order_index,
    created_at: todo.created_at,
    entry_date: todo.entry ? {
      year: todo.entry.year,
      month: todo.entry.month
    } : undefined
  })) as PlanningTodo[];
}

export async function createTodo(todo: { entry_id: string; title: string; order_index?: number }) {
  const { data, error } = await supabase
    .from('monthly_planner_todos')
    .insert(todo)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningTodo;
}

export async function updateTodo(id: string, updates: Partial<PlanningTodo>) {
  const { data, error } = await supabase
    .from('monthly_planner_todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningTodo;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase
    .from('monthly_planner_todos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getActiveGoals() {
  const { data, error } = await supabase
    .from('vision_long_term_goals')
    .select('*')
    .eq('is_active', true)
    .in('status', ['active', 'forming'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LongTermGoal[];
}

export async function getUpcomingEvents(userId: string, days: number = 30): Promise<PlanningEvent[]> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // Use unified personal calendar events instead of legacy monthly_planner_events
  const events = await getPersonalEventsForDateRange(
    userId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  return events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description || undefined,
    date: event.startAt.split('T')[0],
    color: 'blue', // Default color, can be extended if PersonalCalendarEvent includes color
    source: 'monthly' as const, // Keep for backward compatibility
    created_at: event.createdAt || new Date().toISOString()
  })) as PlanningEvent[];
}

export async function getDailyEntry(date: string) {
  const { data, error } = await supabase
    .from('daily_planner_entries')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data as DailyEntry | null;
}

export async function getOrCreateDailyEntry(date: string) {
  const existing = await getDailyEntry(date);
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('daily_planner_entries')
    .insert({ user_id: user.id, date })
    .select()
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

export async function updateDailyEntry(date: string, updates: Partial<DailyEntry>) {
  const { data, error } = await supabase
    .from('daily_planner_entries')
    .update(updates)
    .eq('date', date)
    .select()
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

export async function getWeeklyEntry(weekStartDate: string) {
  const { data, error } = await supabase
    .from('weekly_planner_entries')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    ...data,
    goals: Array.isArray(data.goals) ? data.goals : []
  } as WeeklyEntry;
}

export async function getOrCreateWeeklyEntry(weekStartDate: string) {
  const existing = await getWeeklyEntry(weekStartDate);
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weekly_planner_entries')
    .insert({ user_id: user.id, week_start_date: weekStartDate, goals: [] })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    goals: []
  } as WeeklyEntry;
}

export async function updateWeeklyEntry(weekStartDate: string, updates: Partial<WeeklyEntry>) {
  const { data, error } = await supabase
    .from('weekly_planner_entries')
    .update(updates)
    .eq('week_start_date', weekStartDate)
    .select()
    .single();

  if (error) throw error;
  return data as WeeklyEntry;
}

export async function getMonthlyEntry(year: number, month: number) {
  const { data, error } = await supabase
    .from('monthly_planner_entries')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  return data as MonthlyEntry | null;
}

export async function getOrCreateMonthlyEntry(year: number, month: number) {
  const existing = await getMonthlyEntry(year, month);
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('monthly_planner_entries')
    .insert({ user_id: user.id, year, month })
    .select()
    .single();

  if (error) throw error;
  return data as MonthlyEntry;
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekDateRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}
