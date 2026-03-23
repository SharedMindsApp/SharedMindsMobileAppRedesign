import { supabase } from './supabase';
import type { ReminderData, CreateReminderData } from './behaviourTypes';
import type { Habit } from './behaviourTypes';

export async function getHouseholdReminders(
  householdId: string,
  includeCompleted: boolean = false
): Promise<ReminderData[]> {
  let query = supabase
    .from('reminders')
    .select('*')
    .eq('household_id', householdId);

  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }

  const { data, error } = await query.order('reminder_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUserReminders(
  userId: string,
  householdId: string,
  includeCompleted: boolean = false
): Promise<ReminderData[]> {
  let query = supabase
    .from('reminders')
    .select('*')
    .eq('household_id', householdId)
    .contains('assigned_to', [userId]);

  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }

  const { data, error } = await query.order('reminder_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTodayReminders(
  userId: string,
  householdId: string
): Promise<ReminderData[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('household_id', householdId)
    .contains('assigned_to', [userId])
    .eq('reminder_date', today)
    .eq('is_completed', false)
    .order('reminder_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUpcomingReminders(
  userId: string,
  householdId: string,
  days: number = 7
): Promise<ReminderData[]> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('household_id', householdId)
    .contains('assigned_to', [userId])
    .gte('reminder_date', today.toISOString().split('T')[0])
    .lte('reminder_date', futureDate.toISOString().split('T')[0])
    .eq('is_completed', false)
    .order('reminder_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createReminder(reminderData: CreateReminderData): Promise<ReminderData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      ...reminderData,
      created_by: user.id,
      assigned_to: reminderData.assigned_to || [user.id]
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeReminder(reminderId: string): Promise<ReminderData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reminders')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uncompleteReminder(reminderId: string): Promise<ReminderData> {
  const { data, error } = await supabase
    .from('reminders')
    .update({
      is_completed: false,
      completed_at: null,
      completed_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) throw error;
}

export async function generateRemindersFromHabit(habit: Habit, days: number = 7): Promise<ReminderData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date();
  const reminders: ReminderData[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const shouldCreate = await shouldCreateReminderForDate(habit, date);
    if (!shouldCreate) continue;

    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('reminder_date', dateStr)
      .maybeSingle();

    if (existing) continue;

    const reminderTime = habit.repeat_type === 'daily' ? '09:00:00' : null;

    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        household_id: habit.household_id,
        created_by: habit.created_by,
        assigned_to: habit.assigned_to,
        habit_id: habit.id,
        title: habit.title,
        description: habit.description || `Complete your habit: ${habit.title}`,
        reminder_date: dateStr,
        reminder_time: reminderTime
      })
      .select()
      .single();

    if (!error && reminder) {
      reminders.push(reminder);
    }
  }

  return reminders;
}

async function shouldCreateReminderForDate(habit: Habit, date: Date): Promise<boolean> {
  const startDate = new Date(habit.starts_at);
  startDate.setHours(0, 0, 0, 0);

  if (habit.ends_at) {
    const endDate = new Date(habit.ends_at);
    endDate.setHours(23, 59, 59, 999);
    if (date > endDate) return false;
  }

  if (date < startDate) return false;

  switch (habit.repeat_type) {
    case 'daily':
      return true;

    case 'weekly':
      const dayOfWeek = date.getDay();
      if (habit.repeat_config.days) {
        return habit.repeat_config.days.includes(dayOfWeek);
      }
      return true;

    case 'monthly':
      if (habit.repeat_config.monthDay) {
        return date.getDate() === habit.repeat_config.monthDay;
      }
      return false;

    case 'custom':
      if (habit.repeat_config.interval) {
        const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceStart % habit.repeat_config.interval === 0;
      }
      return false;

    default:
      return false;
  }
}

export async function clearHabitReminders(habitId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('habit_id', habitId)
    .eq('reminder_date', date)
    .eq('is_completed', false);

  if (error) {
    console.error('Failed to clear habit reminders:', error);
  }
}

export async function regenerateAllHabitReminders(householdId: string): Promise<void> {
  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true);

  if (error || !habits) {
    console.error('Failed to fetch habits:', error);
    return;
  }

  for (const habit of habits) {
    await generateRemindersFromHabit(habit, 14);
  }
}
