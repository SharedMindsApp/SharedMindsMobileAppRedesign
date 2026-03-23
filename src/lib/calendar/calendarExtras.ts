/**
 * Calendar Extras Service
 * 
 * Provides habit instances and goal deadlines for calendar views.
 * These are derived from activities, not duplicated in calendar_events.
 */

import { getUserHabitCheckinsForRange } from '../habits/habitsService';
import { listHabits } from '../habits/habitsService';
import { listGoals, computeGoalProgress } from '../goals/goalsService';
import { getActivityWithSchedules } from '../activities/activityService';
import { generateInstancesFromSchedule } from '../activities/scheduleInstances';
import type { PersonalCalendarEvent } from '../personalSpaces/calendarService';

// ============================================================================
// Types
// ============================================================================

export interface HabitInstance {
  id: string;
  activity_id: string;
  schedule_id: string;
  local_date: string; // YYYY-MM-DD
  status: 'done' | 'missed' | 'skipped' | 'pending';
  value_numeric?: number;
  value_boolean?: boolean;
  title: string;
  metric_type?: string;
  metric_unit?: string;
  target_value?: number;
  is_derived_instance: true;
  derived_type: 'habit_instance';
}

export interface GoalDeadline {
  id: string;
  goal_activity_id: string;
  title: string;
  deadline: string;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'archived';
}

export interface CalendarExtras {
  habits: HabitInstance[];
  goals: GoalDeadline[];
}

// ============================================================================
// Get Calendar Extras
// ============================================================================

/**
 * Get habit instances and goal deadlines for date range
 * These are derived from activities, not from calendar_events
 */
export async function getCalendarExtrasForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarExtras> {
  // Get all active habits
  const habits = await listHabits(userId, { status: 'active' });

  // Get check-ins for date range
  const checkins = await getUserHabitCheckinsForRange(userId, startDate, endDate);

  // Get habit schedules to determine expected dates
  const habitInstances: HabitInstance[] = [];

  for (const habit of habits) {
    const activityWithSchedules = await getActivityWithSchedules(habit.id);
    if (!activityWithSchedules) continue;

    // Generate instances from schedules (using instance generator)
    for (const schedule of activityWithSchedules.schedules) {
      const instances = generateInstancesFromSchedule(
        schedule,
        habit.id,
        startDate,
        endDate
      );

      for (const instance of instances) {
        const checkin = checkins.find(
          c => c.activity_id === habit.id && c.local_date === instance.local_date
        );

        habitInstances.push({
          id: checkin?.id || `habit-${habit.id}-${instance.local_date}`,
          activity_id: habit.id,
          schedule_id: schedule.id,
          local_date: instance.local_date,
          status: checkin?.status || 'pending',
          value_numeric: checkin?.value_numeric || undefined,
          value_boolean: checkin?.value_boolean || undefined,
          title: habit.title,
          metric_type: habit.metadata?.metric_type,
          metric_unit: habit.metadata?.metric_unit,
          target_value: habit.metadata?.target_value,
          is_derived_instance: true,
          derived_type: 'habit_instance',
        });
      }
    }
  }

  // Get active goals with deadlines
  const goals = await listGoals(userId, { status: 'active' });
  const goalDeadlines: GoalDeadline[] = [];

  for (const goal of goals) {
    const activityWithSchedules = await getActivityWithSchedules(goal.goal_activity_id);
    if (!activityWithSchedules) continue;

    // Find deadline schedule
    const deadlineSchedule = activityWithSchedules.schedules.find(
      s => s.schedule_type === 'deadline' && s.start_at
    );

    if (deadlineSchedule && deadlineSchedule.start_at) {
      const deadlineDate = deadlineSchedule.start_at.split('T')[0];
      
      // Check if deadline is in range
      if (deadlineDate >= startDate && deadlineDate <= endDate) {
        // Compute progress
        const progress = await computeGoalProgress(userId, goal.id);

        goalDeadlines.push({
          id: goal.id,
          goal_activity_id: goal.goal_activity_id,
          title: activityWithSchedules.title,
          deadline: deadlineDate,
          progress: progress.overallProgress,
          status: goal.status,
        });
      }
    }
  }

  return {
    habits: habitInstances,
    goals: goalDeadlines,
  };
}


/**
 * Get habit instances for a specific date
 */
export async function getHabitInstancesForDate(
  userId: string,
  date: string
): Promise<HabitInstance[]> {
  const extras = await getCalendarExtrasForRange(userId, date, date);
  return extras.habits;
}

/**
 * Get goal deadlines for a specific date
 */
export async function getGoalDeadlinesForDate(
  userId: string,
  date: string
): Promise<GoalDeadline[]> {
  const extras = await getCalendarExtrasForRange(userId, date, date);
  return extras.goals;
}

