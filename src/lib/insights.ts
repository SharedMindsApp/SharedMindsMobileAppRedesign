import { supabase } from './supabase';
import type {
  FamilyOverview,
  MemberProgress,
  IndividualInsights,
  HabitAnalytics,
  CalendarAnalytics,
  GoalProgressAnalytics,
  AchievementTimelineEvent,
  SocialInsights,
  WeeklyReport,
  MoodCheckIn,
  ContributionLog,
  HouseholdMoodInsights
} from './insightsTypes';
import { calculateStreak, getHabitEntries } from './habits';

export async function getFamilyOverview(householdId: string, days: number = 7): Promise<FamilyOverview> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data: members } = await supabase
    .from('space_members')
    .select('user_id, profiles(id, full_name)')
    .eq('space_id', householdId)
    .eq('status', 'active');

  const memberProgress: MemberProgress[] = [];
  let totalHabitsCompleted = 0;
  let collectiveStreakDays = 0;
  let totalAchievements = 0;

  if (members) {
    for (const member of members) {
      const profileId = member.profile_id;
      const fullName = (member.profiles as any)?.full_name || 'Unknown';

      const { data: entries } = await supabase
        .from('habit_entries')
        .select('*, habits!inner(household_id)')
        .eq('profile_id', profileId)
        .eq('completed', true)
        .gte('entry_date', startDateStr);

      const householdEntries = (entries || []).filter(
        (e: any) => e.habits.household_id === householdId
      );

      const completions = householdEntries.length;
      totalHabitsCompleted += completions;

      const { data: achievements } = await supabase
        .from('achievement_logs')
        .select('id')
        .eq('profile_id', profileId)
        .eq('household_id', householdId);

      const achievementsCount = achievements?.length || 0;
      totalAchievements += achievementsCount;

      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('household_id', householdId)
        .contains('assigned_to', [profileId])
        .eq('is_active', true);

      let maxStreak = 0;
      if (habits) {
        for (const habit of habits) {
          const streakInfo = await calculateStreak(habit.id, profileId);
          maxStreak = Math.max(maxStreak, streakInfo.current_streak);
        }
      }

      collectiveStreakDays += maxStreak;

      const { data: contributions } = await supabase
        .from('contribution_logs')
        .select('impact_score')
        .eq('helper_id', profileId)
        .eq('household_id', householdId);

      const contributionScore = (contributions || []).reduce(
        (sum, c) => sum + c.impact_score,
        0
      );

      const totalPossibleHabits = (habits?.length || 0) * days;
      const completionRate = totalPossibleHabits > 0
        ? Math.round((completions / totalPossibleHabits) * 100)
        : 0;

      memberProgress.push({
        profile_id: profileId,
        full_name: fullName,
        completion_rate: completionRate,
        total_completions: completions,
        current_streak: maxStreak,
        achievements_count: achievementsCount,
        contribution_score: contributionScore
      });
    }
  }

  const topHelper = memberProgress.reduce((max, member) =>
    member.contribution_score > (max?.contribution_score || 0) ? member : max
  , memberProgress[0]);

  const dayCompletions: Record<string, number> = {};
  const { data: allEntries } = await supabase
    .from('habit_entries')
    .select('entry_date, habits!inner(household_id)')
    .eq('completed', true)
    .gte('entry_date', startDateStr);

  (allEntries || []).forEach((entry: any) => {
    if (entry.habits.household_id === householdId) {
      const dayOfWeek = new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCompletions[dayOfWeek] = (dayCompletions[dayOfWeek] || 0) + 1;
    }
  });

  const bestDayOfWeek = Object.entries(dayCompletions).reduce((max, [day, count]) =>
    count > (dayCompletions[max] || 0) ? day : max
  , 'Monday');

  const totalPossible = memberProgress.length * days * 5;
  const householdCompletionRate = totalPossible > 0
    ? Math.round((totalHabitsCompleted / totalPossible) * 100)
    : 0;

  const energyMeter = Math.min(100, householdCompletionRate + (collectiveStreakDays / memberProgress.length));

  const quickWins = memberProgress
    .filter(m => m.completion_rate >= 80)
    .map(m => `${m.full_name} is crushing their habits!`);

  return {
    totalTasksCompleted: 0,
    totalHabitsCompleted,
    collectiveStreakDays,
    bestDayOfWeek,
    householdCompletionRate,
    energyMeter: Math.round(energyMeter),
    quickWins,
    upcomingPressurePoints: [],
    memberProgress,
    topHelper
  };
}

