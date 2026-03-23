/**
 * Scheduled Session Service
 * 
 * Handles CRUD operations for scheduled/recurring fitness sessions
 * and calendar synchronization
 */

import { supabase } from '../supabase';
import { createPersonalCalendarEvent } from '../personalSpaces/calendarService';
import { getUserProjects } from '../guardrails/projectUserService';
import type { MovementDomain } from './types';

export interface ScheduledSession {
  id: string;
  userId: string;
  activityDomain: MovementDomain;
  activityName: string;
  sessionType?: string;
  startDatetime: string; // ISO timestamp
  durationMinutes?: number;
  timezone?: string;
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceConfig?: {
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    dayOfMonth?: number;
    interval?: number; // Repeat every N weeks/months
    frequency?: string;
  };
  endDate?: string; // ISO date
  occurrenceCount?: number;
  calendarSyncEnabled: boolean;
  calendarSyncId?: string;
  calendarType?: 'personal' | 'shared' | 'google' | 'apple' | 'outlook';
  notes?: string;
  autoLogEnabled: boolean;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledSessionInput {
  activityDomain: MovementDomain;
  activityName: string;
  sessionType?: string;
  startDatetime: string;
  durationMinutes?: number;
  timezone?: string;
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceConfig?: ScheduledSession['recurrenceConfig'];
  endDate?: string;
  occurrenceCount?: number;
  notes?: string;
  autoLogEnabled?: boolean;
}

export class ScheduledSessionService {
  /**
   * Get all scheduled sessions for a user
   */
  async getScheduledSessions(userId: string, options?: {
    activityDomain?: MovementDomain;
    isActive?: boolean;
  }): Promise<ScheduledSession[]> {
    let query = supabase
      .from('fitness_scheduled_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_datetime', { ascending: true });

    if (options?.activityDomain) {
      query = query.eq('activity_domain', options.activityDomain);
    }

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get scheduled sessions:', error);
      throw new Error('Failed to load scheduled sessions');
    }

    return (data || []).map(this.mapToScheduledSession);
  }

