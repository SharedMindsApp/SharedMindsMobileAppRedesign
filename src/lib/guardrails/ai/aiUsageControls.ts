import { supabase } from '../../supabase';
import type { AIIntent } from './aiTypes';

export interface AIUsageStats {
  userId: string;
  projectId?: string;
  totalInteractions: number;
  totalDrafts: number;
  acceptedDrafts: number;
  discardedDrafts: number;
  acceptanceRate: number;
  intentBreakdown: Record<AIIntent, number>;
  periodStart: string;
  periodEnd: string;
}

export interface ProjectAIActivity {
  projectId: string;
  userActivity: Array<{
    userId: string;
    interactionCount: number;
    draftCount: number;
    acceptedCount: number;
    mostCommonIntent: AIIntent;
  }>;
  totalInteractions: number;
  totalDrafts: number;
  periodStart: string;
  periodEnd: string;
}

export interface AIUsageLimits {
  softLimitDaily: number;
  softLimitWeekly: number;
  softLimitMonthly: number;
  expensiveIntentMultiplier: number;
  warnAtPercentage: number;
}

export const DEFAULT_USAGE_LIMITS: AIUsageLimits = {
  softLimitDaily: 50,
  softLimitWeekly: 200,
  softLimitMonthly: 500,
  expensiveIntentMultiplier: 2,
  warnAtPercentage: 0.8,
};

export const INTENT_COST_WEIGHTS: Record<AIIntent, number> = {
  explain: 1,
  summarize: 2,
  draft_roadmap_item: 1,
  draft_task_list: 1,
  suggest_next_steps: 2,
  analyze_deadlines: 2,
  critique_plan: 3,
  compare_options: 2,
  generate_checklist: 1,
  propose_timeline: 3,
  explain_relationships: 2,
  suggest_breakdown: 1,
  identify_risks: 3,
  recommend_priorities: 2,
};