export async function getIndividualInsights(
  profileId: string,
  householdId: string,
  days: number = 30
): Promise<IndividualInsights> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profileId)
    .maybeSingle();

  const { data: habits } = await supabase
    .from('habits')
    .select('id, title, color')
    .eq('household_id', householdId)
    .contains('assigned_to', [profileId])
    .eq('is_active', true);

  const personalStreaks = [];
  const habitsConsistency = [];
  const heatmapData: Map<string, number> = new Map();

  if (habits) {
    for (const habit of habits) {
      const streakInfo = await calculateStreak(habit.id, profileId);
      const entries = await getHabitEntries(habit.id, profileId, startDateStr);

      personalStreaks.push({
        habit_id: habit.id,
        habit_title: habit.title,
        current_streak: streakInfo.current_streak,
        longest_streak: streakInfo.longest_streak,
        color: habit.color || 'blue'
      });

      const weeklyCompletion: number[] = [];
      for (let i = 0; i < 7; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - ((i + 1) * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekEntries = entries.filter(e => {
          const entryDate = new Date(e.entry_date);
          return entryDate >= weekStart && entryDate <= weekEnd && e.completed;
        });

        weeklyCompletion.unshift(weekEntries.length);
      }

      const recentRate = weeklyCompletion.slice(-2).reduce((a, b) => a + b, 0);
      const olderRate = weeklyCompletion.slice(0, 2).reduce((a, b) => a + b, 0);
      const trend = recentRate > olderRate ? 'improving' : recentRate < olderRate ? 'declining' : 'stable';

      habitsConsistency.push({
        habit_id: habit.id,
        habit_title: habit.title,
        completion_rate: streakInfo.completion_rate,
        weekly_completion: weeklyCompletion,
        trend
      });

      entries.forEach(entry => {
        if (entry.completed) {
          const count = heatmapData.get(entry.entry_date) || 0;
          heatmapData.set(entry.entry_date, count + 1);
        }
      });
    }
  }

  const calendarHeatmap = Array.from(heatmapData.entries()).map(([date, count]) => ({
    date,
    count,
    level: Math.min(4, Math.floor(count / 2))
  }));

  const { data: achievements } = await supabase
    .from('achievement_logs')
    .select('id')
    .eq('profile_id', profileId)
    .eq('household_id', householdId);

  const mostImproved = habitsConsistency
    .filter(h => h.trend === 'improving')
    .sort((a, b) => b.completion_rate - a.completion_rate)[0];

  const mostStruggle = habitsConsistency
    .filter(h => h.completion_rate < 50)
    .sort((a, b) => a.completion_rate - b.completion_rate)[0];

  return {
    profile_id: profileId,
    full_name: profile?.full_name || 'Unknown',
    personalStreaks,
    habitsConsistency,
    calendarHeatmap,
    achievementsUnlocked: achievements?.length || 0,
    mostImprovedHabit: mostImproved ? {
      habit_id: mostImproved.habit_id,
      habit_title: mostImproved.habit_title,
      change_percentage: 20,
      current_rate: mostImproved.completion_rate,
      previous_rate: mostImproved.completion_rate - 20
    } : undefined,
    largestStruggleHabit: mostStruggle ? {
      habit_id: mostStruggle.habit_id,
      habit_title: mostStruggle.habit_title,
      change_percentage: 0,
      current_rate: mostStruggle.completion_rate,
      previous_rate: mostStruggle.completion_rate
    } : undefined,
    onTimeCompletionRate: 85,
    energyRhythm: {
      bestTimeOfDay: 'morning',
      strongDays: [1, 2, 3],
      weakDays: [5, 6],
      peakProductivityHour: 9
    },
    weeklyCompletionTrend: habitsConsistency[0]?.weekly_completion || []
  };
}

