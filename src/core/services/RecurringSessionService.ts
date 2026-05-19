/**
 * RecurringSessionService — admin CRUD for recurring session templates +
 * thin wrapper over the `materialize_recurring_sessions` RPC.
 *
 * Templates schedule predictable group rhythms (weekly review, community
 * coworking blocks) into the regular focus_sessions calendar.
 */

import { supabase } from '../../lib/supabase';

export type SessionMode = 'group' | 'one_on_one' | 'solo';
export type SessionPurpose = 'weekly_review' | 'community' | 'workshop';

export interface RecurringTemplate {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  day_of_week: number;          // 0=Sun … 6=Sat
  time_local: string;           // 'HH:MM'
  timezone: string;             // IANA
  duration_minutes: 25 | 50 | 90;
  session_mode: SessionMode;
  session_purpose: SessionPurpose | null;
  quiet_mode: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpcomingMaterializedSession {
  id: string;
  scheduled_at: string;
  recurring_template_id: string;
  session_title: string | null;
  intended_duration_minutes: number | null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayLabel(dow: number): string {
  return DAY_NAMES[dow] ?? '?';
}

export function formatTemplateCadence(t: Pick<RecurringTemplate, 'day_of_week' | 'time_local' | 'timezone' | 'duration_minutes'>): string {
  return `${dayLabel(t.day_of_week)} ${t.time_local} · ${t.timezone} · ${t.duration_minutes}m`;
}

export const RecurringSessionService = {
  async list(): Promise<RecurringTemplate[]> {
    const { data, error } = await supabase
      .from('recurring_session_templates')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('time_local', { ascending: true });
    if (error) throw error;
    return (data ?? []) as RecurringTemplate[];
  },

  async create(input: Omit<RecurringTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'enabled'> & { enabled?: boolean }): Promise<RecurringTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('recurring_session_templates')
      .insert({ ...input, created_by: user.id, enabled: input.enabled ?? true })
      .select()
      .single();
    if (error) throw error;
    return data as RecurringTemplate;
  },

  async update(id: string, patch: Partial<RecurringTemplate>): Promise<RecurringTemplate> {
    const { data, error } = await supabase
      .from('recurring_session_templates')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RecurringTemplate;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_session_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /** Bulk-materialize the next N weeks of every enabled template. */
  async materialize(weeksAhead = 4): Promise<number> {
    const { data, error } = await supabase.rpc('materialize_recurring_sessions', { weeks_ahead: weeksAhead });
    if (error) throw error;
    return Number(data ?? 0);
  },

  /** Upcoming materialized sessions for a given template (UI preview). */
  async upcomingForTemplate(templateId: string, limit = 6): Promise<UpcomingMaterializedSession[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('id, scheduled_at, recurring_template_id, session_title, intended_duration_minutes')
      .eq('recurring_template_id', templateId)
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as UpcomingMaterializedSession[];
  },
};
