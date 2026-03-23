import { supabase } from './supabase';
import type {
  Habit,
  HabitEntry,
  CreateHabitData,
  UpdateHabitData,
  CreateHabitEntryData,
  HabitWithEntries,
  StreakInfo,
  HabitStats,
  CompletionResult
} from './behaviourTypes';

export async function getHouseholdHabits(householdId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserHabits(userId: string, householdId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .contains('assigned_to', [userId])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHabit(habitId: string): Promise<Habit | null> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createHabit(habitData: CreateHabitData): Promise<Habit> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('habits')
    .insert({
      ...habitData,
      created_by: user.id,
      repeat_config: habitData.repeat_config || {},
      starts_at: habitData.starts_at || new Date().toISOString(),
      assigned_to: habitData.assigned_to || [user.id]
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHabit(habitId: string, updates: UpdateHabitData): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId);

  if (error) throw error;
}

export async function getHabitEntries(
  habitId: string,
  profileId?: string,
  startDate?: string,
  endDate?: string
): Promise<HabitEntry[]> {
  let query = supabase
    .from('habit_entries')
    .select('*')
    .eq('habit_id', habitId);

  if (profileId) {
    query = query.eq('profile_id', profileId);
  }

  if (startDate) {
    query = query.gte('entry_date', startDate);
  }

  if (endDate) {
    query = query.lte('entry_date', endDate);
  }

  const { data, error } = await query.order('entry_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHabitEntry(entryData: CreateHabitEntryData): Promise<HabitEntry> {
  const { data, error } = await supabase
    .from('habit_entries')
    .upsert({
      ...entryData,
      completed: entryData.completed !== undefined ? entryData.completed : true,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'habit_id,profile_id,entry_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function calculateStreak(habitId: string, profileId: string): Promise<StreakInfo> {
  const entries = await getHabitEntries(habitId, profileId);

  const completedEntries = entries
    .filter(e => e.completed)
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

  if (completedEntries.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      total_completions: 0,
      completion_rate: 0
    };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastCompletedDate = new Date(completedEntries[0].entry_date);
  lastCompletedDate.setHours(0, 0, 0, 0);

  if (lastCompletedDate.getTime() === today.getTime() || lastCompletedDate.getTime() === yesterday.getTime()) {
    currentStreak = 1;

    for (let i = 1; i < completedEntries.length; i++) {
      const currentDate = new Date(completedEntries[i].entry_date);
      currentDate.setHours(0, 0, 0, 0);
      const prevDate = new Date(completedEntries[i - 1].entry_date);
      prevDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.round((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  for (let i = 1; i < completedEntries.length; i++) {
    const currentDate = new Date(completedEntries[i].entry_date);
    currentDate.setHours(0, 0, 0, 0);
    const prevDate = new Date(completedEntries[i - 1].entry_date);
    prevDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.round((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak, tempStreak);

  const habit = await getHabit(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  const startDate = new Date(habit.starts_at);
  startDate.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const expectedCompletions = Math.max(1, daysSinceStart);
  const completionRate = Math.round((completedEntries.length / expectedCompletions) * 100);

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_completions: completedEntries.length,
    completion_rate: Math.min(100, completionRate),
    last_completed: completedEntries[0]?.entry_date
  };
}

export async function completeHabit(
  habitId: string,
  profileId: string,
  date?: string
): Promise<CompletionResult> {
  const entryDate = date || new Date().toISOString().split('T')[0];

  try {
    const entry = await createHabitEntry({
      habit_id: habitId,
      profile_id: profileId,
      entry_date: entryDate,
      completed: true
    });

    const streakInfo = await calculateStreak(habitId, profileId);

    const newAchievements = await checkAndUnlockAchievements(habitId, profileId, streakInfo);

    await updateGoalProgress(habitId);

    return {
      success: true,
      habit_entry: entry,
      new_achievements: newAchievements,
      goal_progress_updated: true,
      streak_info: streakInfo
    };
  } catch (error) {
    console.error('Failed to complete habit:', error);
    return {
      success: false
    };
  }
}

export async function uncompleteHabit(
  habitId: string,
  profileId: string,
  date?: string
): Promise<boolean> {
  const entryDate = date || new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('habit_entries')
    .delete()
    .eq('habit_id', habitId)
    .eq('profile_id', profileId)
    .eq('entry_date', entryDate);

  if (error) {
    console.error('Failed to uncomplete habit:', error);
    return false;
  }

  return true;
}

export async function getHabitStats(habitId: string, profileId: string): Promise<HabitStats> {
  const streakInfo = await calculateStreak(habitId, profileId);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyEntries = await getHabitEntries(
    habitId,
    profileId,
    oneWeekAgo.toISOString().split('T')[0]
  );

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const monthlyEntries = await getHabitEntries(
    habitId,
    profileId,
    oneMonthAgo.toISOString().split('T')[0]
  );

  const { data: achievements } = await supabase
    .from('achievement_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('profile_id', profileId);

  return {
    habit_id: habitId,
    profile_id: profileId,
    streak_info: streakInfo,
    weekly_completions: weeklyEntries.filter(e => e.completed).length,
    monthly_completions: monthlyEntries.filter(e => e.completed).length,
    achievements_unlocked: achievements || []
  };
}

async function checkAndUnlockAchievements(
  habitId: string,
  profileId: string,
  streakInfo: StreakInfo
): Promise<any[]> {
  const habit = await getHabit(habitId);
  if (!habit) return [];

  const newAchievements: any[] = [];

  const streakMilestones = [
    { threshold: 3, code: 'STREAK_3' },
    { threshold: 7, code: 'STREAK_7' },
    { threshold: 14, code: 'STREAK_14' },
    { threshold: 30, code: 'STREAK_30' },
    { threshold: 60, code: 'STREAK_60' },
    { threshold: 100, code: 'STREAK_100' }
  ];

  for (const milestone of streakMilestones) {
    if (streakInfo.current_streak === milestone.threshold) {
      const { data: existing } = await supabase
        .from('achievement_logs')
        .select('id')
        .eq('profile_id', profileId)
        .eq('habit_id', habitId)
        .eq('type', 'streak')
        .eq('value', milestone.threshold)
        .maybeSingle();

      if (!existing) {
        const { data: achievement, error } = await supabase
          .from('achievement_logs')
          .insert({
            household_id: habit.household_id,
            profile_id: profileId,
            habit_id: habitId,
            type: 'streak',
            label: `${milestone.threshold}-Day Streak`,
            value: milestone.threshold
          })
          .select()
          .single();

        if (!error && achievement) {
          newAchievements.push(achievement);
        }
      }
    }
  }

  const completionMilestones = [
    { threshold: 10, code: 'COMPLETIONS_10' },
    { threshold: 25, code: 'COMPLETIONS_25' },
    { threshold: 50, code: 'COMPLETIONS_50' },
    { threshold: 100, code: 'COMPLETIONS_100' },
    { threshold: 250, code: 'COMPLETIONS_250' }
  ];

  for (const milestone of completionMilestones) {
    if (streakInfo.total_completions === milestone.threshold) {
      const { data: existing } = await supabase
        .from('achievement_logs')
        .select('id')
        .eq('profile_id', profileId)
        .eq('habit_id', habitId)
        .eq('type', 'milestone')
        .eq('value', milestone.threshold)
        .maybeSingle();

      if (!existing) {
        const { data: achievement, error } = await supabase
          .from('achievement_logs')
          .insert({
            household_id: habit.household_id,
            profile_id: profileId,
            habit_id: habitId,
            type: 'milestone',
            label: `${milestone.threshold} Completions`,
            value: milestone.threshold
          })
          .select()
          .single();

        if (!error && achievement) {
          newAchievements.push(achievement);
        }
      }
    }
  }

  return newAchievements;
}

async function updateGoalProgress(habitId: string): Promise<void> {
  const habit = await getHabit(habitId);
  if (!habit || !habit.goal_id) return;

}

export async function isHabitDueToday(habit: Habit): Promise<boolean> {
  const today = new Date();
  const startDate = new Date(habit.starts_at);

  if (habit.ends_at) {
    const endDate = new Date(habit.ends_at);
    if (today > endDate) return false;
  }

  if (today < startDate) return false;

  switch (habit.repeat_type) {
    case 'daily':
      return true;

    case 'weekly':
      const todayDay = today.getDay();
      if (habit.repeat_config.days) {
        return habit.repeat_config.days.includes(todayDay);
      }
      return true;

    case 'monthly':
      if (habit.repeat_config.monthDay) {
        return today.getDate() === habit.repeat_config.monthDay;
      }
      return false;

    case 'custom':
      if (habit.repeat_config.interval) {
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceStart % habit.repeat_config.interval === 0;
      }
      return false;

    default:
      return false;
  }
}
