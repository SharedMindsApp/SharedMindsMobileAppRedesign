/**
 * Goals Service
 * 
 * Full CRUD and progress computation for goals using the canonical Activity system.
 * Goals are activities with requirements (habits/tasks). Progress computed from check-ins.
 */

import { supabase } from '../supabase';
import {
  createActivity,
  createActivitySchedule,
  updateActivity,
  archiveActivity,
  getUserActivities,
  getActivityWithSchedules,
  type Activity,
} from '../activities/activityService';
import {
  projectActivitySchedulesToCalendar,
  hideActivityProjections,
} from '../activities/activityCalendarProjection';
import type { CreateActivityInput } from '../activities/activityTypes';
import { getHabitCheckinsForRange } from '../habits/habitsService';
import type { Activity } from '../activities/activityService';
import { emitActivityChanged } from '../activities/activityEvents';
import { getTagsForEntity, addTagsToEntity, type Tag } from '../tags/tagService';
import { FEATURE_CONTEXT_TAGGING } from '../featureFlags';
import { autoGenerateAndLinkTags } from '../tags/tagAutoGeneration';

// ============================================================================
// Types
// ============================================================================

export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalRequirementType = 'habit_streak' | 'habit_count' | 'task_complete' | 'custom';

export interface Goal {
  id: string;
  goal_activity_id: string;
  owner_id: string;
  status: GoalStatus;
  start_date: string | null;
  end_date: string | null;
  completion_rule: Record<string, any>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[]; // Optional tags (resolved via joins)
}

export interface GoalRequirement {
  id: string;
  goal_id: string;
  required_activity_id: string;
  requirement_type: GoalRequirementType;
  target_count: number | null;
  window_days: number | null;
  per_day_target: number | null;
  strict: boolean;
  weight: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  objective_summary?: string;
  completion_rule?: Record<string, any>;
  tagIds?: string[]; // Optional tag IDs to link to the goal
  autoGenerateTags?: boolean; // Auto-generate tags from title/description
}

export interface AddGoalRequirementInput {
  goalId: string;
  requiredActivityId: string;
  requirementType: GoalRequirementType;
  targetCount?: number;
  windowDays?: number;
  perDayTarget?: number;
  strict?: boolean;
  weight?: number;
}

export interface GoalProgress {
  goal: Goal;
  activity: Activity;
  requirements: GoalRequirement[];
  overallProgress: number; // 0-100
  completedCount: number;
  totalCount: number;
  streak: number;
  remainingDays: number | null;
  requirementProgress: Array<{
    requirement: GoalRequirement;
    progress: number;
    completed: number;
    target: number;
    status: 'on_track' | 'behind' | 'completed';
  }>;
}

// ============================================================================
// Goal CRUD
// ============================================================================

/**
 * Create a goal activity
 */
export async function createGoalActivity(
  userId: string,
  input: CreateGoalInput
): Promise<{ goalId: string; activityId: string; scheduleId?: string }> {
  // Create activity with goal metadata
  const activityInput: CreateActivityInput = {
    type: 'goal',
    title: input.title,
    description: input.description,
    status: 'active',
    metadata: {
      objective_summary: input.objective_summary || input.description || '',
      completion_rule: input.completion_rule || {},
    },
  };

  const activity = await createActivity(userId, activityInput);

  // Create goal record
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      goal_activity_id: activity.id,
      owner_id: userId,
      status: 'active',
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      completion_rule: input.completion_rule || {},
    })
    .select()
    .single();

  if (goalError) {
    console.error('[goalsService] Error creating goal:', goalError);
    throw goalError;
  }

  let scheduleId: string | undefined;

  // Create deadline schedule if end date provided
  if (input.endDate) {
    const schedule = await createActivitySchedule({
      activity_id: activity.id,
      schedule_type: 'deadline',
      start_at: input.endDate,
      end_at: null,
      metadata: {
        isDeadline: true,
      },
    });

    scheduleId = schedule.id;

    // Project deadline to calendar
    await projectActivitySchedulesToCalendar(userId, activity, [schedule]);
  }

  // Handle tags
  if (FEATURE_CONTEXT_TAGGING) {
    // Auto-generate tags if enabled
    if (input.autoGenerateTags !== false) {
      try {
        await autoGenerateAndLinkTags(
          userId,
          'goal',
          goal.id,
          input.title,
          input.description
        );
      } catch (err) {
        console.error('[goalsService] Error auto-generating tags:', err);
        // Non-fatal, continue
      }
    }
    
    // Link manually selected tags
    if (input.tagIds && input.tagIds.length > 0) {
      try {
        await addTagsToEntity(userId, input.tagIds, 'goal', goal.id);
      } catch (err) {
        console.error('[goalsService] Error linking tags:', err);
        // Non-fatal, continue
      }
    }
  }

  // Emit change event for sync
  emitActivityChanged(activity.id);

  return {
    goalId: goal.id,
    activityId: activity.id,
    scheduleId,
  };
}

