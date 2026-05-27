import { supabase } from '../../lib/supabase';
import type { FocusSession, CommunitySession, SessionOutcome } from '../../lib/sessions/focusTypes';

export interface CreateScheduledSessionInput {
  title: string;
  scheduledAt: Date;
  durationMinutes: 25 | 50 | 90;
  projectId?: string;
  /** Optional — defaults to 'group' (a public bookable slot). Pass
   *  'solo' for private quick-timer-style scheduled blocks that don't
   *  appear in anyone else's calendar. */
  sessionMode?: 'group' | 'one_on_one' | 'solo';
  /** Goal/activity text. Persisted as session_goal so the calendar
   *  list view shows the activity label (e.g. "Cold calling") rather
   *  than just the title. */
  goalText?: string;
  /** Marker for Quick Timer scheduled blocks — see
   *  StartCommunitySessionInput.isQuickTimer. */
  isQuickTimer?: boolean;
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
  projectId?: string;
  durationMinutes: 25 | 50 | 90;
  sessionMode?: 'group' | 'one_on_one' | 'solo';
  quietMode?: boolean;
  /**
   * Solo body-double mode — opt-in for solo sessions. User joins a shared
   * persistent Daily.co room with mic permanently off; sees other body-
   * doublers' cameras silently. Requires camera permission.
   */
  bodyDouble?: boolean;
  /**
   * Real-world / offline session — user is away from the screen entirely.
   * UI flips to phone-optimised chrome (no big timer circle, no Jitsi),
   * and Web Notifications fire when the timer completes. Implies solo
   * mode. Disables body_double.
   */
  isOffline?: boolean;
  /**
   * Marker: this row was created via the Quick Timer flow rather than
   * the full DeclareSessionModal. Both paths use session_mode='solo'
   * for the same backend behavior, but the calendar shows TIMER vs
   * SOLO pills based on this flag.
   */
  isQuickTimer?: boolean;
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
      project_id: input.projectId ?? null,
      session_mode: input.sessionMode ?? 'group',
      quiet_mode: input.quietMode ?? false,
      // Body-double and offline are mutually exclusive solo variants.
      // Offline takes precedence — if both are passed, body_double off.
      body_double: input.sessionMode === 'solo' && !input.isOffline && !!input.bodyDouble,
      is_offline:  input.sessionMode === 'solo' && !!input.isOffline,
      is_quick_timer: !!input.isQuickTimer,
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
    .eq('accept_joiners', true)        // host hasn't locked the room
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

/**
 * Promote a scheduled session to active — used when the start time arrives
 * OR a moderator clicks "Start now" from the waiting room.
 *
 * Idempotent: if the session is already active we just no-op. Returns the
 * updated row so the caller can refresh local state.
 */
export async function markScheduledSessionActive(sessionId: string): Promise<void> {
  // Fetch the duration so we can recompute target_end_time from "now". Without
  // this, the timer reads as 0:00 immediately for any session promoted after
  // its originally-scheduled time, and the debrief fires the moment the user
  // joins the live call.
  const { data: existing } = await supabase
    .from('focus_sessions')
    .select('intended_duration_minutes')
    .eq('id', sessionId)
    .maybeSingle();
  const duration = existing?.intended_duration_minutes ?? 50;
  const startMs = Date.now();
  const endMs = startMs + duration * 60 * 1000;

  const { error } = await supabase
    .from('focus_sessions')
    .update({
      status: 'active',
      start_time: new Date(startMs).toISOString(),
      target_end_time: new Date(endMs).toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'scheduled');  // only flip if still scheduled — no-op otherwise
  if (error) throw error;
}

/**
 * Mark a session as ended without picking an outcome.
 * Used by the End button — the outcome (finished/partially/something_came_up)
 * is picked separately on the summary page.
 */
/**
 * Extend an active session by N minutes. Updates target_end_time +
 * intended_duration_minutes on the DB row; the realtime subscription on
 * focus_sessions delivers the update to every participant so their timers
 * re-derive automatically.
 *
 * Caller must check host eligibility — RLS already restricts updates to
 * user_id = auth.uid() so non-hosts can't extend.
 */
export async function extendSession(
  sessionId: string,
  addMinutes: number,
): Promise<FocusSession> {
  // Fetch the current target so we extend FROM the existing end-time, not
  // from "now". This matters if the host clicks +15 when there's already
  // 2 minutes left — we want 17 min remaining, not 15.
  const { data: existing, error: fetchErr } = await supabase
    .from('focus_sessions')
    .select('target_end_time, intended_duration_minutes')
    .eq('id', sessionId)
    .single();
  if (fetchErr) throw fetchErr;

  const currentTarget = new Date(existing.target_end_time).getTime();
  const newTarget = new Date(currentTarget + addMinutes * 60 * 1000).toISOString();
  const newDuration = (existing.intended_duration_minutes ?? 0) + addMinutes;

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      target_end_time: newTarget,
      intended_duration_minutes: newDuration,
    })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as FocusSession;
}

