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
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  adminUsers: number;
  totalHouseholds: number;
  totalReports: number;
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

export async function getAnalytics() {
  const [profilesRes, sessionsRes, connectionsRes] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('focus_sessions').select('status, session_outcome, created_at'),
    supabase.from('connections').select('status'),
  ]);

  const profiles = profilesRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const connections = connectionsRes.data ?? [];

  const summary = {
    totalUsers: profiles.length,
    freeUsers: profiles.filter((p) => !p.role || p.role === 'free').length,
    premiumUsers: profiles.filter((p) => p.role === 'premium').length,
    adminUsers: profiles.filter((p) => p.role === 'admin').length,
    totalHouseholds: 0,
    totalReports: 0,
  };

  // Sessions by outcome as "events"
  const outcomeCounts: Record<string, number> = {
    'sessions_total': sessions.length,
    'sessions_active': sessions.filter((s) => s.status === 'active').length,
    'sessions_completed': sessions.filter((s) => s.status === 'completed').length,
    'outcome_finished': sessions.filter((s) => s.session_outcome === 'finished').length,
    'outcome_partially': sessions.filter((s) => s.session_outcome === 'partially').length,
    'outcome_something_came_up': sessions.filter((s) => s.session_outcome === 'something_came_up').length,
    'connections_total': connections.length,
    'connections_accepted': connections.filter((c) => c.status === 'accepted').length,
  };

  return { summary, eventsByType: outcomeCounts };
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
