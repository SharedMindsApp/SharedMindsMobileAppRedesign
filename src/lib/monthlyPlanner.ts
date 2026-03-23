import { supabase } from './supabase';

export interface MonthlyPlannerEntry {
  id: string;
  user_id: string;
  year: number;
  month: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyPlannerTodo {
  id: string;
  entry_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
}

// MonthlyPlannerEvent removed - calendar events now use PersonalCalendarEvent from calendarService

export async function getMonthlyPlannerEntry(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyPlannerEntry | null> {
  const { data, error } = await supabase
    .from('monthly_planner_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    console.error('Error fetching monthly planner entry:', error);
    throw error;
  }

  return data;
}

export async function upsertMonthlyPlannerEntry(
  userId: string,
  year: number,
  month: number,
  updates: Partial<Omit<MonthlyPlannerEntry, 'id' | 'user_id' | 'year' | 'month' | 'created_at' | 'updated_at'>>
): Promise<MonthlyPlannerEntry> {
  const { data, error } = await supabase
    .from('monthly_planner_entries')
    .upsert(
      {
        user_id: userId,
        year,
        month,
        ...updates,
      },
      {
        onConflict: 'user_id,year,month',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting monthly planner entry:', error);
    throw error;
  }

  return data;
}

export async function getMonthlyTodos(entryId: string): Promise<MonthlyPlannerTodo[]> {
  const { data, error } = await supabase
    .from('monthly_planner_todos')
    .select('*')
    .eq('entry_id', entryId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching monthly todos:', error);
    throw error;
  }

  return data || [];
}

export async function addMonthlyTodo(
  entryId: string,
  title: string,
  orderIndex: number
): Promise<MonthlyPlannerTodo> {
  const { data, error } = await supabase
    .from('monthly_planner_todos')
    .insert({
      entry_id: entryId,
      title,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding monthly todo:', error);
    throw error;
  }

  return data;
}

export async function updateMonthlyTodo(
  todoId: string,
  updates: { title?: string; completed?: boolean; order_index?: number }
): Promise<MonthlyPlannerTodo> {
  const { data, error } = await supabase
    .from('monthly_planner_todos')
    .update(updates)
    .eq('id', todoId)
    .select()
    .single();

  if (error) {
    console.error('Error updating monthly todo:', error);
    throw error;
  }

  return data;
}

export async function deleteMonthlyTodo(todoId: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_planner_todos')
    .delete()
    .eq('id', todoId);

  if (error) {
    console.error('Error deleting monthly todo:', error);
    throw error;
  }
}

// Legacy calendar event functions removed - use getPersonalEventsForDateRange() from calendarService instead
