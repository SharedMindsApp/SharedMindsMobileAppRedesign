/**
 * Habit Activity Adapter
 * 
 * Bridges existing habit systems to the unified activity system.
 * Creates activities for habits and projects them to calendar.
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
 * Create activity from habit
 * Links habit to activity system and projects to calendar
 */
export async function createHabitActivity(
  userId: string,
  habitData: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    repeatType: 'daily' | 'weekly' | 'monthly' | 'custom';
    repeatConfig?: Record<string, any>;
  }
): Promise<{ activityId: string; scheduleId: string }> {
  // Create activity
  const activityInput: CreateActivityInput = {
    type: 'habit',
    title: habitData.title,
    description: habitData.description,
    metadata: {
      repeatType: habitData.repeatType,
      repeatConfig: habitData.repeatConfig || {},
      source: 'habit_tracker',
    },
    status: 'active',
  };

  const activity = await createActivity(userId, activityInput);

  // Create schedule based on repeat type
  let scheduleType: 'single' | 'recurring' | 'deadline' | 'time_block' = 'recurring';
  let recurrenceRule: string | undefined;

  if (habitData.repeatType === 'daily') {
    recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  } else if (habitData.repeatType === 'weekly') {
    recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';
  } else if (habitData.repeatType === 'monthly') {
    recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';
  } else {
    // Custom - store in metadata
    scheduleType = 'recurring';
  }

  const schedule = await createActivitySchedule({
    activity_id: activity.id,
    schedule_type: scheduleType,
    start_at: habitData.startDate,
    end_at: habitData.endDate,
    recurrence_rule: recurrenceRule,
    metadata: {
      repeatType: habitData.repeatType,
      repeatConfig: habitData.repeatConfig || {},
    },
  });

  // Project to calendar
  await projectActivitySchedulesToCalendar(userId, activity, [schedule]);

  return {
    activityId: activity.id,
    scheduleId: schedule.id,
  };
}

/**
 * Update habit activity
 */
export async function updateHabitActivity(
  activityId: string,
  updates: {
    title?: string;
    description?: string;
    status?: 'active' | 'completed' | 'archived' | 'inactive';
  }
): Promise<void> {
  await updateActivity(activityId, {
    title: updates.title,
    description: updates.description,
    status: updates.status,
  });
}

/**
 * Archive habit (soft delete)
 * Hides calendar projections but preserves history
 */
export async function archiveHabitActivity(
  userId: string,
  activityId: string
): Promise<void> {
  // Hide calendar projections
  await hideActivityProjections(userId, activityId);

  // Archive activity
  await archiveActivity(activityId);
}

/**
 * Get habit activity with schedules
 */
export async function getHabitActivity(activityId: string) {
  return await getActivityWithSchedules(activityId);
}