/**
 * Update goal
 */
export async function updateGoal(
  goalId: string,
  updates: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: GoalStatus;
    completion_rule?: Record<string, any>;
  }
): Promise<void> {
  // Get goal to find activity
  const { data: goal } = await supabase
    .from('goals')
    .select('goal_activity_id')
    .eq('id', goalId)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  // Update activity
  if (updates.title || updates.description) {
    await updateActivity(goal.goal_activity_id, {
      title: updates.title,
      description: updates.description,
      status: updates.status,
    });
  }

  // Update goal record
  const goalUpdates: Record<string, any> = {};
  if (updates.startDate !== undefined) goalUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) goalUpdates.end_date = updates.endDate;
  if (updates.status !== undefined) goalUpdates.status = updates.status;
  if (updates.completion_rule !== undefined) goalUpdates.completion_rule = updates.completion_rule;

  if (Object.keys(goalUpdates).length > 0) {
    const { error } = await supabase
      .from('goals')
      .update(goalUpdates)
      .eq('id', goalId);

    if (error) {
      console.error('[goalsService] Error updating goal:', error);
      throw error;
    }
  }
}

/**
 * Archive goal (soft delete)
 */
export async function archiveGoal(
  userId: string,
  goalId: string
): Promise<void> {
  // Get goal to find activity
  const { data: goal } = await supabase
    .from('goals')
    .select('goal_activity_id')
    .eq('id', goalId)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  // Hide calendar projections
  await hideActivityProjections(userId, goal.goal_activity_id);

  // Archive goal
  await supabase
    .from('goals')
    .update({ status: 'archived' })
    .eq('id', goalId);

  // Archive activity
  await archiveActivity(goal.goal_activity_id);
}

/**
 * List user's goals
 */
export async function listGoals(
  userId: string,
  filters?: {
    status?: GoalStatus;
    includeTags?: boolean;
  }
): Promise<Goal[]> {
  let query = supabase
    .from('goals')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[goalsService] Error fetching goals:', error);
    throw error;
  }

  const goals = data || [];

  // Optionally enrich with tags
  if (FEATURE_CONTEXT_TAGGING && filters?.includeTags) {
    const goalsWithTags = await Promise.all(
      goals.map(async (goal) => {
        try {
          const tags = await getTagsForEntity('goal', goal.id);
          return { ...goal, tags };
        } catch (err) {
          console.error(`[goalsService] Error loading tags for goal ${goal.id}:`, err);
          return goal;
        }
      })
    );
    return goalsWithTags;
  }

  return goals;
}

// ============================================================================
// Goal Requirements
// ============================================================================

/**
 * Add requirement to goal
 */
