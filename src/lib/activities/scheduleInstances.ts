/**
 * Schedule Instance Generator
 * 
 * Expands activity schedules into occurrences at read-time.
 * NO DUPLICATION: Pure computed instances, never written to DB.
 */

import { getActivityWithSchedules } from './activityService';
import type { ActivitySchedule } from './activityTypes';

// ============================================================================
// Types
// ============================================================================

export interface ScheduleInstance {
  activity_id: string;
  schedule_id: string;
  starts_at: string; // ISO timestamp
  ends_at: string | null; // ISO timestamp or null
  local_date: string; // YYYY-MM-DD
  timezone: string;
}

// ============================================================================
// Instance Generation
// ============================================================================

/**
 * Expand schedules for date range into instances
 * Pure computation - no database writes
 */
export async function expandSchedulesForRange(
  userId: string,
  startISO: string,
  endISO: string
): Promise<ScheduleInstance[]> {
  // This would typically fetch all user activities with schedules
  // For now, we'll generate instances from schedules passed in
  // In practice, you'd query activities with schedules for the user
  
  const instances: ScheduleInstance[] = [];
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);

  // This is a placeholder - in practice, you'd fetch activities with schedules
  // For now, we'll handle this in the calendar service where we have access to activities
  
  return instances;
}

/**
 * Generate instances from a single schedule
 */
export function generateInstancesFromSchedule(
  schedule: ActivitySchedule,
  activityId: string,
  startISO: string,
  endISO: string
): ScheduleInstance[] {
  const instances: ScheduleInstance[] = [];
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  const timezone = schedule.timezone || 'UTC';

  if (!schedule.start_at) {
    return instances;
  }

  const scheduleStart = new Date(schedule.start_at);
  const scheduleEnd = schedule.end_at ? new Date(schedule.end_at) : null;

  switch (schedule.schedule_type) {
    case 'single':
      // One instance if overlaps range
      if (scheduleStart <= endDate && (!scheduleEnd || scheduleEnd >= startDate)) {
        instances.push({
          activity_id: activityId,
          schedule_id: schedule.id,
          starts_at: schedule.start_at,
          ends_at: schedule.end_at,
          local_date: scheduleStart.toISOString().split('T')[0],
          timezone,
        });
      }
      break;

    case 'deadline':
      // One instance at due date
      if (scheduleStart >= startDate && scheduleStart <= endDate) {
        instances.push({
          activity_id: activityId,
          schedule_id: schedule.id,
          starts_at: schedule.start_at,
          ends_at: null, // Deadlines don't have end times
          local_date: scheduleStart.toISOString().split('T')[0],
          timezone,
        });
      }
      break;

    case 'recurring':
      // Parse RRULE and generate instances
      if (schedule.recurrence_rule) {
        const recurringInstances = parseRRULE(
          schedule.recurrence_rule,
          scheduleStart,
          scheduleEnd,
          schedule.end_at ? new Date(schedule.end_at) : null,
          startDate,
          endDate,
          activityId,
          schedule.id,
          timezone
        );
        instances.push(...recurringInstances);
      } else {
        // Fallback: daily recurrence if no RRULE
        const dailyInstances = generateDailyInstances(
          scheduleStart,
          scheduleEnd,
          startDate,
          endDate,
          activityId,
          schedule.id,
          timezone
        );
        instances.push(...dailyInstances);
      }
      break;

    case 'time_block':
      // Similar to single, but may have duration
      if (scheduleStart <= endDate && (!scheduleEnd || scheduleEnd >= startDate)) {
        instances.push({
          activity_id: activityId,
          schedule_id: schedule.id,
          starts_at: schedule.start_at,
          ends_at: schedule.end_at,
          local_date: scheduleStart.toISOString().split('T')[0],
          timezone,
        });
      }
      break;
  }

  return instances;
}

/**
 * Parse RRULE and generate instances
 * Minimal implementation - supports FREQ=DAILY/WEEKLY/MONTHLY
 */
function parseRRULE(
  rrule: string,
  dtstart: Date,
  dtend: Date | null,
  until: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
  activityId: string,
  scheduleId: string,
  timezone: string
): ScheduleInstance[] {
  const instances: ScheduleInstance[] = [];
  
  // Parse RRULE (minimal implementation)
  const freqMatch = rrule.match(/FREQ=(\w+)/i);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/i);
  const countMatch = rrule.match(/COUNT=(\d+)/i);
  
  const freq = freqMatch ? freqMatch[1].toUpperCase() : 'DAILY';
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;
  const count = countMatch ? parseInt(countMatch[1], 10) : null;
  
  let current = new Date(dtstart);
  let instanceCount = 0;
  
  while (current <= rangeEnd && (!until || current <= until)) {
    if (current >= rangeStart) {
      instances.push({
        activity_id: activityId,
        schedule_id: scheduleId,
        starts_at: current.toISOString(),
        ends_at: dtend ? new Date(current.getTime() + (dtend.getTime() - dtstart.getTime())).toISOString() : null,
        local_date: current.toISOString().split('T')[0],
        timezone,
      });
      
      instanceCount++;
      if (count && instanceCount >= count) {
        break;
      }
    }
    
    // Advance based on frequency
    if (freq === 'DAILY') {
      current.setDate(current.getDate() + interval);
    } else if (freq === 'WEEKLY') {
      current.setDate(current.getDate() + (7 * interval));
    } else if (freq === 'MONTHLY') {
      current.setMonth(current.getMonth() + interval);
    } else {
      // Default to daily
      current.setDate(current.getDate() + interval);
    }
  }
  
  return instances;
}

/**
 * Generate daily instances (fallback)
 */
function generateDailyInstances(
  dtstart: Date,
  dtend: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
  activityId: string,
  scheduleId: string,
  timezone: string
): ScheduleInstance[] {
  const instances: ScheduleInstance[] = [];
  let current = new Date(Math.max(dtstart.getTime(), rangeStart.getTime()));
  const end = dtend ? new Date(Math.min(dtend.getTime(), rangeEnd.getTime())) : rangeEnd;
  
  while (current <= end) {
    instances.push({
      activity_id: activityId,
      schedule_id: scheduleId,
      starts_at: current.toISOString(),
      ends_at: null,
      local_date: current.toISOString().split('T')[0],
      timezone,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return instances;
}