/**
 * Promote a participant to co-host. Sets focus_sessions.co_host_user_id;
 * RLS guarantees only the actual host can do this (the WITH CHECK clause
 * inherited from the update policy + the explicit caller-side check below
 * — UPDATE only succeeds when user_id = auth.uid()).
 */
export async function promoteCoHost(
  sessionId: string,
  userId: string | null,
): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({ co_host_user_id: userId })
    .eq('id', sessionId)
    .eq('user_id', user.id)            // only the host can promote/demote
    .select()
    .single();
  if (error) throw error;
  return data as FocusSession;
}

/**
 * Flip accept_joiners. When false, the joinOneOnOneSession + group-session
 * entry paths refuse new participants. Existing joiners stay.
 */
export async function setAcceptJoiners(
  sessionId: string,
  accept: boolean,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({ accept_joiners: accept })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as FocusSession;
}

export async function markSessionEnded(sessionId: string): Promise<void> {
  const now = new Date();
  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('start_time')
    .eq('id', sessionId)
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
      actual_duration_minutes: actualMinutes,
    })
    .eq('id', sessionId);
  if (error) throw error;
}

// ── Live debrief ──────────────────────────────────────────────────────────────
//
// Each participant submits an outcome from inside the video call. Outcomes
// stream in via Realtime so everyone sees each other's answers as they happen.

export type DebriefOutcome = 'finished' | 'partially' | 'something_came_up' | 'no_answer';

export interface SessionOutcomeRow {
  id: string;
  session_id: string;
  user_id: string;
  outcome: DebriefOutcome;
  declared_goal: string | null;
  created_at: string;
  updated_at: string;
}

// ── Ambient peers ──────────────────────────────────────────────────────────────
//
// For solo sessions: lets us show OTHER members who are also doing solo
// sessions right now, so the user doesn't feel alone. No video, no chat —
// just an "I'm not the only one working" presence cue. Mirrors the ADHD
// "body double" effect.

export interface AmbientSoloPeer {
  id: string;
  user_id: string;
  session_goal: string | null;
  start_time: string;
  intended_duration_minutes: number | null;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Returns up to N other members currently in active solo sessions. Excludes
 * the calling user. RLS is expected to allow reading solo session rows since
 * they're already public-readable for the community feed pivot, just filtered
 * out at the query level by other callers.
 */
export async function fetchActiveSoloPeers(limit = 10): Promise<AmbientSoloPeer[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Two-query approach: avoids relying on a PostgREST relationship hint
  // that may not be present (same pattern we use for session_outcomes).
  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('id, user_id, session_goal, start_time, intended_duration_minutes')
    .eq('session_mode', 'solo')
    .eq('status', 'active')
    .is('ended_at', null)
    .neq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error || !sessions || sessions.length === 0) return [];

  const userIds = Array.from(new Set(sessions.map((s) => s.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id as string, {
      display_name: p.display_name as string,
      avatar_url: (p.avatar_url as string | null) ?? null,
    }]),
  );

  return sessions.map((s) => ({
    id: s.id as string,
    user_id: s.user_id as string,
    session_goal: (s.session_goal as string | null) ?? null,
    start_time: s.start_time as string,
    intended_duration_minutes: (s.intended_duration_minutes as number | null) ?? null,
    display_name: byId.get(s.user_id as string)?.display_name ?? 'Member',
    avatar_url: byId.get(s.user_id as string)?.avatar_url ?? null,
  }));
}

/**
 * Triggers the live debrief for ALL participants at once. Sets
 * `focus_sessions.debrief_started_at = now()`, which the other clients
 * are subscribed to via Realtime — they each open the debrief overlay
 * the moment the row updates.
 *
 * Idempotent: if debrief_started_at is already set, this is a no-op.
 * Called by the host's End button AND by the timer-zero auto-trigger.
 */
