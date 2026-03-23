/**
 * Activity Calendar Projection Service
 * 
 * Projects activities and schedules to calendar events.
 * Calendar events are projections only - activities are the source of truth.
 */

import { supabase } from '../supabase';
import type { Activity, ActivitySchedule } from './activityTypes';
import type { CalendarEventType } from '../personalSpaces/calendarService';

/**
 * Get profile ID from user ID
 */
async function getProfileIdFromUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[activityCalendarProjection] Error fetching profile:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get user's personal space ID
 */
async function getUserPersonalHouseholdId(userId: string): Promise<string | null> {
  // Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('[activityCalendarProjection] Error fetching profile:', profileError);
    return null;
  }

  // Find personal space via space_members
  const { data: membership, error: membershipError } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(context_type)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.context_type', 'personal')
    .maybeSingle();

  if (membershipError) {
    console.error('[activityCalendarProjection] Error fetching personal space:', membershipError);
    return null;
  }

  return membership?.space_id || null;
}

/**
 * Project activity schedule to calendar event
 * Creates or updates calendar event as a projection
 */
export async function projectActivityToCalendar(
  userId: string,
  activity: Activity,
  schedule: ActivitySchedule
): Promise<string | null> {
  // Check if projection already exists
  const { data: existingProjection } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('activity_id', activity.id)
    .eq('user_id', userId)
    .eq('projection_state', 'active')
    .maybeSingle();

  if (!schedule.start_at) {
    // Can't project without start time
    return null;
  }

  // Map activity type to calendar event type
  const eventType: CalendarEventType = mapActivityTypeToEventType(activity.type);

  // Determine allDay based on schedule
  const allDay = schedule.schedule_type === 'deadline' || 
                  (schedule.start_at && schedule.end_at && 
                   new Date(schedule.start_at).toDateString() === new Date(schedule.end_at).toDateString() &&
                   new Date(schedule.start_at).getHours() === 0);

  if (existingProjection) {
    // Update existing projection
    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: activity.title,
        description: activity.description,
        start_at: schedule.start_at,
        end_at: schedule.end_at || schedule.start_at,
        all_day: allDay,
        event_type: eventType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProjection.id);

    if (error) {
      console.error('[activityCalendarProjection] Error updating projection:', error);
      throw error;
    }

    return existingProjection.id;
  } else {
    // Get profile ID and household ID for the insert
    const [profileId, householdId] = await Promise.all([
      getProfileIdFromUserId(userId),
      getUserPersonalHouseholdId(userId),
    ]);

    if (!profileId) {
      throw new Error('Profile not found for user');
    }

    if (!householdId) {
      throw new Error('Personal household not found for user');
    }

    // Create new projection directly with activity_id
    // Include both user_id (if column exists) and created_by/household_id (required)
    const insertData: any = {
      household_id: householdId,
      created_by: profileId,
      user_id: userId, // Include user_id if column exists (for personal calendar queries)
      title: activity.title,
      description: activity.description || null,
      start_at: schedule.start_at,
      end_at: schedule.end_at || schedule.start_at,
      all_day: allDay,
      event_type: eventType,
      activity_id: activity.id,
      projection_state: 'active',
      source_type: 'personal',
      source_entity_id: null,
      source_project_id: null,
    };

    const { data: calendarEvent, error: insertError } = await supabase
      .from('calendar_events')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[activityCalendarProjection] Error creating projection:', insertError);
      throw insertError;
    }

    return calendarEvent.id;
  }
}

/**
 * Map activity type to calendar event type
 */
function mapActivityTypeToEventType(activityType: string): CalendarEventType {
  const mapping: Record<string, CalendarEventType> = {
    habit: 'habit',
    goal: 'goal',
    task: 'task',
    meeting: 'meeting',
    meal: 'meal',
    reminder: 'reminder',
    time_block: 'time_block',
    appointment: 'appointment',
    milestone: 'milestone',
    travel_segment: 'travel_segment',
    event: 'event',
  };

  return mapping[activityType] || 'event';
}

/**
 * Project all active schedules for an activity
 */
export async function projectActivitySchedulesToCalendar(
  userId: string,
  activity: Activity,
  schedules: ActivitySchedule[]
): Promise<string[]> {
  const projectionIds: string[] = [];

  for (const schedule of schedules) {
    if (schedule.schedule_type === 'recurring' && schedule.recurrence_rule) {
      // For recurring schedules, project next N instances
      // TODO: Implement RRULE parsing and instance generation
      // For now, project the first instance
      if (schedule.start_at) {
        const id = await projectActivityToCalendar(userId, activity, schedule);
        if (id) projectionIds.push(id);
      }
    } else {
      // Single, deadline, or time_block
      const id = await projectActivityToCalendar(userId, activity, schedule);
      if (id) projectionIds.push(id);
    }
  }

  return projectionIds;
}

/**
 * Hide all calendar projections for an activity
 */
export async function hideActivityProjections(
  userId: string,
  activityId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      projection_state: 'hidden',
      updated_at: new Date().toISOString(),
    })
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .eq('projection_state', 'active');

  if (error) {
    console.error('[activityCalendarProjection] Error hiding projections:', error);
    throw error;
  }
}

/**
 * Restore all calendar projections for an activity
 */
export async function restoreActivityProjections(
  userId: string,
  activityId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      projection_state: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .in('projection_state', ['hidden', 'removed']);

  if (error) {
    console.error('[activityCalendarProjection] Error restoring projections:', error);
    throw error;
  }
}

