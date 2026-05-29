import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export interface User {
  id: string;
  display_name: string | null;
  email: string | null;
  role: 'free' | 'premium' | 'admin';
  work_types: string[] | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  /** From auth.users — null means the user never clicked the
   *  confirmation link. Admin UI surfaces this as an "Unconfirmed"
   *  badge + Resend-verification action. */
  email_confirmed_at: string | null;
}

export interface AnalyticsSummary {
  // User counts
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  adminUsers: number;
  newSignupsToday: number;
  newSignupsWeek: number;

  // Session counts
  activeSessionsNow: number;     // status = active (non-solo)
  sessionsToday: number;          // started in the last 24h
  sessionsThisWeek: number;       // started in the last 7d
  totalSessions: number;          // all-time

  // Outcomes
  finishedSessions: number;
  partiallyFinished: number;
  somethingCameUp: number;
  completionRate: number;         // % of completed sessions where outcome = finished

  // Community
  totalConnections: number;       // status = accepted
  pendingConnections: number;     // status = pending
}

export interface RecentFinishedSession {
  id: string;
  session_goal: string | null;
  session_title: string | null;
  session_outcome: 'finished' | 'partially' | 'something_came_up' | null;
  ended_at: string | null;
  intended_duration_minutes: number | null;
  display_name: string;
  avatar_url: string | null;
}

export interface RecentSignup {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  work_types: string[] | null;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  admin_name?: string | null;
  admin_avatar?: string | null;
  target_name?: string | null;
}

// Unified platform event (aggregated from multiple tables)
export interface PlatformEvent {
  id: string;
  type: 'signup' | 'session_started' | 'session_finished' | 'role_change' | 'post' | 'connection';
  timestamp: string;
  actorName: string;
  actorAvatar: string | null;
  description: string;
  meta?: Record<string, unknown>;
}

export async function getUsers(params?: {
  search?: string;
  role?: string;
  limit?: number;
}): Promise<{ users: User[]; total: number }> {
  // Uses the admin_list_users SECURITY DEFINER RPC which joins profiles
  // with auth.users so we get email addresses. Returns empty for non-admin
  // callers (the function itself enforces this via is_admin()).
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;

  let users = (data ?? []) as User[];

  // Filter client-side. With small user counts (sub-thousand) this is fine.
  // If we ever scale past that we can push these into the RPC as args.
  if (params?.search) {
    const q = params.search.toLowerCase();
    users = users.filter((u) =>
      (u.display_name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q),
    );
  }
  if (params?.role) {
    users = users.filter((u) => u.role === params.role);
  }
  if (params?.limit && users.length > params.limit) {
    users = users.slice(0, params.limit);
  }

  return { users, total: users.length };
}

export async function updateUserRole(
  targetUserId: string,
  newRole: 'free' | 'premium' | 'admin',
) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId);
  if (error) throw error;
  return { success: true };
}

export async function getAnalytics(): Promise<{ summary: AnalyticsSummary }> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [profilesRes, sessionsRes, connectionsRes] = await Promise.all([
    supabase.from('profiles').select('role, created_at'),
    supabase.from('focus_sessions').select('status, session_outcome, session_mode, start_time, created_at'),
    supabase.from('connections').select('status'),
  ]);

  const profiles = profilesRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const connections = connectionsRes.data ?? [];

  const completed = sessions.filter((s) => s.status === 'completed');
  const finished = sessions.filter((s) => s.session_outcome === 'finished');
  const partially = sessions.filter((s) => s.session_outcome === 'partially');
  const somethingCameUp = sessions.filter((s) => s.session_outcome === 'something_came_up');

  const summary: AnalyticsSummary = {
    totalUsers:        profiles.length,
    freeUsers:         profiles.filter((p) => !p.role || p.role === 'free').length,
    premiumUsers:      profiles.filter((p) => p.role === 'premium').length,
    adminUsers:        profiles.filter((p) => p.role === 'admin').length,
    newSignupsToday:   profiles.filter((p) => p.created_at && p.created_at > dayAgo).length,
    newSignupsWeek:    profiles.filter((p) => p.created_at && p.created_at > weekAgo).length,

    activeSessionsNow: sessions.filter((s) => s.status === 'active' && s.session_mode !== 'solo').length,
    sessionsToday:     sessions.filter((s) => s.start_time && s.start_time > dayAgo).length,
    sessionsThisWeek:  sessions.filter((s) => s.start_time && s.start_time > weekAgo).length,
    totalSessions:     sessions.length,

    finishedSessions:  finished.length,
    partiallyFinished: partially.length,
    somethingCameUp:   somethingCameUp.length,
    completionRate:    completed.length > 0
                        ? Math.round((finished.length / completed.length) * 100)
                        : 0,

    totalConnections:    connections.filter((c) => c.status === 'accepted').length,
    pendingConnections:  connections.filter((c) => c.status === 'pending').length,
  };

  return { summary };
}