export async function getUserAIUsageStats(
  userId: string,
  projectId?: string,
  daysBack: number = 30
): Promise<AIUsageStats | null> {
  const { data, error } = await supabase.rpc('get_ai_usage_stats', {
    input_user_id: userId,
    input_project_id: projectId || null,
    days_back: daysBack,
  });

  if (error || !data) {
    return null;
  }

  const intentBreakdown: Record<string, number> = {};
  let totalInteractions = 0;
  let totalDrafts = 0;
  let acceptedDrafts = 0;

  data.forEach((row: any) => {
    intentBreakdown[row.intent] = parseInt(row.interaction_count);
    totalInteractions += parseInt(row.interaction_count);
    totalDrafts += parseInt(row.draft_count);
    acceptedDrafts += parseInt(row.accepted_count);
  });

  const acceptanceRate = totalDrafts > 0 ? acceptedDrafts / totalDrafts : 0;

  return {
    userId,
    projectId,
    totalInteractions,
    totalDrafts,
    acceptedDrafts,
    discardedDrafts: totalDrafts - acceptedDrafts,
    acceptanceRate,
    intentBreakdown: intentBreakdown as Record<AIIntent, number>,
    periodStart: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

export async function getProjectAIActivity(
  projectId: string,
  daysBack: number = 30
): Promise<ProjectAIActivity | null> {
  const { data, error } = await supabase.rpc('get_project_ai_activity', {
    input_project_id: projectId,
    days_back: daysBack,
  });

  if (error || !data) {
    return null;
  }

  const userActivity = data.map((row: any) => ({
    userId: row.user_id,
    interactionCount: parseInt(row.interaction_count),
    draftCount: parseInt(row.draft_count),
    acceptedCount: parseInt(row.accepted_count),
    mostCommonIntent: row.most_common_intent as AIIntent,
  }));

  const totalInteractions = userActivity.reduce((sum, u) => sum + u.interactionCount, 0);
  const totalDrafts = userActivity.reduce((sum, u) => sum + u.draftCount, 0);

  return {
    projectId,
    userActivity,
    totalInteractions,
    totalDrafts,
    periodStart: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

export async function calculateWeightedUsage(
  userId: string,
  periodDays: number = 1
): Promise<number> {
  const stats = await getUserAIUsageStats(userId, undefined, periodDays);

  if (!stats) {
    return 0;
  }

  let weightedTotal = 0;

  Object.entries(stats.intentBreakdown).forEach(([intent, count]) => {
    const weight = INTENT_COST_WEIGHTS[intent as AIIntent] || 1;
    weightedTotal += count * weight;
  });

  return weightedTotal;
}

export async function checkUsageLimits(
  userId: string,
  limits: AIUsageLimits = DEFAULT_USAGE_LIMITS
): Promise<{
  withinLimits: boolean;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  warnings: string[];
}> {
  const dailyUsage = await calculateWeightedUsage(userId, 1);
  const weeklyUsage = await calculateWeightedUsage(userId, 7);
  const monthlyUsage = await calculateWeightedUsage(userId, 30);

  const warnings: string[] = [];

  if (dailyUsage >= limits.softLimitDaily * limits.warnAtPercentage) {
    warnings.push(`Daily usage at ${Math.round((dailyUsage / limits.softLimitDaily) * 100)}% of limit`);
  }

  if (weeklyUsage >= limits.softLimitWeekly * limits.warnAtPercentage) {
    warnings.push(`Weekly usage at ${Math.round((weeklyUsage / limits.softLimitWeekly) * 100)}% of limit`);
  }

  if (monthlyUsage >= limits.softLimitMonthly * limits.warnAtPercentage) {
    warnings.push(`Monthly usage at ${Math.round((monthlyUsage / limits.softLimitMonthly) * 100)}% of limit`);
  }

  const withinLimits =
    dailyUsage < limits.softLimitDaily &&
    weeklyUsage < limits.softLimitWeekly &&
    monthlyUsage < limits.softLimitMonthly;

  return {
    withinLimits,
    dailyUsage,
    weeklyUsage,
    monthlyUsage,
    warnings,
  };
}

export async function getIntentUsageBreakdown(
  userId: string,
  daysBack: number = 30
): Promise<Array<{ intent: AIIntent; count: number; costWeight: number; weightedCost: number }>> {
  const stats = await getUserAIUsageStats(userId, undefined, daysBack);

  if (!stats) {
    return [];
  }

  return Object.entries(stats.intentBreakdown).map(([intent, count]) => {
    const weight = INTENT_COST_WEIGHTS[intent as AIIntent] || 1;
    return {
      intent: intent as AIIntent,
      count,
      costWeight: weight,
      weightedCost: count * weight,
    };
  }).sort((a, b) => b.weightedCost - a.weightedCost);
}

export async function getMostExpensiveIntents(
  userId: string,
  daysBack: number = 30,
  topN: number = 5
): Promise<Array<{ intent: AIIntent; weightedCost: number }>> {
  const breakdown = await getIntentUsageBreakdown(userId, daysBack);
  return breakdown.slice(0, topN);
}

export async function getUserDraftAcceptanceRate(
  userId: string,
  projectId?: string,
  daysBack: number = 30
): Promise<{ acceptanceRate: number; total: number; accepted: number }> {
  const stats = await getUserAIUsageStats(userId, projectId, daysBack);

  if (!stats) {
    return { acceptanceRate: 0, total: 0, accepted: 0 };
  }

  return {
    acceptanceRate: stats.acceptanceRate,
    total: stats.totalDrafts,
    accepted: stats.acceptedDrafts,
  };
}

export async function getProjectAISpend(
  projectId: string,
  daysBack: number = 30
): Promise<{ totalWeightedInteractions: number; breakdown: Record<string, number> }> {
  const activity = await getProjectAIActivity(projectId, daysBack);

  if (!activity) {
    return { totalWeightedInteractions: 0, breakdown: {} };
  }

  let totalWeighted = 0;
  const breakdown: Record<string, number> = {};

  for (const user of activity.userActivity) {
    const stats = await getUserAIUsageStats(user.userId, projectId, daysBack);
    if (stats) {
      Object.entries(stats.intentBreakdown).forEach(([intent, count]) => {
        const weight = INTENT_COST_WEIGHTS[intent as AIIntent] || 1;
        const cost = count * weight;
        totalWeighted += cost;
        breakdown[user.userId] = (breakdown[user.userId] || 0) + cost;
      });
    }
  }

  return { totalWeightedInteractions: totalWeighted, breakdown };
}

export const USAGE_CONTROL_NOTES = {
  SOFT_LIMITS_ONLY: 'These are soft limits for awareness, not hard enforcement',
  NO_BILLING: 'No billing logic, usage tracking only',
  WEIGHTED_COSTS: 'Expensive intents (critique, risk analysis) count more',
  QUERY_CAPABILITY: 'Can query: How much AI was used? Which intents are expensive?',
  USER_TRANSPARENCY: 'Users can see their own usage stats',
  PROJECT_VISIBILITY: 'Project owners can see project-wide AI activity',
};

export const USAGE_SAFEGUARDS = {
  WARN_AT_80_PERCENT: 'Warn users when approaching limits',
  INTENT_WEIGHT_BASED: 'Different intents have different weights',
  ACCEPTANCE_TRACKING: 'Track which drafts are actually used',
  DAILY_WEEKLY_MONTHLY: 'Track usage across multiple time periods',
  PROJECT_AGGREGATION: 'Aggregate usage per project',
};
