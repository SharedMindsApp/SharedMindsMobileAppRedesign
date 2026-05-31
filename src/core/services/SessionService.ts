import { supabase } from '../../lib/supabase';
import type { FocusSession, CommunitySession, SessionOutcome } from '../../lib/sessions/focusTypes';
import { armSkillsPrompt } from '../../lib/skillsPrompt';
import { getAuthedUser } from '../../lib/authUser';
import type { PlannedWizard } from '../../lib/sessions/focusTypes';
import { defaultPlannedWizards } from '../features/sessions/SessionWizards/sessionPlan';

/** Stable id for planned-wizard bookkeeping. */
function genWizardId(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `pw_${Math.random().toString(36).slice(2, 10)}`;
}

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
  /** What the session is FOR — drives the mood axis. Defaults 'do'. */
  sessionKind?: 'do' | 'plan' | 'reflect';
  /** Session purpose — 'work' | 'plan' | 'connect' | 'meditate'. */
  sessionIntent?: 'work' | 'plan' | 'connect' | 'meditate';
  /** Three-level visibility — see migration 20260527000009. */
  visibility?: 'private' | 'presence' | 'public';
  /** Marker for Quick Timer scheduled blocks — see
   *  StartCommunitySessionInput.isQuickTimer. */
  isQuickTimer?: boolean;
  /** Optional structured segments copied from a session_templates row.
   *  When present, the calendar detail sheet shows a segment timeline
   *  and (future) the runtime auto-advances through them. */
  segments?: Array<{
    kind: string;
    label: string;
    minutes: number;
    wizard?: string;
  }>;
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
  /** Three-level visibility — see migration 20260527000009.
   *  If omitted, defaults are derived: solo → private (or presence if
   *  isQuickTimer), one_on_one/group → public. */
  visibility?: 'private' | 'presence' | 'public';
  /** Open-to-match: start as solo but appear in the "Live now — drop in"
   *  lane. If anyone joins via claim_open_session(), the session upgrades
   *  to one_on_one. Only meaningful for solo sessions. */
  openToMatch?: boolean;
  /** Host's social vibe — drives intro-phase length + auto-mute behaviour
   *  if/when a joiner arrives. See FocusSession.vibe for semantics.
   *  Defaults server-side to brief_hi (the "balanced" option). */
  vibe?: 'silent' | 'brief_hi' | 'chatty';
  /** What the session is FOR — drives the mood axis. Defaults 'do'. */
  sessionKind?: 'do' | 'plan' | 'reflect';
  /** Session purpose — 'work' | 'plan' | 'connect' | 'meditate'. */
  sessionIntent?: 'work' | 'plan' | 'connect' | 'meditate';
  /** Mood code captured at the moment of starting (interpreted via kind). */
  startMood?: string | null;
}

/** Pick a sensible default visibility given the mode + quick-timer flag.
 *  Centralised so all session-creation paths agree. */
export function defaultVisibilityFor(
  mode: 'group' | 'one_on_one' | 'solo' | undefined,
  isQuickTimer = false,
): 'private' | 'presence' | 'public' {
  if (mode === 'solo') return isQuickTimer ? 'presence' : 'private';
  return 'public';
}

