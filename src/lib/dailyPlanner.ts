import { supabase } from './supabase';

export interface DailyPlannerEntry {
  id: string;
  user_id: string;
  date: string;
  focus_text: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  hydration_count: number;
  mood_rating: number | null;
  sleep_rating: number | null;
  improvements: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlannerExpense {
  id: string;
  entry_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export async function getDailyPlannerEntry(
  userId: string,
  date: Date
): Promise<DailyPlannerEntry | null> {
  const dateString = date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_planner_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateString)
    .maybeSingle();

  if (error) {
    console.error('Error fetching daily planner entry:', error);
    throw error;
  }

  return data;
}

export async function upsertDailyPlannerEntry(
  userId: string,
  date: Date,
  updates: Partial<Omit<DailyPlannerEntry, 'id' | 'user_id' | 'date' | 'created_at' | 'updated_at'>>
): Promise<DailyPlannerEntry> {
  const dateString = date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_planner_entries')
    .upsert(
      {
        user_id: userId,
        date: dateString,
        ...updates,
      },
      {
        onConflict: 'user_id,date',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting daily planner entry:', error);
    throw error;
  }

  return data;
}

export async function getExpensesForEntry(
  entryId: string
): Promise<DailyPlannerExpense[]> {
  const { data, error } = await supabase
    .from('daily_planner_expenses')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  return data || [];
}

export async function addExpense(
  entryId: string,
  description: string,
  amount: number
): Promise<DailyPlannerExpense> {
  const { data, error } = await supabase
    .from('daily_planner_expenses')
    .insert({
      entry_id: entryId,
      description,
      amount,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding expense:', error);
    throw error;
  }

  return data;
}

export async function updateExpense(
  expenseId: string,
  updates: { description?: string; amount?: number }
): Promise<DailyPlannerExpense> {
  const { data, error } = await supabase
    .from('daily_planner_expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating expense:', error);
    throw error;
  }

  return data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_planner_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}