export async function triggerDebriefForSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('focus_sessions')
    .update({ debrief_started_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('debrief_started_at', null);
  if (error) throw error;
}

/**
 * Records the local user's declared intention for a session — typed in the
 * waiting room before the session starts. Each participant gets their own
 * row in session_outcomes, with the outcome filled in later by the debrief.
 *
 * Upserts on (session_id, user_id) so users can edit their intention in the
 * lobby up until the session starts.
 */
export async function setDeclaredIntention(input: {
  sessionId: string;
  declaredGoal: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = input.declaredGoal.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('session_outcomes')
    .upsert(
      {
        session_id: input.sessionId,
        user_id: user.id,
        declared_goal: trimmed,
      },
      { onConflict: 'session_id,user_id' },
    );
  if (error) throw error;
}

/**
 * Records the local user's outcome for a session. Upserts on (session_id,
 * user_id) so retries are idempotent and users can change their mind during
 * the debrief window.
 */
export async function submitSessionOutcome(input: {
  sessionId: string;
  outcome: DebriefOutcome;
  declaredGoal: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('session_outcomes')
    .upsert(
      {
        session_id: input.sessionId,
        user_id: user.id,
        outcome: input.outcome,
        declared_goal: input.declaredGoal,
      },
      { onConflict: 'session_id,user_id' },
    );
  if (error) throw error;
}

/**
 * Fetches all outcomes for a session (with joined profile info so the UI
 * can show display_name + avatar without an extra round-trip).
 */
export async function fetchSessionOutcomes(
  sessionId: string,
): Promise<Array<SessionOutcomeRow & { profile: { display_name: string; avatar_url: string | null } | null }>> {
  // Fetch outcomes + profiles in two queries and join client-side. PostgREST
  // can't infer the relationship because session_outcomes.user_id FKs to
  // auth.users, not profiles (even though profiles.id mirrors auth.users.id).
  const { data: outcomes, error } = await supabase
    .from('session_outcomes')
    .select('*')
    .eq('session_id', sessionId);
  if (error) throw error;
  if (!outcomes || outcomes.length === 0) return [];

  const userIds = Array.from(new Set(outcomes.map((o) => o.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profilesById = new Map(
    (profiles ?? []).map((p) => [p.id, { display_name: p.display_name as string, avatar_url: (p.avatar_url as string | null) ?? null }]),
  );

  return outcomes.map((o) => ({
    ...(o as SessionOutcomeRow),
    profile: profilesById.get(o.user_id) ?? null,
  }));
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
      session_goal: input.goalText ?? null,
      session_mode: input.sessionMode ?? 'group',
      scheduled_at: input.scheduledAt.toISOString(),
      start_time: input.scheduledAt.toISOString(),
      target_end_time: targetEnd.toISOString(),
      intended_duration_minutes: input.durationMinutes,
      project_id: input.projectId ?? null,
      join_code: joinCode,
      is_quick_timer: !!input.isQuickTimer,
      drift_count: 0,
      distraction_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FocusSession;
}

/** Update a scheduled session's editable fields. RLS gates to owner.
 *  Only meaningful for sessions in status='scheduled' — once a session
 *  is active the timer can be extended via extendSession but the goal
 *  and start time shouldn't change mid-flight. */
export async function updateScheduledSession(
  sessionId: string,
  patch: {
    goalText?: string | null;
    title?: string | null;
    scheduledAt?: Date;
    durationMinutes?: number;
  }
): Promise<FocusSession> {
  const updates: Record<string, unknown> = {};
  if (patch.goalText !== undefined) updates.session_goal = patch.goalText;
  if (patch.title !== undefined) updates.session_title = patch.title;
  if (patch.scheduledAt) {
    updates.scheduled_at = patch.scheduledAt.toISOString();
    updates.start_time = patch.scheduledAt.toISOString();
  }
  if (patch.durationMinutes !== undefined) {
    updates.intended_duration_minutes = patch.durationMinutes;
    const startBase = patch.scheduledAt ?? new Date(); // recompute target_end from the new start
    if (patch.scheduledAt) {
      updates.target_end_time = new Date(startBase.getTime() + patch.durationMinutes * 60 * 1000).toISOString();
    }
  }
  // If duration changed without a new scheduledAt, refresh target_end
  // from the existing start_time so the calendar block resizes.
  if (patch.durationMinutes !== undefined && !patch.scheduledAt) {
    const { data: existing } = await supabase
      .from('focus_sessions')
      .select('start_time')
      .eq('id', sessionId)
      .single();
    if (existing?.start_time) {
      const startMs = new Date(existing.start_time).getTime();
      updates.target_end_time = new Date(startMs + patch.durationMinutes * 60 * 1000).toISOString();
    }
  }
  const { data, error } = await supabase
    .from('focus_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as FocusSession;
}

/** Hard-delete a scheduled session. RLS gates to owner.
 *  Active or completed sessions should NOT be deleted — they're part of
 *  the user's history. The caller is responsible for only invoking this
 *  on status='scheduled' rows. */
export async function deleteScheduledSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('focus_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('status', 'scheduled'); // belt + braces: refuse to delete active/completed
  if (error) throw error;
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

/**
 * Fetch upcoming scheduled sessions for the calendar.
 *
 * When `myUserId` is provided, the result is filtered to sessions relevant to
 * that user:
 *   - sessions they host (`user_id = myUserId`)
 *   - sessions they've been booked into (`partner_user_id = myUserId`)
 *   - admin-curated community sessions (`session_purpose IS NOT NULL`),
 *     since those are intended for the whole community to see.
 *
 * Random other users' personal scheduled sessions are excluded — those live in
 * the "Find sessions" sheet, not on your private calendar.
 *
 * When `myUserId` is omitted, every upcoming scheduled session is returned
 * (used by FindSessionsSheet for the discovery view).
 */
export async function fetchUpcomingScheduledSessions(myUserId?: string): Promise<ScheduledSessionWithProfile[]> {
  // profiles!user_id disambiguates the FK — focus_sessions has both user_id
  // and partner_user_id pointing at profiles; PostgREST otherwise throws PGRST201.
  // Fetch up to 4 weeks ahead so organised users can see their full horizon.
  const fourWeeksAhead = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
    .eq('status', 'scheduled')
    .eq('session_type', 'scheduled')
    .lte('scheduled_at', fourWeeksAhead)
    .order('scheduled_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[fetchUpcomingScheduledSessions] query failed:', error);
    throw error;
  }

  let rows = data ?? [];

  if (myUserId) {
    rows = rows.filter((row: any) =>
      row.user_id === myUserId ||
      row.partner_user_id === myUserId ||
      row.session_purpose != null
    );
  }

  return rows.map((row: any) => ({
    ...row,
    display_name: row.profiles?.display_name ?? 'Someone',
    avatar_url: row.profiles?.avatar_url ?? null,
  })) as ScheduledSessionWithProfile[];
}

/**
 * Fetch all scheduled non-solo sessions in [fromIso, toIso). Used by the
 * "Find Sessions" sheet to populate the week-grouped list.
 */
export async function fetchScheduledSessionsInRange(
  fromIso: string,
  toIso: string,
): Promise<ScheduledSessionWithProfile[]> {
  // NOTE: `profiles!user_id` disambiguates the FK — focus_sessions has both
  // user_id and partner_user_id pointing at profiles, and PostgREST refuses
  // the embed unless we name which relationship to follow.
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
    .eq('status', 'scheduled')
    .eq('session_type', 'scheduled')
    .gte('scheduled_at', fromIso)
    .lt('scheduled_at', toIso)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[fetchScheduledSessionsInRange] query failed:', error);
    throw error;
  }

  // Filter solo sessions client-side. We can't use `.neq('session_mode', 'solo')`
  // because in PostgreSQL `NULL != 'solo'` evaluates to NULL (not TRUE), which
  // would silently drop legacy rows that have a NULL session_mode.
  return (data ?? [])
    .filter((row: any) => row.session_mode !== 'solo')
    .map((row: any) => ({
      ...row,
      display_name: row.profiles?.display_name ?? 'Someone',
      avatar_url: row.profiles?.avatar_url ?? null,
    })) as ScheduledSessionWithProfile[];
}

export async function fetchSessionByJoinCode(joinCode: string): Promise<ScheduledSessionWithProfile | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
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
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
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
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
    .eq('status', 'active')
    .neq('session_mode', 'solo') // Solo sessions are private — never in community feed
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    display_name: row.profiles?.display_name ?? 'Someone',
    avatar_url: row.profiles?.avatar_url ?? null,
    country_code: row.profiles?.country_code ?? null,
    work_type: row.profiles?.work_type ?? null,
  })) as CommunitySession[];
}
