/**
 * Goal Activity Adapter
 * 
 * Bridges existing goal systems to the unified activity system.
 * Creates activities for goals and projects deadlines to calendar.
 */

import {
  createActivity,
  createActivitySchedule,
  getActivityWithSchedules,
  updateActivity,
  archiveActivity,
  type CreateActivityInput,
} from './activityService';
import {
  projectActivitySchedulesToCalendar,
  hideActivityProjections,
} from './activityCalendarProjection';

/**
 * Create activity from goal
 * Links goal to activity system and projects deadline to calendar
 */
export async function createGoalActivity(
  userId: string,
  goalData: {
    title: string;
    description?: string;
    targetDate?: string;
    category?: string;
    progress?: number;
  }
): Promise<{ activityId: string; scheduleId?: string }> {
  // Create activity
  const activityInput: CreateActivityInput = {
    type: 'goal',
    title: goalData.title,
    description: goalData.description,
    metadata: {
      category: goalData.category,
      progress: goalData.progress || 0,
      source: 'goal_tracker',
    },
    status: 'active',
  };

  const activity = await createActivity(userId, activityInput);

  let scheduleId: string | undefined;

  // Create deadline schedule if target date provided
  if (goalData.targetDate) {
    const schedule = await createActivitySchedule({
      activity_id: activity.id,
      schedule_type: 'deadline',
      start_at: goalData.targetDate,
      end_at: null, // Deadlines don't have end times
      metadata: {
        isDeadline: true,
      },
    });

    scheduleId = schedule.id;

    // Project deadline to calendar
    await projectActivitySchedulesToCalendar(userId, activity, [schedule]);
  }

  return {
    activityId: activity.id,
    scheduleId,
  };
}

/**
 * Update goal activity
 */
export async function updateGoalActivity(
  activityId: string,
  updates: {
    title?: string;
    description?: string;
    targetDate?: string;
    progress?: number;
    status?: 'active' | 'completed' | 'archived' | 'inactive';
  }
): Promise<void> {
  // Get current activity to preserve metadata
  const current = await getActivityWithSchedules(activityId);
  if (!current) return;

  const metadata = { ...current.metadata };
  if (updates.progress !== undefined) {
    metadata.progress = updates.progress;
  }
  if (updates.status === 'completed') {
    metadata.progress = 100;
  }

  await updateActivity(activityId, {
    title: updates.title,
    description: updates.description,
    status: updates.status,
    metadata,
  });

  // Update deadline schedule if target date changed
  if (updates.targetDate !== undefined && current.schedules.length > 0) {
    const deadlineSchedule = current.schedules.find(s => s.schedule_type === 'deadline');
    if (deadlineSchedule) {
      // Update existing deadline
      const { updateActivitySchedule } = await import('./activityService');
      await updateActivitySchedule(deadlineSchedule.id, {
        start_at: updates.targetDate,
      });
    } else if (updates.targetDate) {
      // Create new deadline
      await createActivitySchedule({
        activity_id: activityId,
        schedule_type: 'deadline',
        start_at: updates.targetDate,
        end_at: null,
      });
    }
  }
}

/**
 * Archive goal (soft delete)
 * Hides calendar projections but preserves history
 */
export async function archiveGoalActivity(
  userId: string,
  activityId: string
): Promise<void> {
  // Hide calendar projections
  await hideActivityProjections(userId, activityId);

  // Archive activity
  await archiveActivity(activityId);
}

/**
 * Get goal activity with schedules
 */
export async function getGoalActivity(activityId: string) {
  return await getActivityWithSchedules(activityId);
}