export async function getAchievementTimeline(
  householdId: string,
  days: number = 30
): Promise<AchievementTimelineEvent[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  const { data: achievements } = await supabase
    .from('achievement_logs')
    .select('*, profiles(full_name)')
    .eq('household_id', householdId)
    .gte('created_at', startDateStr)
    .order('created_at', { ascending: false });

  const timeline: AchievementTimelineEvent[] = [];

  (achievements || []).forEach((ach: any) => {
    let type: AchievementTimelineEvent['type'] = 'badge';
    if (ach.type === 'streak') type = 'streak';
    if (ach.type === 'milestone') type = 'milestone';
    if (ach.goal_id) type = 'goal';

    timeline.push({
      id: ach.id,
      type,
      title: ach.label,
      description: `${ach.profiles.full_name} unlocked: ${ach.label}`,
      date: ach.created_at,
      icon: type === 'streak' ? '🔥' : type === 'milestone' ? '🏆' : '⭐',
      profile_id: ach.profile_id,
      profile_name: ach.profiles.full_name,
      isCollective: false
    });
  });

  return timeline;
}

export async function getSocialInsights(householdId: string): Promise<SocialInsights> {
  const { data: contributions } = await supabase
    .from('contribution_logs')
    .select('*, helper:profiles!helper_id(full_name), helped:profiles!helped_id(full_name)')
    .eq('household_id', householdId);

  const rankings: Map<string, any> = new Map();

  (contributions || []).forEach((contrib: any) => {
    const helperId = contrib.helper_id;
    const helperName = contrib.helper?.full_name || 'Unknown';

    if (!rankings.has(helperId)) {
      rankings.set(helperId, {
        profile_id: helperId,
        full_name: helperName,
        helps_given: 0,
        helps_received: 0,
        contribution_score: 0,
        fastest_task_completion: 0
      });
    }

    const helperStats = rankings.get(helperId);
    helperStats.helps_given += 1;
    helperStats.contribution_score += contrib.impact_score;

    const helpedId = contrib.helped_id;
    if (!rankings.has(helpedId)) {
      rankings.set(helpedId, {
        profile_id: helpedId,
        full_name: contrib.helped?.full_name || 'Unknown',
        helps_given: 0,
        helps_received: 0,
        contribution_score: 0,
        fastest_task_completion: 0
      });
    }

    const helpedStats = rankings.get(helpedId);
    helpedStats.helps_received += 1;
  });

  const rankingsArray = Array.from(rankings.values()).sort(
    (a, b) => b.contribution_score - a.contribution_score
  );

  return {
    contributionDashboard: {
      rankings: rankingsArray,
      averageContributionScore: rankingsArray.reduce((sum, r) => sum + r.contribution_score, 0) / (rankingsArray.length || 1),
      mostHelpfulMember: rankingsArray[0] || null,
      mostSupportedMember: rankingsArray.sort((a, b) => b.helps_received - a.helps_received)[0] || null
    },
    interactionMap: [],
    sharedAchievements: [],
    fairnessScore: 75
  };
}

export async function createWeeklyReport(householdId: string): Promise<WeeklyReport> {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const overview = await getFamilyOverview(householdId, 7);

  const { data: report, error } = await supabase
    .from('weekly_reports')
    .insert({
      household_id: householdId,
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      total_tasks_completed: 0,
      total_habits_completed: overview.totalHabitsCompleted,
      total_streak_days: overview.collectiveStreakDays,
      total_achievements_unlocked: overview.memberProgress.reduce((sum, m) => sum + m.achievements_count, 0),
      best_day_of_week: overview.bestDayOfWeek,
      household_completion_rate: overview.householdCompletionRate,
      highlights: overview.quickWins,
      challenges: ['Keep up the great work!'],
      suggestions: ['Try adding one new habit this week'],
      family_achievement: 'Amazing week of consistency!',
      top_helper_id: overview.topHelper?.profile_id
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}

export async function getWeeklyReport(householdId: string, weekStartDate: string): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('household_id', householdId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createMoodCheckIn(moodData: Omit<MoodCheckIn, 'id' | 'created_at'>): Promise<MoodCheckIn> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('mood_check_ins')
    .upsert({
      ...moodData,
      profile_id: user.id
    }, {
      onConflict: 'profile_id,check_in_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function logContribution(
  householdId: string,
  helpedId: string,
  contributionType: ContributionLog['contribution_type'],
  description: string,
  impactScore: number = 5
): Promise<ContributionLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('contribution_logs')
    .insert({
      household_id: householdId,
      helper_id: user.id,
      helped_id: helpedId,
      contribution_type: contributionType,
      description,
      impact_score: impactScore
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
