export type MoodLevel = 'very_low' | 'low' | 'neutral' | 'good' | 'excellent';

export type ContributionType =
  | 'task_completion'
  | 'habit_support'
  | 'calendar_event'
  | 'reminder_help'
  | 'goal_assistance'
  | 'general_help';

export interface WeeklyReport {
  id: string;
  household_id: string;
  week_start_date: string;
  week_end_date: string;
  total_tasks_completed: number;
  total_habits_completed: number;
  total_streak_days: number;
  total_achievements_unlocked: number;
  best_day_of_week: string;
  household_completion_rate: number;
  highlights: string[];
  challenges: string[];
  suggestions: string[];
  family_achievement: string;
  top_helper_id?: string;
  generated_at: string;
  created_at: string;
}

export interface MoodCheckIn {
  id: string;
  household_id: string;
  profile_id: string;
  check_in_date: string;
  mood: MoodLevel;
  energy_level: number;
  stress_level: number;
  notes: string;
  created_at: string;
}

export interface ContributionLog {
  id: string;
  household_id: string;
  helper_id: string;
  helped_id: string;
  contribution_type: ContributionType;
  description: string;
  related_entity_id?: string;
  impact_score: number;
  created_at: string;
}

export interface FamilyOverview {
  totalTasksCompleted: number;
  totalHabitsCompleted: number;
  collectiveStreakDays: number;
  bestDayOfWeek: string;
  householdCompletionRate: number;
  energyMeter: number;
  quickWins: string[];
  upcomingPressurePoints: PressurePoint[];
  memberProgress: MemberProgress[];
  topHelper?: MemberProgress;
}

export interface PressurePoint {
  date: string;
  taskCount: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface MemberProgress {
  profile_id: string;
  full_name: string;
  completion_rate: number;
  total_completions: number;
  current_streak: number;
  achievements_count: number;
  contribution_score: number;
}

export interface IndividualInsights {
  profile_id: string;
  full_name: string;
  personalStreaks: StreakData[];
  habitsConsistency: HabitConsistencyData[];
  calendarHeatmap: HeatmapData[];
  achievementsUnlocked: number;
  mostImprovedHabit?: HabitTrend;
  largestStruggleHabit?: HabitTrend;
  onTimeCompletionRate: number;
  energyRhythm: EnergyRhythmData;
  weeklyCompletionTrend: number[];
}

export interface StreakData {
  habit_id: string;
  habit_title: string;
  current_streak: number;
  longest_streak: number;
  color: string;
}

export interface HabitConsistencyData {
  habit_id: string;
  habit_title: string;
  completion_rate: number;
  weekly_completion: number[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface HeatmapData {
  date: string;
  count: number;
  level: number;
}

export interface HabitTrend {
  habit_id: string;
  habit_title: string;
  change_percentage: number;
  current_rate: number;
  previous_rate: number;
}

export interface EnergyRhythmData {
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening';
  strongDays: number[];
  weakDays: number[];
  peakProductivityHour: number;
}

export interface HabitAnalytics {
  habit_id: string;
  habit_title: string;
  completionRate: number;
  longestStreak: number;
  currentStreak: number;
  difficultyScore: number;
  bestDays: number[];
  worstDays: number[];
  averageTimeToCompletion: number;
  goalContribution: number;
  weeklyData: number[];
  monthlyData: number[];
  trendDirection: 'up' | 'down' | 'stable';
}

export interface CalendarAnalytics {
  busiestDayOfWeek: string;
  mostMissedDay: string;
  weekOverWeekProductivity: number;
  upcomingOverloadedDays: OverloadedDay[];
  timeBlockAccuracy: number;
  categoryBreakdown: CategoryData[];
  completionVelocity: VelocityData[];
}

export interface OverloadedDay {
  date: string;
  taskCount: number;
  eventCount: number;
  estimatedHours: number;
}

export interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface VelocityData {
  week: string;
  averageDaysToComplete: number;
  completionRate: number;
}

export interface GoalProgressAnalytics {
  goal_id: string;
  goal_title: string;
  percentComplete: number;
  daysRemaining: number;
  onTrackStatus: 'ahead' | 'on_track' | 'behind';
  habitContributions: HabitContribution[];
  milestonesAchieved: number;
  milestoneTotal: number;
  progressSpeed: number;
  projectedCompletionDate: string;
  progressHistory: ProgressPoint[];
}

export interface HabitContribution {
  habit_id: string;
  habit_title: string;
  contribution_percentage: number;
  completions: number;
}

export interface ProgressPoint {
  date: string;
  progress: number;
}

export interface AchievementTimelineEvent {
  id: string;
  type: 'streak' | 'milestone' | 'goal' | 'habit_added' | 'weekly_win' | 'badge';
  title: string;
  description: string;
  date: string;
  icon: string;
  profile_id?: string;
  profile_name?: string;
  isCollective: boolean;
}

export interface SocialInsights {
  contributionDashboard: ContributionDashboard;
  interactionMap: InteractionData[];
  sharedAchievements: SharedAchievement[];
  fairnessScore: number;
}

export interface ContributionDashboard {
  rankings: ContributionRanking[];
  averageContributionScore: number;
  mostHelpfulMember: ContributionRanking;
  mostSupportedMember: ContributionRanking;
}

export interface ContributionRanking {
  profile_id: string;
  full_name: string;
  helps_given: number;
  helps_received: number;
  contribution_score: number;
  fastest_task_completion: number;
}

export interface InteractionData {
  helper_id: string;
  helper_name: string;
  helped_id: string;
  helped_name: string;
  interaction_count: number;
  impact_score: number;
  description: string;
}

export interface SharedAchievement {
  id: string;
  title: string;
  description: string;
  date: string;
  participant_ids: string[];
  icon: string;
}

export interface HouseholdMoodInsights {
  averageMood: number;
  moodTrend: MoodTrendData[];
  moodVsProductivity: CorrelationData[];
  stressSpikes: StressSpike[];
  mostPositiveDay: string;
  memberMoodSummary: MemberMoodSummary[];
}

export interface MoodTrendData {
  date: string;
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
}

export interface CorrelationData {
  mood: number;
  productivity: number;
  date: string;
}

export interface StressSpike {
  profile_id: string;
  full_name: string;
  date: string;
  stress_level: number;
  reason?: string;
}

export interface MemberMoodSummary {
  profile_id: string;
  full_name: string;
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  moodTrend: 'improving' | 'stable' | 'declining';
}