/** Recent finished sessions for the dashboard activity feed. */
export async function getRecentFinishedSessions(limit = 10): Promise<RecentFinishedSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select(`
      id, session_goal, session_title, session_outcome,
      ended_at, intended_duration_minutes,
      profiles ( display_name, avatar_url )
    `)
    .eq('status', 'completed')
    .neq('session_mode', 'solo')
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      session_goal: row.session_goal,
      session_title: row.session_title,
      session_outcome: row.session_outcome,
      ended_at: row.ended_at,
      intended_duration_minutes: row.intended_duration_minutes,
      display_name: profile?.display_name ?? 'Someone',
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

/** Recent signups for the dashboard activity feed. */
export async function getRecentSignups(limit = 10): Promise<RecentSignup[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at, work_types')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row: any) => ({
    id: row.id,
    display_name: row.display_name ?? 'Someone',
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
    work_types: row.work_types ?? null,
  }));
}

export async function getLogs(params?: {
  action_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AdminLog[]; total: number }> {
  try {
    let query = supabase
      .from('admin_logs')
      .select(`
        id, action_type, target_id, notes, created_at,
        admin:admin_id ( id, display_name, avatar_url )
      `)
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.action_type) query = query.eq('action_type', params.action_type);

    const { data, error } = await query;
    if (error) return { logs: [], total: 0 };

    const logs: AdminLog[] = (data ?? []).map((row: any) => ({
      id: row.id,
      admin_id: row.admin?.id ?? '',
      action_type: row.action_type,
      target_id: row.target_id ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
      admin_name: row.admin?.display_name ?? null,
      admin_avatar: row.admin?.avatar_url ?? null,
    }));

    return { logs, total: logs.length };
  } catch {
    return { logs: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Unified platform event feed
// ---------------------------------------------------------------------------

export async function getPlatformEvents(filter: 'all' | 'signup' | 'session' | 'admin' = 'all'): Promise<PlatformEvent[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
  const events: PlatformEvent[] = [];

  const fetchSignups = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(40);
    for (const p of data ?? []) {
      events.push({
        id: `signup-${p.id}`,
        type: 'signup',
        timestamp: p.created_at,
        actorName: p.display_name ?? 'Someone',
        actorAvatar: p.avatar_url,
        description: 'Joined SharedMinds',
      });
    }
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('focus_sessions')
      .select(`
        id, status, session_goal, session_outcome, session_mode,
        start_time, ended_at,
        profile:user_id ( display_name, avatar_url )
      `)
      .gte('start_time', since)
      .order('start_time', { ascending: false })
      .limit(60);
    for (const s of data ?? []) {
      const profile = (s as any).profile;
      const name = profile?.display_name ?? 'Someone';
      const avatar = profile?.avatar_url ?? null;
      const goal = s.session_goal ? `"${s.session_goal}"` : 'a session';
      const mode = s.session_mode === 'solo' ? ' (solo)' : s.session_mode === 'one_on_one' ? ' (1-on-1)' : '';

      if (s.status === 'completed' && s.ended_at) {
        const outcomeMap: Record<string, string> = {
          finished: '✅ finished',
          partially: '🔶 partially finished',
          something_came_up: '⚡ something came up',
        };
        const outcome = s.session_outcome ? outcomeMap[s.session_outcome] ?? 'finished' : 'finished';
        events.push({
          id: `session-end-${s.id}`,
          type: 'session_finished',
          timestamp: s.ended_at,
          actorName: name,
          actorAvatar: avatar,
          description: `Finished ${goal}${mode} — ${outcome}`,
        });
      } else {
        events.push({
          id: `session-start-${s.id}`,
          type: 'session_started',
          timestamp: s.start_time,
          actorName: name,
          actorAvatar: avatar,
          description: `Started ${goal}${mode}`,
        });
      }
    }
  };

  const fetchAdminActions = async () => {
    const { logs } = await getLogs({ limit: 40 });
    for (const l of logs) {
      events.push({
        id: `admin-${l.id}`,
        type: 'role_change',
        timestamp: l.created_at,
        actorName: l.admin_name ?? 'Admin',
        actorAvatar: l.admin_avatar ?? null,
        description: l.notes ?? l.action_type,
      });
    }
  };

  if (filter === 'all') {
    await Promise.all([fetchSignups(), fetchSessions(), fetchAdminActions()]);
  } else if (filter === 'signup') {
    await fetchSignups();
  } else if (filter === 'session') {
    await fetchSessions();
  } else if (filter === 'admin') {
    await fetchAdminActions();
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, 150);
}

export async function updateUserNeurotype(
  targetUserId: string,
  neurotypeProfileId: string
) {
  return adminFetch('admin-update-user-neurotype', {
    method: 'POST',
    body: JSON.stringify({
      target_user_id: targetUserId,
      neurotype_profile_id: neurotypeProfileId,
    }),
  });
}

// ---------------------------------------------------------------------------
// App config (app_config table)
// ---------------------------------------------------------------------------

export type AppConfigKey = 'signups_open' | 'maintenance_mode' | 'default_session_minutes';

export interface AppConfig {
  signups_open: boolean;
  maintenance_mode: boolean;
  default_session_minutes: number;
}

const CONFIG_DEFAULTS: AppConfig = {
  signups_open: true,
  maintenance_mode: false,
  default_session_minutes: 45,
};

export async function getAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value');
  if (error) return { ...CONFIG_DEFAULTS };

  const result = { ...CONFIG_DEFAULTS };
  for (const row of data ?? []) {
    (result as Record<string, unknown>)[row.key] = row.value;
  }
  return result;
}

export async function setAppConfig(
  key: AppConfigKey,
  value: boolean | number,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .upsert(
      { key, value, updated_by: updatedBy, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Heatmap analytics
// ---------------------------------------------------------------------------

/** Numeric score for any mood code (1 = lowest, 6 = highest). */
export const MOOD_SCORES: Record<string, number> = {
  // energy axis (do sessions)
  brainfog: 1, low: 2, distracted: 3, steady: 4, energised: 5, hyperfocus: 6,
  // clarity axis (plan / reflect sessions)
  foggy: 1, scattered: 2, unsure: 3, okay: 4, clear: 5, motivated: 6,
};

export interface MoodTimeCell {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** Time bucket index 0-7, each spanning 3 hours */
  bucket: number;
  count: number;
  avgScore: number;
}

export interface MoodShift {
  sessionKind: 'do' | 'plan' | 'reflect';
  avgStart: number;
  avgEnd: number;
  delta: number;
  count: number;
}

export interface DailyActivity {
  date: string;       // YYYY-MM-DD
  sessions: number;
  tasksCompleted: number;
}

export interface HeatmapAnalytics {
  moodCells: MoodTimeCell[];
  moodShifts: MoodShift[];
  dailyActivity: DailyActivity[];
  /** 0-23: which hour had the most sessions */
  peakHour: number;
  avgMoodScore: number | null;
}

export async function getHeatmapAnalytics(
  range: 'week' | 'month' | 'quarter' | 'all' = 'month',
): Promise<HeatmapAnalytics> {
  const since = range === 'all' ? null
    : range === 'week'    ? new Date(Date.now() - 7  * 86400_000).toISOString()
    : range === 'month'   ? new Date(Date.now() - 30 * 86400_000).toISOString()
    :                       new Date(Date.now() - 90 * 86400_000).toISOString();

  // ── Fetch sessions (start_mood lives on focus_sessions) ─────────────────
  let sessionsQuery = supabase
    .from('focus_sessions')
    .select('id, start_mood, start_time, session_kind')
    .not('start_time', 'is', null);
  if (since) sessionsQuery = sessionsQuery.gte('start_time', since);
  const { data: rawSessions } = await sessionsQuery;

  // ── Fetch end_mood from session_outcomes (one row per participant) ────────
  // We need session_id → end_mood to join with focus_sessions for the
  // before/after shift calculation. Only rows with a mood value are useful.
  const sessionIds = (rawSessions ?? []).map((s) => s.id);
  let endMoodMap = new Map<string, string>(); // session_id → end_mood
  if (sessionIds.length > 0) {
    const { data: outcomes } = await supabase
      .from('session_outcomes')
      .select('session_id, end_mood')
      .in('session_id', sessionIds)
      .not('end_mood', 'is', null);
    for (const o of outcomes ?? []) {
      if (o.end_mood) endMoodMap.set(o.session_id, o.end_mood);
    }
  }

  // Merge end_mood back onto sessions for unified processing below
  const sessions = (rawSessions ?? []).map((s) => ({
    ...s,
    end_mood: endMoodMap.get(s.id) ?? null,
  }));

  // ── Fetch completed tasks ────────────────────────────────────────────────
  let tasksQuery = supabase
    .from('tasks')
    .select('completed_at')
    .eq('status', 'done')
    .not('completed_at', 'is', null);
  if (since) tasksQuery = tasksQuery.gte('completed_at', since);
  const { data: tasks } = await tasksQuery;

  // ── Build mood heatmap cells (day × 3-hour bucket) ───────────────────────
  // bucket = Math.floor(hour / 3), giving buckets 0-7 (3h each)
  const cellMap = new Map<string, { sum: number; count: number }>();
  let globalMoodSum = 0, globalMoodCount = 0;

  for (const s of sessions ?? []) {
    if (!s.start_mood || !s.start_time) continue;
    const score = MOOD_SCORES[s.start_mood];
    if (!score) continue;
    const d = new Date(s.start_time);
    const day = d.getUTCDay();
    const bucket = Math.floor(d.getUTCHours() / 3);
    const key = `${day}-${bucket}`;
    const cell = cellMap.get(key) ?? { sum: 0, count: 0 };
    cell.sum += score;
    cell.count += 1;
    cellMap.set(key, cell);
    globalMoodSum += score;
    globalMoodCount += 1;
  }

  const moodCells: MoodTimeCell[] = Array.from(cellMap.entries()).map(([key, { sum, count }]) => {
    const [day, bucket] = key.split('-').map(Number);
    return { day, bucket, count, avgScore: sum / count };
  });

  // ── Mood before/after shifts ──────────────────────────────────────────────
  const shiftMap = new Map<string, { startSum: number; endSum: number; count: number }>();
  for (const s of sessions ?? []) {
    if (!s.start_mood || !s.end_mood || !s.session_kind) continue;
    const startScore = MOOD_SCORES[s.start_mood];
    const endScore   = MOOD_SCORES[s.end_mood];
    if (!startScore || !endScore) continue;
    const kind = s.session_kind as string;
    const entry = shiftMap.get(kind) ?? { startSum: 0, endSum: 0, count: 0 };
    entry.startSum += startScore;
    entry.endSum   += endScore;
    entry.count    += 1;
    shiftMap.set(kind, entry);
  }

  const moodShifts: MoodShift[] = Array.from(shiftMap.entries())
    .filter(([k]) => ['do', 'plan', 'reflect'].includes(k))
    .map(([kind, { startSum, endSum, count }]) => {
      const avgStart = startSum / count;
      const avgEnd   = endSum   / count;
      return {
        sessionKind: kind as 'do' | 'plan' | 'reflect',
        avgStart,
        avgEnd,
        delta: avgEnd - avgStart,
        count,
      };
    });

  // ── Daily activity (sessions + tasks per day) ─────────────────────────────
  const dayMap = new Map<string, DailyActivity>();

  const dateKey = (iso: string) => iso.slice(0, 10);

  for (const s of sessions ?? []) {
    if (!s.start_time) continue;
    const dk = dateKey(s.start_time);
    const entry = dayMap.get(dk) ?? { date: dk, sessions: 0, tasksCompleted: 0 };
    entry.sessions += 1;
    dayMap.set(dk, entry);
  }
  for (const t of tasks ?? []) {
    if (!t.completed_at) continue;
    const dk = dateKey(t.completed_at);
    const entry = dayMap.get(dk) ?? { date: dk, sessions: 0, tasksCompleted: 0 };
    entry.tasksCompleted += 1;
    dayMap.set(dk, entry);
  }

  const dailyActivity = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // ── Peak hour (0-23) ──────────────────────────────────────────────────────
  const hourCounts = new Array(24).fill(0);
  for (const s of sessions ?? []) {
    if (!s.start_time) continue;
    hourCounts[new Date(s.start_time).getUTCHours()] += 1;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    moodCells,
    moodShifts,
    dailyActivity,
    peakHour,
    avgMoodScore: globalMoodCount > 0 ? globalMoodSum / globalMoodCount : null,
  };
}

// ── Match-wait heatmap ───────────────────────────────────────────────────────
// How long match-me-now doors wait before a partner drops in, bucketed by
// day-of-week × 2-hour block (12 buckets/day → 84 cells). Powers the admin
// heatmap and (as volume grows) the live "around now" estimate shown when
// opening a door.

/** Number of 2-hour buckets in a day. */
export const MATCH_WAIT_BUCKETS_PER_DAY = 12;

export interface MatchWaitCell {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** 0-11, each spanning 2 hours (bucket b = hours [2b, 2b+2)). */
  bucket: number;
  count: number;
  avgMinutes: number;
}

export interface MatchWaitAnalytics {
  cells: MatchWaitCell[];
  /** Global mean wait across all matched doors in range (null if no data). */
  globalAvgMinutes: number | null;
  sampleSize: number;
}

export async function getMatchWaitAnalytics(
  range: 'week' | 'month' | 'quarter' | 'all' = 'month',
): Promise<MatchWaitAnalytics> {
  const since = range === 'all' ? null
    : range === 'week'    ? new Date(Date.now() - 7  * 86400_000).toISOString()
    : range === 'month'   ? new Date(Date.now() - 30 * 86400_000).toISOString()
    :                       new Date(Date.now() - 90 * 86400_000).toISOString();

  let q = supabase
    .from('focus_sessions')
    .select('start_time, match_joined_at, intended_duration_minutes')
    .not('match_joined_at', 'is', null);
  if (since) q = q.gte('start_time', since);
  const { data } = await q;

  const cellMap = new Map<string, { sum: number; count: number }>();
  let gSum = 0, gCount = 0;

  for (const row of data ?? []) {
    if (!row.start_time || !row.match_joined_at) continue;
    const start = new Date(row.start_time as string).getTime();
    const joined = new Date(row.match_joined_at as string).getTime();
    const mins = (joined - start) / 60_000;
    const cap = (row.intended_duration_minutes ?? 120);
    if (mins < 0 || mins > cap) continue; // drop clock skew / stale re-opens
    const d = new Date(row.start_time as string);
    const day = d.getUTCDay();
    const bucket = Math.floor(d.getUTCHours() / 2); // 0-11
    const key = `${day}-${bucket}`;
    const cell = cellMap.get(key) ?? { sum: 0, count: 0 };
    cell.sum += mins; cell.count += 1;
    cellMap.set(key, cell);
    gSum += mins; gCount += 1;
  }

  const cells: MatchWaitCell[] = Array.from(cellMap.entries()).map(([key, { sum, count }]) => {
    const [day, bucket] = key.split('-').map(Number);
    return { day, bucket, count, avgMinutes: sum / count };
  });

  return {
    cells,
    globalAvgMinutes: gCount > 0 ? gSum / gCount : null,
    sampleSize: gCount,
  };
}