export async function addGoalRequirement(
  userId: string,
  goalId: string,
  requirement: Omit<AddGoalRequirementInput, 'goalId'>
): Promise<GoalRequirement> {
  const { data, error } = await supabase
    .from('goal_requirements')
    .insert({
      goal_id: goalId,
      required_activity_id: requirement.requiredActivityId,
      requirement_type: requirement.requirementType,
      target_count: requirement.targetCount || null,
      window_days: requirement.windowDays || null,
      per_day_target: requirement.perDayTarget || null,
      strict: requirement.strict !== undefined ? requirement.strict : true,
      weight: requirement.weight || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[goalsService] Error adding requirement:', error);
    throw error;
  }

  return data;
}

/**
 * Update goal requirement
 */
export async function updateGoalRequirement(
  requirementId: string,
  updates: {
    targetCount?: number;
    windowDays?: number;
    perDayTarget?: number;
    strict?: boolean;
    weight?: number;
  }
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.targetCount !== undefined) updateData.target_count = updates.targetCount;
  if (updates.windowDays !== undefined) updateData.window_days = updates.windowDays;
  if (updates.perDayTarget !== undefined) updateData.per_day_target = updates.perDayTarget;
  if (updates.strict !== undefined) updateData.strict = updates.strict;
  if (updates.weight !== undefined) updateData.weight = updates.weight;

  const { error } = await supabase
    .from('goal_requirements')
    .update(updateData)
    .eq('id', requirementId);

  if (error) {
    console.error('[goalsService] Error updating requirement:', error);
    throw error;
  }
}

/**
 * Get requirements for goal
 */