export async function startCommunitySession(
  input: StartCommunitySessionInput
): Promise<FocusSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // A session must carry at least one signal so it never logs blank: either a
  // declared intention/task OR a purpose (match-me-now sets the purpose; the
  // task is filled in the waiting room). Guards every start path.
  if (!input.goalText?.trim() && !input.sessionIntent) {
    throw new Error('A session needs an intention or a purpose to start.');
  }

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
      visibility: input.visibility ?? defaultVisibilityFor(input.sessionMode, !!input.isQuickTimer),
      // Open-to-match is only meaningful when the host is starting solo —
      // if they're already in group/1-on-1, partnership is already decided.
      // The vibe column is also only relevant in that case (drives intro
      // behaviour for a future joiner), but we still persist what the user
      // picked even on non-solo sessions so reports can read it back.
      open_to_match: input.sessionMode === 'solo' && !!input.openToMatch,
      // Baseline for match-wait tracking — when this door opened.
      door_opened_at: (input.sessionMode === 'solo' && input.openToMatch) ? now.toISOString() : null,
      vibe: input.vibe ?? null,
      session_kind: input.sessionKind ?? 'do',
      session_intent: input.sessionIntent ?? null,
      start_mood: input.startMood ?? null,
      // 90+ min sessions auto-include a mid-session break (host can cancel
      // it from the session plan). Shorter sessions start with no agenda.
      planned_wizards: defaultPlannedWizards(input.durationMinutes, genWizardId),
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
// ── Legacy "Match me now" waiting-room flow — RETIRED ───────────────
//
// matchMeNow(), fetchLiveWaitingMatches(), joinPendingMatch() and
// cancelPendingMatch() were removed in task #185 cleanup. They
// implemented the original waiting_for_match lobby pattern, replaced
// by the open-to-match flow (see fetchOpenSessions() + claimOpenSession()
// below, plus migration 20260527000015 for the schema). The match_me_now
// RPC + cancel_pending_match RPC still exist server-side as a safety net
// for any in-flight rows but no client code calls them.

/**
 * Find scheduled or active sessions that overlap a proposed time window
 * for the current user. Used by DeclareSessionModal to warn before
 * creating a session that would double-book the host.
 *
 * Overlap = (existing.start < proposed.end) AND (existing.end > proposed.start)
 * — standard interval-intersection check.
 *
 * Optional `excludeSessionId` skips a specific row, used when editing
 * an existing scheduled session so it doesn't conflict with itself.
 */
