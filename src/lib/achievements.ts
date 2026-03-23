import { supabase } from './supabase';
import type {
  AchievementMeta,
  AchievementLog,
  AchievementWithMeta,
  AchievementCategory
} from './behaviourTypes';

export async function getAllAchievementsMeta(): Promise<AchievementMeta[]> {
  const { data, error } = await supabase
    .from('achievements_meta')
    .select('*')
    .order('threshold', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAchievementsByCategory(category: AchievementCategory): Promise<AchievementMeta[]> {
  const { data, error } = await supabase
    .from('achievements_meta')
    .select('*')
    .eq('category', category)
    .order('threshold', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUserAchievements(
  profileId: string,
  householdId: string
): Promise<AchievementLog[]> {
  const { data, error } = await supabase
    .from('achievement_logs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHouseholdAchievements(householdId: string): Promise<AchievementLog[]> {
  const { data, error } = await supabase
    .from('achievement_logs')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserAchievementsWithMeta(
  profileId: string,
  householdId: string
): Promise<AchievementWithMeta[]> {
  const achievements = await getUserAchievements(profileId, householdId);
  const allMeta = await getAllAchievementsMeta();

  return achievements.map(achievement => {
    const meta = allMeta.find(m => {
      if (achievement.type === 'streak' && m.category === 'streaks') {
        return m.threshold === achievement.value;
      }
      if (achievement.type === 'milestone' && m.category === 'habits') {
        return m.threshold === achievement.value;
      }
      return false;
    });

    return {
      ...achievement,
      meta,
      progress: meta ? Math.min(100, (achievement.value / meta.threshold) * 100) : 100
    };
  });
}

export async function getAchievementProgress(
  profileId: string,
  householdId: string
): Promise<{ unlocked: number; total: number; percentage: number }> {
  const userAchievements = await getUserAchievements(profileId, householdId);
  const allMeta = await getAllAchievementsMeta();

  const uniqueAchievements = new Set(userAchievements.map(a => `${a.type}_${a.value}`));

  return {
    unlocked: uniqueAchievements.size,
    total: allMeta.length,
    percentage: Math.round((uniqueAchievements.size / allMeta.length) * 100)
  };
}

export async function getAchievementLeaderboard(householdId: string): Promise<{
  profile_id: string;
  full_name: string;
  total_achievements: number;
  total_streak_days: number;
  total_completions: number;
}[]> {
  const { data: members, error: membersError } = await supabase
    .from('space_members')
    .select('user_id, profiles!household_members_user_id_fkey(id, full_name)')
    .eq('space_id', householdId)
    .eq('status', 'active');

  if (membersError) throw membersError;

  const leaderboard = await Promise.all(
    (members || []).map(async (member: any) => {
      const profileId = member.user_id;
      const fullName = member.profiles?.full_name || 'Unknown';

      const { data: achievements } = await supabase
        .from('achievement_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('household_id', householdId);

      const { data: entries } = await supabase
        .from('habit_entries')
        .select('habit_id, habits(household_id)')
        .eq('profile_id', profileId)
        .eq('completed', true);

      const householdEntries = (entries || []).filter(
        (e: any) => e.habits?.household_id === householdId
      );

      const streakAchievements = (achievements || []).filter(a => a.type === 'streak');
      const totalStreakDays = streakAchievements.reduce((sum, a) => sum + a.value, 0);

      return {
        profile_id: profileId,
        full_name: fullName,
        total_achievements: achievements?.length || 0,
        total_streak_days: totalStreakDays,
        total_completions: householdEntries.length
      };
    })
  );

  return leaderboard.sort((a, b) => b.total_achievements - a.total_achievements);
}

export async function checkFirstHabitAchievement(
  profileId: string,
  householdId: string
): Promise<AchievementLog | null> {
  const { data: existing } = await supabase
    .from('achievement_logs')
    .select('id')
    .eq('profile_id', profileId)
    .eq('household_id', householdId)
    .eq('type', 'milestone')
    .eq('label', 'First Step')
    .maybeSingle();

  if (existing) return null;

  const { data: achievement, error } = await supabase
    .from('achievement_logs')
    .insert({
      household_id: householdId,
      profile_id: profileId,
      type: 'milestone',
      label: 'First Step',
      value: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create first habit achievement:', error);
    return null;
  }

  return achievement;
}

export async function checkPerfectDayAchievement(
  profileId: string,
  householdId: string,
  date: string
): Promise<AchievementLog | null> {
  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .contains('assigned_to', [profileId]);

  if (!habits || habits.length === 0) return null;

  const { data: entries } = await supabase
    .from('habit_entries')
    .select('habit_id')
    .eq('profile_id', profileId)
    .eq('entry_date', date)
    .eq('completed', true);

  if (!entries || entries.length < habits.length) return null;

  const { data: todayAchievement } = await supabase
    .from('achievement_logs')
    .select('id')
    .eq('profile_id', profileId)
    .eq('household_id', householdId)
    .eq('type', 'consistency')
    .eq('label', 'Perfect Day')
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`)
    .maybeSingle();

  if (todayAchievement) return null;

  const { data: achievement, error } = await supabase
    .from('achievement_logs')
    .insert({
      household_id: householdId,
      profile_id: profileId,
      type: 'consistency',
      label: 'Perfect Day',
      value: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create perfect day achievement:', error);
    return null;
  }

  return achievement;
}

export async function checkPerfectWeekAchievement(
  profileId: string,
  householdId: string
): Promise<AchievementLog | null> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .contains('assigned_to', [profileId]);

  if (!habits || habits.length === 0) return null;

  for (const date of dates) {
    const { data: entries } = await supabase
      .from('habit_entries')
      .select('habit_id')
      .eq('profile_id', profileId)
      .eq('entry_date', date)
      .eq('completed', true);

    if (!entries || entries.length < habits.length) {
      return null;
    }
  }

  const { data: existing } = await supabase
    .from('achievement_logs')
    .select('id')
    .eq('profile_id', profileId)
    .eq('household_id', householdId)
    .eq('type', 'consistency')
    .eq('label', 'Perfect Week')
    .gte('created_at', sevenDaysAgo.toISOString())
    .maybeSingle();

  if (existing) return null;

  const { data: achievement, error } = await supabase
    .from('achievement_logs')
    .insert({
      household_id: householdId,
      profile_id: profileId,
      type: 'consistency',
      label: 'Perfect Week',
      value: 7
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create perfect week achievement:', error);
    return null;
  }

  return achievement;
}