export async function getGoalRequirements(goalId: string): Promise<GoalRequirement[]> {
  const { data, error } = await supabase
    .from('goal_requirements')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[goalsService] Error fetching requirements:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// Goal Progress Computation
// ============================================================================

/**
 * Compute goal progress from requirements
 */
export async function computeGoalProgress(
  userId: string,
  goalId: string
): Promise<GoalProgress> {
  // Get goal
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  // Get activity
  const activity = await getActivityWithSchedules(goal.goal_activity_id);
  if (!activity) {
    throw new Error('Goal activity not found');
  }

  // Get requirements
  const requirements = await getGoalRequirements(goalId);

  // Calculate date range
  const today = new Date().toISOString().split('T')[0];
  const startDate = goal.start_date || activity.created_at.split('T')[0];
  const endDate = goal.end_date || today;
  const windowStart = goal.start_date 
    ? new Date(goal.start_date)
    : new Date(activity.created_at);
  const windowEnd = goal.end_date 
    ? new Date(goal.end_date)
    : new Date(today);

  // Compute progress for each requirement
  const requirementProgress = await Promise.all(
    requirements.map(async (req) => {
        if (req.requirement_type === 'habit_streak' || req.requirement_type === 'habit_count') {
        // Get habit check-ins
        const checkins = await getHabitCheckinsForRange(
          userId,
          req.required_activity_id,
          startDate,
          endDate
        );

        const completedCheckins = checkins.filter(c => c.status === 'done');
        const target = req.target_count || req.window_days || 30;

        let progress = 0;
        let completed = 0;
        let status: 'on_track' | 'behind' | 'completed' = 'behind';

        if (req.requirement_type === 'habit_streak') {
          // Calculate current streak
          const sortedCheckins = [...completedCheckins]
            .sort((a, b) => new Date(b.local_date).getTime() - new Date(a.local_date).getTime());

          let streak = 0;
          let checkDate = new Date(today);

          for (let i = 0; i < target; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const checkin = sortedCheckins.find(c => c.local_date === dateStr);
            
            if (checkin && checkin.status === 'done') {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (req.strict) {
              break; // Strict streak broken
            } else {
              checkDate.setDate(checkDate.getDate() - 1);
            }
          }

          completed = streak;
          progress = (streak / target) * 100;
          status = streak >= target ? 'completed' : (progress >= 80 ? 'on_track' : 'behind');
        } else {
          // Habit count
          completed = completedCheckins.length;
          progress = (completed / target) * 100;
          status = completed >= target ? 'completed' : (progress >= 80 ? 'on_track' : 'behind');
        }

        return {
          requirement: req,
          progress,
          completed,
          target,
          status,
        };
      } else if (req.requirement_type === 'task_complete') {
        // TODO: Implement task completion tracking
        return {
          requirement: req,
          progress: 0,
          completed: 0,
          target: req.target_count || 1,
          status: 'behind' as const,
        };
      } else {
        // Custom requirement
        return {
          requirement: req,
          progress: 0,
          completed: 0,
          target: req.target_count || 1,
          status: 'behind' as const,
        };
      }
    })
  );

  // Calculate overall progress (weighted average if weights exist)
  const totalWeight = requirementProgress.reduce(
    (sum, rp) => sum + (rp.requirement.weight || 1),
    0
  );

  const weightedProgress = requirementProgress.reduce(
    (sum, rp) => sum + (rp.progress * (rp.requirement.weight || 1)),
    0
  );

  const overallProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;

  // Calculate streak (minimum streak across all requirements)
  const streaks = requirementProgress
    .filter(rp => rp.requirement.requirement_type === 'habit_streak')
    .map(rp => rp.completed);
  const streak = streaks.length > 0 ? Math.min(...streaks) : 0;

  // Calculate remaining days
  const remainingDays = goal.end_date
    ? Math.max(0, Math.ceil((new Date(goal.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Check if goal is completed
  if (overallProgress >= 100 && goal.status !== 'completed') {
    // Auto-complete goal
    await supabase
      .from('goals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', goalId);
    goal.status = 'completed';
    goal.completed_at = new Date().toISOString();
  }

  return {
    goal,
    activity,
    requirements,
    overallProgress: Math.min(100, overallProgress),
    completedCount: requirementProgress.filter(rp => rp.status === 'completed').length,
    totalCount: requirements.length,
    streak,
    remainingDays,
    requirementProgress,
  };
}

/**
 * Mark goal as completed
 */
export async function markGoalCompleted(userId: string, goalId: string): Promise<void> {
  const { data: goal } = await supabase
    .from('goals')
    .select('goal_activity_id')
    .eq('id', goalId)
    .single();

  await supabase
    .from('goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  // Emit change event for sync
  if (goal) {
    emitActivityChanged(goal.goal_activity_id);
  }
}

/**
 * Extend goal (new end date or window)
 */
export async function extendGoal(
  userId: string,
  goalId: string,
  options: {
    newEndDate?: string;
    windowDays?: number;
  }
): Promise<void> {
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  let newEndDate = options.newEndDate;

  if (options.windowDays && goal.start_date) {
    const start = new Date(goal.start_date);
    start.setDate(start.getDate() + options.windowDays);
    newEndDate = start.toISOString().split('T')[0];
  }

  await updateGoal(goalId, {
    endDate: newEndDate,
    status: 'active', // Reset to active if was completed
  });

  // Update deadline schedule if exists
  const activity = await getActivityWithSchedules(goal.goal_activity_id);
  if (activity && activity.schedules.length > 0) {
    const deadlineSchedule = activity.schedules.find(s => s.schedule_type === 'deadline');
    if (deadlineSchedule && newEndDate) {
      const { updateActivitySchedule } = await import('../activities/activityService');
      await updateActivitySchedule(deadlineSchedule.id, {
        start_at: newEndDate,
      });
    }
  }
}

/**
 * Expand goal (clone with modified requirements)
 */
export async function expandGoal(
  userId: string,
  goalId: string,
  newRequirements: Omit<AddGoalRequirementInput, 'goalId'>[]
): Promise<{ goalId: string; activityId: string }> {
  // Get original goal
  const { data: originalGoal } = await supabase
    .from('goals')
    .select('*, goal_activity_id')
    .eq('id', goalId)
    .single();

  if (!originalGoal) {
    throw new Error('Goal not found');
  }

  const activity = await getActivityWithSchedules(originalGoal.goal_activity_id);
  if (!activity) {
    throw new Error('Goal activity not found');
  }

  // Create new goal with same title/description
  const newGoal = await createGoalActivity(userId, {
    title: `${activity.title} (Expanded)`,
    description: activity.description || undefined,
    startDate: originalGoal.start_date || undefined,
    endDate: originalGoal.end_date || undefined,
  });

  // Add new requirements
  for (const req of newRequirements) {
    await addGoalRequirement(userId, newGoal.goalId, req);
  }

  return newGoal;
}

