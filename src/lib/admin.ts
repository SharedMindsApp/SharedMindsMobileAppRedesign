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
  user_id: string;
  email: string;
  full_name: string;
  role: 'free' | 'premium' | 'admin';
  created_at: string;
  updated_at: string;
  neurotype?: string;
  neurotype_display_name?: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  member_limit: number;
  created_by: string | null;
  members: Array<{ count: number }>;
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
  offset?: number;
}) {
  let query = supabase
    .from('profiles')
    .select('id, display_name, role, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 50)
    .range(params?.offset ?? 0, (params?.offset ?? 0) + (params?.limit ?? 50) - 1);

  if (params?.search) {
    query = query.ilike('display_name', `%${params.search}%`);
  }
  if (params?.role) {
    query = query.eq('role', params.role);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { users: data ?? [], total: data?.length ?? 0 };
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

export async function getHouseholds() {
  // Households are not used in SharedMinds — return empty
  return { households: [], total: 0 };
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