  /**
   * Create a new scheduled session
   */
  async createScheduledSession(
    userId: string,
    input: CreateScheduledSessionInput
  ): Promise<ScheduledSession> {
    const { data, error } = await supabase
      .from('fitness_scheduled_sessions')
      .insert({
        user_id: userId,
        activity_domain: input.activityDomain,
        activity_name: input.activityName,
        session_type: input.sessionType,
        start_datetime: input.startDatetime,
        duration_minutes: input.durationMinutes,
        timezone: input.timezone || 'UTC',
        recurrence_type: input.recurrenceType,
        recurrence_config: input.recurrenceConfig || {},
        end_date: input.endDate,
        occurrence_count: input.occurrenceCount,
        notes: input.notes,
        auto_log_enabled: input.autoLogEnabled || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create scheduled session:', error);
      throw new Error('Failed to create scheduled session');
    }

    return this.mapToScheduledSession(data);
  }

  /**
   * Update a scheduled session
   */
  async updateScheduledSession(
    sessionId: string,
    updates: Partial<CreateScheduledSessionInput & {
      isActive?: boolean;
      calendarSyncEnabled?: boolean;
      calendarSyncId?: string;
    }>
  ): Promise<ScheduledSession> {
    const updateData: any = {};

    if (updates.activityDomain !== undefined) updateData.activity_domain = updates.activityDomain;
    if (updates.activityName !== undefined) updateData.activity_name = updates.activityName;
    if (updates.sessionType !== undefined) updateData.session_type = updates.sessionType;
    if (updates.startDatetime !== undefined) updateData.start_datetime = updates.startDatetime;
    if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.recurrenceType !== undefined) updateData.recurrence_type = updates.recurrenceType;
    if (updates.recurrenceConfig !== undefined) updateData.recurrence_config = updates.recurrenceConfig;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.occurrenceCount !== undefined) updateData.occurrence_count = updates.occurrenceCount;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.autoLogEnabled !== undefined) updateData.auto_log_enabled = updates.autoLogEnabled;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.calendarSyncEnabled !== undefined) updateData.calendar_sync_enabled = updates.calendarSyncEnabled;
    if (updates.calendarSyncId !== undefined) updateData.calendar_sync_id = updates.calendarSyncId;

    const { data, error } = await supabase
      .from('fitness_scheduled_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update scheduled session:', error);
      throw new Error('Failed to update scheduled session');
    }

    return this.mapToScheduledSession(data);
  }

  /**
   * Delete a scheduled session
   */
  async deleteScheduledSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('fitness_scheduled_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to delete scheduled session:', error);
      throw new Error('Failed to delete scheduled session');
    }
  }

  /**
   * Map database row to ScheduledSession
   */
  private mapToScheduledSession(row: any): ScheduledSession {
    return {
      id: row.id,
      userId: row.user_id,
      activityDomain: row.activity_domain as MovementDomain,
      activityName: row.activity_name,
      sessionType: row.session_type,
      startDatetime: row.start_datetime,
      durationMinutes: row.duration_minutes,
      timezone: row.timezone,
      recurrenceType: row.recurrence_type,
      recurrenceConfig: row.recurrence_config || {},
      endDate: row.end_date,
      occurrenceCount: row.occurrence_count,
      calendarSyncEnabled: row.calendar_sync_enabled || false,
      calendarSyncId: row.calendar_sync_id,
      calendarType: row.calendar_type,
      notes: row.notes,
      autoLogEnabled: row.auto_log_enabled || false,
      isActive: row.is_active,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Generate iCal format string for calendar sync
   */
  generateICalString(session: ScheduledSession): string {
    const startDate = new Date(session.startDatetime);
    const endDate = session.durationMinutes
      ? new Date(startDate.getTime() + session.durationMinutes * 60 * 1000)
      : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Fitness Tracker//NONSGML v1.0//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';
    ical += 'BEGIN:VEVENT\n';
    ical += `UID:${session.id}@fitness-tracker\n`;
    ical += `DTSTART:${formatDate(startDate)}\n`;
    ical += `DTEND:${formatDate(endDate)}\n`;
    ical += `SUMMARY:${session.activityName}\n`;
    
    if (session.notes) {
      ical += `DESCRIPTION:${session.notes.replace(/\n/g, '\\n')}\n`;
    }

    // Add recurrence rules if applicable
    if (session.recurrenceType === 'weekly' && session.recurrenceConfig?.daysOfWeek) {
      const days = session.recurrenceConfig.daysOfWeek.map(d => {
        const dayMap: Record<number, string> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };
        return dayMap[d] || '';
      }).filter(Boolean).join(',');
      
      const interval = session.recurrenceConfig.interval || 1;
      let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${days};INTERVAL=${interval}`;
      
      if (session.endDate) {
        rrule += `;UNTIL=${formatDate(new Date(session.endDate))}`;
      } else if (session.occurrenceCount) {
        rrule += `;COUNT=${session.occurrenceCount}`;
      }
      
      ical += `${rrule}\n`;
    }

    ical += 'END:VEVENT\n';
    ical += 'END:VCALENDAR\n';

    return ical;
  }

  /**
   * Download iCal file for a scheduled session
   */
  downloadICalFile(session: ScheduledSession): void {
    const icalString = this.generateICalString(session);
    const blob = new Blob([icalString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.activityName}-session.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Sync scheduled session to Personal Calendar
   */
  async syncToPersonalCalendar(session: ScheduledSession): Promise<string> {
    const startDate = new Date(session.startDatetime);
    const endDate = session.durationMinutes
      ? new Date(startDate.getTime() + session.durationMinutes * 60 * 1000)
      : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour

    const calendarEvent = await createPersonalCalendarEvent(session.userId, {
      title: session.activityName,
      description: session.notes || null,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      allDay: false,
      event_type: 'event',
      sourceType: 'personal',
      sourceEntityId: session.id,
      sourceProjectId: null,
    });

    // Update scheduled session with calendar sync ID
    await this.updateScheduledSession(session.id, {
      calendarSyncEnabled: true,
      calendarSyncId: calendarEvent.id,
      calendarType: 'personal',
    });

    return calendarEvent.id;
  }

  /**
   * Sync scheduled session to Guardrails Project Calendar
   */
  async syncToGuardrailsProject(session: ScheduledSession, projectId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get profile ID for created_by
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) throw new Error('Profile not found');

    // Get personal space ID (required for calendar_events)
    // Find personal space via space_members
    const { data: membership, error: membershipError } = await supabase
      .from('space_members')
      .select('space_id, spaces!inner(type)')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .eq('spaces.type', 'personal')
      .maybeSingle();

    if (membershipError || !membership) {
      throw new Error('Personal space not found');
    }

    const household = { id: membership.space_id };

    const startDate = new Date(session.startDatetime);
    const endDate = session.durationMinutes
      ? new Date(startDate.getTime() + session.durationMinutes * 60 * 1000)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    // Create calendar event for Guardrails project
    const { data: calendarEvent, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: session.userId,
        household_id: household.id,
        created_by: profile.id,
        title: session.activityName,
        description: session.notes || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        all_day: false,
        event_type: 'event',
        source_type: 'roadmap_event', // Using roadmap_event as source type for Guardrails
        source_entity_id: session.id,
        source_project_id: projectId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create Guardrails calendar event:', error);
      throw new Error('Failed to sync to Guardrails project calendar');
    }

    // Update scheduled session with calendar sync ID
    await this.updateScheduledSession(session.id, {
      calendarSyncEnabled: true,
      calendarSyncId: calendarEvent.id,
      calendarType: 'guardrails',
    });

    return calendarEvent.id;
  }

  /**
   * Sync scheduled session to Shared Space Calendar
   * Creates a personal calendar event that can be viewed in the shared space
   */
  async syncToSharedSpace(session: ScheduledSession, spaceId: string): Promise<string> {
    // For now, sync to personal calendar - shared space access is handled via calendar sharing
    // In future, this could create a context_event and calendar_projection for the shared space
    const startDate = new Date(session.startDatetime);
    const endDate = session.durationMinutes
      ? new Date(startDate.getTime() + session.durationMinutes * 60 * 1000)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    const calendarEvent = await createPersonalCalendarEvent(session.userId, {
      title: session.activityName,
      description: session.notes || `Shared from Fitness Tracker - ${session.activityName}`,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      allDay: false,
      event_type: 'event',
      sourceType: 'personal',
      sourceEntityId: session.id,
      sourceProjectId: null,
    });

    // Update scheduled session with calendar sync ID and space ID in notes/metadata
    await this.updateScheduledSession(session.id, {
      calendarSyncEnabled: true,
      calendarSyncId: calendarEvent.id,
      calendarType: 'shared',
      notes: session.notes ? `${session.notes} [Shared Space: ${spaceId}]` : `[Shared Space: ${spaceId}]`,
    });

    return calendarEvent.id;
  }

  /**
   * Unsync scheduled session from calendar (removes calendar event)
   */
  async unsyncFromCalendar(session: ScheduledSession): Promise<void> {
    if (!session.calendarSyncId) return;

    try {
      // Delete the calendar event
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', session.calendarSyncId);

      if (error) {
        console.error('Failed to delete calendar event:', error);
        // Don't throw - just log the error
      }
    } catch (error) {
      console.error('Failed to unsync from calendar:', error);
      // Don't throw - continue to update scheduled session
    }

    // Update scheduled session to remove sync
    await this.updateScheduledSession(session.id, {
      calendarSyncEnabled: false,
      calendarSyncId: null,
      calendarType: undefined,
    });
  }
}