export async function fetchConflictingSessions(input: {
  start: Date;
  durationMinutes: number;
  excludeSessionId?: string;
}): Promise<FocusSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const endIso = new Date(input.start.getTime() + input.durationMinutes * 60_000).toISOString();
  // Look back 4h before the proposed start — enough to catch any
  // currently-active or long session that's still running into the
  // window. Reading hosted + booked rows; partner sessions count
  // because the user can't be in two video rooms at once.
  const lookBack = new Date(input.start.getTime() - 4 * 60 * 60_000).toISOString();

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('id, user_id, partner_user_id, session_title, session_goal, session_mode, status, scheduled_at, start_time, target_end_time, intended_duration_minutes')
    .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
    .in('status', ['scheduled', 'active'])
    .gte('start_time', lookBack)
    .lt('start_time', endIso);

  if (error) {
    console.warn('[fetchConflictingSessions] query failed:', error);
    return [];
  }

  const proposedStartMs = input.start.getTime();
  const proposedEndMs = proposedStartMs + input.durationMinutes * 60_000;

  return (data ?? []).filter((row: any) => {
    if (input.excludeSessionId && row.id === input.excludeSessionId) return false;
    const startMs = new Date(row.scheduled_at ?? row.start_time).getTime();
    const dur = row.intended_duration_minutes ?? 25;
    const endMs = row.target_end_time
      ? new Date(row.target_end_time).getTime()
      : startMs + dur * 60_000;
    // Open interval overlap — back-to-back sessions (one ends exactly
    // when the next starts) are NOT conflicts.
    return startMs < proposedEndMs && endMs > proposedStartMs;
  }) as FocusSession[];
}

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

  // Booking into someone else's session is a social commitment — arm the
  // one-time skills-rating prompt (shown on next dashboard mount).
  armSkillsPrompt();

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
  /** Mood code at session end (interpreted via the session's kind axis). */
  end_mood?: string | null;
  /** Focus code at session end (separate from mood). */
  end_focus?: string | null;
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
  /** Mood code captured at the end of the session (interpreted via kind). */
  endMood?: string | null;
  /** Focus code captured at the end of the session (separate from mood). */
  endFocus?: string | null;
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
        end_mood: input.endMood ?? null,
        end_focus: input.endFocus ?? null,
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
      segments: input.segments ?? null,
      visibility: input.visibility ?? defaultVisibilityFor(input.sessionMode, !!input.isQuickTimer),
      session_kind: input.sessionKind ?? 'do',
      session_intent: input.sessionIntent ?? null,
      planned_wizards: defaultPlannedWizards(input.durationMinutes, genWizardId),
      drift_count: 0,
      distraction_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Arm the skills-rating prompt: scheduling a real session with others at
  // a set time is when skills become socially relevant. Quick-timer and
  // solo sessions are excluded (private/immediate — skills irrelevant).
  if (!input.isQuickTimer && (input.sessionMode ?? 'group') !== 'solo') {
    armSkillsPrompt();
  }

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
    /** Re-classify a scheduled session as solo / 1-on-1 / group. */
    sessionMode?: 'group' | 'one_on_one' | 'solo';
    /** Three-level visibility — private / presence / public. */
    visibility?: 'private' | 'presence' | 'public';
  }
): Promise<FocusSession> {
  const updates: Record<string, unknown> = {};
  if (patch.goalText !== undefined) updates.session_goal = patch.goalText;
  if (patch.title !== undefined) updates.session_title = patch.title;
  if (patch.visibility !== undefined) updates.visibility = patch.visibility;
  if (patch.sessionMode !== undefined) {
    updates.session_mode = patch.sessionMode;
    // Switching away from 1-on-1 clears any partner slot — partner_user_id
    // only makes sense for one_on_one. The DB row stays valid either way
    // (NULL is the open state), but explicit zeroing makes the calendar
    // re-render correctly.
    if (patch.sessionMode !== 'one_on_one') {
      updates.partner_user_id = null;
    }
  }
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

/** Cancel/remove a session. Behaviour depends on current status:
 *
 *   • `scheduled`           → hard-delete (no history value yet)
 *   • `active` / `paused`   → soft-cancel to status='cancelled' so the
 *                             user's history stays intact and we can
 *                             report on "things they bailed on"
 *   • `completed`           → refuse (the past is the past)
 *
 *  RLS gates ownership at the DB. The previous version only handled
 *  scheduled rows and silently no-op'd on active ones, which is the
 *  root cause of the "Remove doesn't update the UI" bug.
 */
export async function deleteScheduledSession(sessionId: string): Promise<void> {
  // Fetch current status first so we route to the right path.
  const { data: existing, error: fetchErr } = await supabase
    .from('focus_sessions')
    .select('status')
    .eq('id', sessionId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) throw new Error('Session not found.');

  if (existing.status === 'completed') {
    throw new Error('Completed sessions are part of your history and can\'t be removed.');
  }

  if (existing.status === 'scheduled') {
    // Hard delete — nothing of value yet.
    const { error } = await supabase
      .from('focus_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('status', 'scheduled');
    if (error) throw error;
    return;
  }

  // Active / paused / waiting_for_match → mark cancelled so the row
  // is preserved for history but the calendar + community feeds stop
  // showing it as live.
  const { error } = await supabase
    .from('focus_sessions')
    .update({
      status: 'cancelled',
      ended_at: new Date().toISOString(),
      end_time: new Date().toISOString(),
    })
    .eq('id', sessionId);
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
  //
  // Window: from yesterday 00:00 (so a session that just started today
  // still appears) up to 4 weeks ahead.
  //
  // Important perf rule: the calendar is mine-only, so we filter on
  // the SERVER (user_id = me OR partner_user_id = me OR session_purpose
  // present for admin-curated community sessions). Previously we
  // pulled every public scheduled session in the window and filtered
  // client-side — that meant ~200 rows + ~200 profile joins coming
  // back, only to discard 99% of them. The OR-filter cuts the payload
  // by ~10x for typical users and skips the post-filter JS work.
  // Window expanded: 4 weeks BACKWARD (for historical reference — past
  // completed sessions stay visible on the calendar so the user can
  // scroll back and see what they did) and 4 weeks FORWARD (upcoming
  // scheduled). Active sessions come from a separate realtime feed.
  const fourWeeksAgo   = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const fourWeeksAhead = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('focus_sessions')
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
    // Include both upcoming (`scheduled`) AND historical (`completed`)
    // sessions. Cancelled sessions are intentionally excluded — the
    // user explicitly removed them, so they shouldn't clutter the
    // calendar with deleted intent.
    .in('status', ['scheduled', 'completed'])
    .gte('start_time', fourWeeksAgo)
    .lte('start_time', fourWeeksAhead)
    .order('start_time', { ascending: true })
    .limit(200);

  if (myUserId) {
    // PostgREST `.or()` clauses are comma-separated. Each clause is a
    // standalone predicate; the engine ORs them together. `session_purpose.not.is.null`
    // pulls admin-curated weekly review / community / workshop sessions
    // that should still surface on every user's calendar.
    query = query.or(
      `user_id.eq.${myUserId},partner_user_id.eq.${myUserId},session_purpose.not.is.null`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchUpcomingScheduledSessions] query failed:', error);
    throw error;
  }

  return (data ?? []).map((row: any) => ({
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

// ── Open-to-match: the redesigned "Match me now" lane ────────────────
//
// Replaces the waiting-room model. The host's session is already active
// (they're working). Other users discover it via fetchOpenSessions() and
// drop in via claimOpenSession(). See migration 20260527000015.

/** Live sessions flagged open_to_match — what fills the "Live now —
 *  drop in" lane. Returns at most `limit` rows, sorted newest-arrival
 *  first (gives the still-fresh sessions priority; very old ones get
 *  deprioritised because the host is probably deep in flow). */
/** A match-me-now door must have at least this many minutes left to be worth
 *  joining — below it, the session reverts to solo and stops being shown. */
export const MIN_MATCH_MINUTES_LEFT = 15;

/** Waiting hosts ping last_seen_at on this cadence (see touchDoorPresence). */
export const DOOR_HEARTBEAT_MS = 60_000;
/** A door whose host hasn't pinged within this window is treated as a ghost
 *  (crashed / closed / asleep) and hidden from discovery. Allows ~2.5 missed
 *  heartbeats so a brief network blip doesn't drop a live door. */
export const DOOR_STALE_MS = 150_000;

/** Heartbeat for an open-to-match door: stamp last_seen_at = now() on the
 *  host's own session so it stays visible in discovery. Owner-only via existing
 *  RLS. Best-effort — a failed ping just risks the door going stale early, so
 *  errors are swallowed. */
export async function touchDoorPresence(sessionId: string): Promise<void> {
  const me = await getAuthedUser();
  if (!me) return;
  const { error } = await supabase
    .from('focus_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', me.id);
  if (error) console.warn('[touchDoorPresence] failed:', error);
}

/** Minutes remaining on a session from its end time (target_end_time, else
 *  start_time + intended_duration). Negative if already over. */
export function minutesLeft(row: {
  target_end_time?: string | null;
  start_time?: string | null;
  intended_duration_minutes?: number | null;
}): number {
  const endMs = row.target_end_time
    ? new Date(row.target_end_time).getTime()
    : row.start_time
      ? new Date(row.start_time).getTime() + (row.intended_duration_minutes ?? 25) * 60_000
      : 0;
  return (endMs - Date.now()) / 60_000;
}

/** Min samples in the current time bucket before we trust the "around now"
 *  estimate over the global average. */
const MATCH_WAIT_BUCKET_MIN_SAMPLES = 4;

/** Rolling average wait between a match-me-now door opening (start_time) and a
 *  partner dropping in (match_joined_at). Prefers the average for the CURRENT
 *  2-hour × weekday bucket once it has enough samples (`basis: 'live'`),
 *  otherwise falls back to the global average (`basis: 'global'`). Returns
 *  null when there isn't enough signal at all. Buckets match the admin
 *  match-wait heatmap (UTC day × 2-hour blocks). */
export async function fetchMatchWaitStats(): Promise<
  { avgMinutes: number; sampleSize: number; basis: 'live' | 'global' } | null
> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  // Aggregated over GENUINELY-completed matches only (see match_wait_buckets
  // RPC); abandoned / never-jointly-finished matches are excluded server-side.
  const { data, error } = await supabase.rpc('match_wait_buckets', { p_since: fourteenDaysAgo });
  if (error) { console.warn('[fetchMatchWaitStats] rpc failed:', error.message); return null; }
  const rows = (data ?? []) as { day: number; bucket: number; cnt: number; avg_minutes: number }[];
  if (rows.length === 0) return null;

  const now = new Date();
  const nowDay = now.getUTCDay();
  const nowBucket = Math.floor(now.getUTCHours() / 2);

  // Current time bucket — prefer it once it has enough samples.
  const cur = rows.find((r) => r.day === nowDay && r.bucket === nowBucket);
  if (cur && cur.cnt >= MATCH_WAIT_BUCKET_MIN_SAMPLES) {
    return { avgMinutes: Math.round(cur.avg_minutes), sampleSize: Number(cur.cnt), basis: 'live' };
  }

  // Global = sample-weighted mean across all buckets.
  const totalCnt = rows.reduce((a, r) => a + Number(r.cnt), 0);
  if (totalCnt < 3) return null;
  const weighted = rows.reduce((a, r) => a + r.avg_minutes * Number(r.cnt), 0) / totalCnt;
  return { avgMinutes: Math.round(weighted), sampleSize: totalCnt, basis: 'global' };
}

/** Host whose partner left wants a fresh match — abandons the current match
 *  (so it doesn't pollute wait stats) and re-opens the door with a new
 *  baseline. Returns the updated session, or null if not applicable. */
export async function reopenForNewMatch(sessionId: string): Promise<FocusSession | null> {
  const { data, error } = await supabase.rpc('reopen_for_new_match', { p_session_id: sessionId });
  if (error) throw error;
  return (data as FocusSession) ?? null;
}

export async function fetchOpenSessions(limit = 12): Promise<CommunitySession[]> {
  // Never offer the user their OWN open door — you can't drop into your own
  // session (claim_open_session rejects self-claims), so showing it just
  // produces a misleading "that session filled up" when tapped.
  const me = await getAuthedUser();

  // Only sessions whose time hasn't elapsed yet. We compute the cutoff as
  // now - max_reasonable_session (3h) so we always fetch at least something,
  // then filter client-side on the actual (start_time + duration > now) check.
  // Using a DB-side gte on start_time prevents returning hours-old zombie rows
  // that are still technically "active" because nobody ended them.
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('focus_sessions')
    .select('*, profiles!user_id(display_name, avatar_url, country_code, work_type), project:projects(id, title, color)')
    .eq('status', 'active')
    .eq('open_to_match', true)
    .is('partner_user_id', null)
    .gte('start_time', cutoff)
    .order('start_time', { ascending: false })
    .limit(limit);
  if (me) query = query.neq('user_id', me.id);

  const { data, error } = await query;

  if (error) {
    console.error('[fetchOpenSessions] query failed:', error);
    throw error;
  }

  // Bidirectional "not right now" hides — if either of us passed on the other
  // recently (opened our own door instead of pairing), keep us out of each
  // other's lists until the skip expires. RLS only returns rows involving me,
  // so the "other" party of each row is who to hide.
  const hidden = new Set<string>();
  if (me) {
    const { data: skips } = await supabase
      .from('match_skips')
      .select('skipper_user_id, skipped_user_id')
      .gt('expires_at', new Date().toISOString());
    for (const s of (skips ?? []) as any[]) {
      const other = s.skipper_user_id === me.id ? s.skipped_user_id : s.skipper_user_id;
      if (other) hidden.add(other);
    }
  }

  return (data ?? [])
    // Hide doors with too little time left to be worth joining — by the time
    // someone drops in there'd only be a few minutes of shared focus.
    .filter((row: any) => minutesLeft(row) >= MIN_MATCH_MINUTES_LEFT)
    // Hide "ghost" doors whose host has gone quiet (crashed / closed / asleep).
    // Guard on presence of the column so we degrade gracefully pre-migration:
    // a missing last_seen_at means "don't filter", not "everything is stale".
    .filter((row: any) => {
      const ls = row.last_seen_at;
      if (!ls) return true;
      return Date.now() - new Date(ls).getTime() <= DOOR_STALE_MS;
    })
    // Hide anyone we've mutually passed on for now.
    .filter((row: any) => !hidden.has(row.user_id))
    .map((row: any) => ({
      ...row,
      display_name: row.profiles?.display_name ?? 'Someone',
      avatar_url: row.profiles?.avatar_url ?? null,
      country_code: row.profiles?.country_code ?? null,
      work_type: row.profiles?.work_type ?? null,
    })) as CommunitySession[];
}

/** Honour a "start my own door instead" decision: record that the current
 *  user passed on the given hosts right now. Bidirectional + ephemeral — each
 *  pair is hidden from the other's open-door list until the skip expires
 *  (~30 min, see migration 20260530000050). Best-effort: never blocks the
 *  user from opening their door, so failures are swallowed with a warning. */
export async function skipMatchDoors(skippedUserIds: string[]): Promise<void> {
  const me = await getAuthedUser();
  if (!me) return;
  const expires = new Date(Date.now() + 30 * 60_000).toISOString();
  const rows = Array.from(new Set(skippedUserIds))
    .filter((id) => id && id !== me.id)
    .map((id) => ({ skipper_user_id: me.id, skipped_user_id: id, expires_at: expires }));
  if (rows.length === 0) return;
  // Upsert so re-skipping the same person refreshes the cooldown.
  const { error } = await supabase
    .from('match_skips')
    .upsert(rows, { onConflict: 'skipper_user_id,skipped_user_id' });
  if (error) console.warn('[skipMatchDoors] failed:', error);
}

/** How many people the current user has actively passed on (skipper side
 *  only). Powers the "N recently passed — hidden for a bit" footnote so an
 *  empty-looking sheet doesn't read as "nobody's here" when really we're just
 *  hiding people they declined. */
export async function fetchActiveMatchSkipCount(): Promise<number> {
  const me = await getAuthedUser();
  if (!me) return 0;
  const { count, error } = await supabase
    .from('match_skips')
    .select('*', { count: 'exact', head: true })
    .eq('skipper_user_id', me.id)
    .gt('expires_at', new Date().toISOString());
  if (error) return 0;
  return count ?? 0;
}

/** Race-safe drop-in: claim a partner slot in an open session. Returns
 *  the joined session (mode now 'one_on_one', intro_phase_ends_at set
 *  according to arrival timing + host vibe). Returns null if the slot
 *  was already taken / the door was closed / id was invalid — caller
 *  should refresh the lane and show "that one's full" feedback. */
export async function claimOpenSession(sessionId: string): Promise<FocusSession | null> {
  const { data, error } = await supabase.rpc('claim_open_session', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  // RPC returns the row (jsonb-like object) or null when the slot was gone.
  if (!data) return null;
  return data as FocusSession;
}

/** Persist the host's planned-wizard agenda on the session row. RLS lets
 *  only the session owner (host) write; the partner reads it via the row.
 *  See migration 20260529000020. */
export async function updatePlannedWizards(
  sessionId: string,
  planned: PlannedWizard[],
): Promise<void> {
  const { error } = await supabase
    .from('focus_sessions')
    .update({ planned_wizards: planned })
    .eq('id', sessionId);
  if (error) throw error;
}

// ── Scheduled 1-on-1 invites ────────────────────────────────────────────────
export interface SessionInvite {
  id: string;
  session_id: string;
  invited_by: string;
  invited_user_id: string | null;
  invited_email: string | null;
  invite_token: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  expires_at: string;
  // joined profile for the invited connection (when invited_user_id set)
  invited_profile?: { display_name: string; avatar_url: string | null } | null;
}

/** Invite a connection to a (1-on-1) session. Reserves the partner seat,
 *  logs the invite, and notifies them — all server-side. Returns invite id. */
export async function inviteConnectionToSession(
  sessionId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('invite_connection_to_session', {
    p_session_id: sessionId,
    p_user_id: userId,
  });
  if (error) throw error;
  return data as string;
}

/** Create an email invite to a session. Returns the shareable link the host
 *  can send. No notification (recipient may not have an account yet). */
export async function inviteEmailToSession(
  sessionId: string,
  email: string,
): Promise<{ inviteId: string; url: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('session_invites')
    .insert({ session_id: sessionId, invited_by: user.id, invited_email: email.trim().toLowerCase() })
    .select('id, invite_token')
    .single();
  if (error) throw error;
  return {
    inviteId: data.id,
    url: `${window.location.origin}/session-invite/${data.invite_token}`,
  };
}

/** Accept a session invite by token → claims the partner seat. Returns the
 *  session id to navigate to. */
export async function acceptSessionInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_session_invite', { p_token: token });
  if (error) throw error;
  return data as string;
}

/** List invites for a session (host view). */
export async function fetchSessionInvites(sessionId: string): Promise<SessionInvite[]> {
  const { data, error } = await supabase
    .from('session_invites')
    .select('*, invited_profile:profiles!invited_user_id(display_name, avatar_url)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessionInvite[];
}

/** Record the session owner's start-of-session check-in: mood AND focus (two
 *  separate dimensions). Captured in a focused step once the session opens.
 *  Either may be null (the step is skippable per-question). */
export async function updateSessionStartCheckIn(
  sessionId: string,
  mood: string | null,
  focus: string | null,
): Promise<void> {
  const updates: Record<string, any> = {};
  if (mood !== null) updates.start_mood = mood;
  if (focus !== null) updates.start_focus = focus;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase
    .from('focus_sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw error;
}

/** Set/replace the session's declared goal mid-session. Used by the
 *  match-me-now waiting room, where the task is declared AFTER the door
 *  opens rather than up front. Optionally links a task row. */
export async function updateSessionGoal(
  sessionId: string,
  goalText: string,
  taskId?: string,
): Promise<void> {
  const updates: Record<string, any> = { session_goal: goalText };
  if (taskId !== undefined) updates.session_task_id = taskId;
  const { error } = await supabase
    .from('focus_sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw error;
}

/** When the host abandons a matched session, the remaining partner takes it
 *  over: they become the host and the door re-opens for a new match. Returns
 *  the updated session, or null if the caller wasn't the partner / it was
 *  already taken over / the session ended. See migration 20260529000010. */
export async function takeOverAsHost(sessionId: string): Promise<FocusSession | null> {
  const { data, error } = await supabase.rpc('take_over_as_host', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  if (!data) return null;
  return data as FocusSession;
}

/** Host's mid-session escape hatch — flips open_to_match=false so the
 *  session disappears from the Live-now lane. Idempotent: no-op if the
 *  caller isn't the host or if someone's already joined. */
export async function closeTheDoor(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('close_the_door', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

/** Either party can skip the intro phase early (e.g. "ok we're ready,
 *  let's focus"). Nulls intro_phase_ends_at so both clients transition
 *  to work mode on the next realtime tick. */
export async function finishIntroPhase(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('finish_intro_phase', {
    p_session_id: sessionId,
  });
  if (error) throw error;
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

// ── RSVP / "sign up" for a scheduled session ────────────────────────────────
// A member can add a public group session (one they don't host) to their
// calendar so it shows in their home countdown + reminders. One row per
// (session, user); idempotent.

/** Sign up for a scheduled session. Idempotent — re-signing is a no-op. */
export async function rsvpToSession(sessionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('scheduled_session_rsvps')
    .upsert({ session_id: sessionId, user_id: user.id }, { onConflict: 'session_id,user_id' });
  if (error) throw error;
}

/** Cancel your sign-up for a scheduled session. */
export async function cancelRsvp(sessionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('scheduled_session_rsvps')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);
  if (error) throw error;
}

/** The set of scheduled-session ids the current user has signed up for.
 *  Degrades to an empty set if the table doesn't exist yet (pre-migration). */
export async function fetchMyRsvpedSessionIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await supabase
    .from('scheduled_session_rsvps')
    .select('session_id')
    .eq('user_id', user.id);
  if (error || !data) return new Set();
  return new Set(data.map((r: { session_id: string }) => r.session_id));
}

/** Map of session id → number of sign-ups, for a set of sessions.
 *  Aggregate-only (never exposes who). Empty on error / pre-migration. */
export async function fetchRsvpCounts(sessionIds: string[]): Promise<Record<string, number>> {
  if (sessionIds.length === 0) return {};
  const { data, error } = await supabase.rpc('get_session_rsvp_counts', { p_session_ids: sessionIds });
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const r of data as { session_id: string; going: number }[]) out[r.session_id] = r.going;
  return out;
}
