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
}) {
  // Admin logs table may not exist in SharedMinds — return empty gracefully
  try {
    let query = supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.action_type) query = query.eq('action_type', params.action_type);

    const { data, error } = await query;
    if (error) return { logs: [], total: 0 };
    return { logs: data ?? [], total: data?.length ?? 0 };
  } catch {
    return { logs: [], total: 0 };
  }
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
