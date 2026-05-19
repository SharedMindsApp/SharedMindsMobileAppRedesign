import { supabase } from '../../lib/supabase';
import type { FocusSession, CommunitySession, SessionOutcome } from '../../lib/guardrails/focusTypes';

export interface CreateScheduledSessionInput {
  title: string;
  scheduledAt: Date;
  durationMinutes: 25 | 50 | 90;
}

export interface ScheduledSessionWithProfile extends FocusSession {
  display_name: string;
  avatar_url?: string | null;
}

export interface ShippedSession extends FocusSession {
  display_name: string;
  avatar_url?: string | null;
}

function generateJoinCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export interface StartCommunitySessionInput {
  goalText: string;
  taskId?: string;
  durationMinutes: 25 | 50 | 90;
  sessionMode?: 'group' | 'one_on_one' | 'solo';
  quietMode?: boolean;
}

export async function startCommunitySession(
  input: StartCommunitySessionInput
): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date();
  const targetEnd = new Date(now.getTime() + input.durationMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      status: 'active',
      start_time: now.toISOString(),
      target_end_time: targetEnd.toISOString(),
      intended_duration_minutes: input.durationMinutes,
      session_goal: input.goalText,
      session_task_id: input.taskId ?? null,
      session_mode: input.sessionMode ?? 'group',
      quiet_mode: input.quietMode ?? false,
      drift_count: 0,
      distraction_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FocusSession;
}

/**
 * Claim the partner slot in an open 1-on-1 session.
 *
 * Uses a conditional UPDATE: only succeeds when partner_user_id is still NULL.
 * If two users race for the same slot, the loser gets a "session full" error
 * because their update affects zero rows.
 */
export async function joinOneOnOneSession(sessionId: string): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({ partner_user_id: user.id })
    .eq('id', sessionId)
    .eq('session_mode', 'one_on_one')
    .eq('status', 'active')
    .is('partner_user_id', null)
    .neq('user_id', user.id) // can't partner your own session
    .select()
    .single();

  if (error) {
    // PGRST116 = no rows returned (slot already claimed, session ended, or self-join attempt)
    if (error.code === 'PGRST116') {
      throw new Error('This 1-on-1 session is full or no longer available.');
    }
    throw error;
  }
  return data as FocusSession;
}

export async function endCommunitySession(input: {
  sessionId: string;
  outcome: SessionOutcome;
}): Promise<void> {
  const now = new Date();

  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('start_time')
    .eq('id', input.sessionId)
    .single();

  if (fetchError) throw fetchError;

  const startTime = new Date(session.start_time);
  const actualMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);

  const { error } = await supabase
    .from('focus_sessions')
    .update({
      status: 'completed',
      end_time: now.toISOString(),
      ended_at: now.toISOString(),
      session_outcome: input.outcome,
      actual_duration_minutes: actualMinutes,
    })
    .eq('id', input.sessionId);

  if (error) throw error;
}

export async function createScheduledSession(
  input: CreateScheduledSessionInput
): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const targetEnd = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60 * 1000);
  const joinCode = generateJoinCode();

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      status: 'scheduled',
      session_type: 'scheduled',
      session_title: input.title,
      scheduled_at: input.scheduledAt.toISOString(),
      start_time: input.scheduledAt.toISOString(),
      target_end_time: targetEnd.toISOString(),
      intended_duration_minutes: input.durationMinutes,
      join_code: joinCode,
      drift_count: 0,
      distraction_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FocusSession;
}

export async function startScheduledSession(sessionId: string): Promise<FocusSession> {
  const now = new Date();
  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('intended_duration_minutes')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;

  const targetEnd = new Date(now.getTime() + (session.intended_duration_minutes ?? 50) * 60 * 1000);

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      status: 'active',
      start_time: now.toISOString(),
      target_end_time: targetEnd.toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as FocusSession;
}

export async function fetchUpcomingScheduledSessions(): Promise<ScheduledSessionWithProfile[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles(display_name, avatar_url)')
    .eq('status', 'scheduled')
    .eq('session_type', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    display_name: row.profiles?.display_name ?? 'Someone',
    avatar_url: row.profiles?.avatar_url ?? null,
  })) as ScheduledSessionWithProfile[];
}

export async function fetchSessionByJoinCode(joinCode: string): Promise<ScheduledSessionWithProfile | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles(display_name, avatar_url)')
    .eq('join_code', joinCode)
    .single();

  if (error) return null;
  if (!data) return null;

  return {
    ...data,
    display_name: (data as any).profiles?.display_name ?? 'Someone',
    avatar_url: (data as any).profiles?.avatar_url ?? null,
  } as ScheduledSessionWithProfile;
}

export async function fetchRecentShippedSessions(userId?: string): Promise<ShippedSession[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('focus_sessions')
    .select('*, profiles(display_name, avatar_url)')
    .eq('status', 'completed')
    .gt('ended_at', since)
    .order('ended_at', { ascending: false })
    .limit(20);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    display_name: row.profiles?.display_name ?? 'Someone',
    avatar_url: row.profiles?.avatar_url ?? null,
  })) as ShippedSession[];
}

export async function fetchActiveCommunitySessionsWithProfiles(): Promise<CommunitySession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles(display_name, avatar_url)')
    .eq('status', 'active')
    .neq('session_mode', 'solo') // Solo sessions are private — never in community feed
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    display_name: row.profiles?.display_name ?? 'Someone',
    avatar_url: row.profiles?.avatar_url ?? null,
  })) as CommunitySession[];
}
