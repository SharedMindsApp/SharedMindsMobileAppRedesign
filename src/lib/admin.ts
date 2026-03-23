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
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.role) queryParams.append('role', params.role);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return adminFetch(`admin-get-users${query ? `?${query}` : ''}`);
}

export async function updateUserRole(
  targetUserId: string,
  newRole: 'free' | 'premium' | 'admin',
  memberLimit?: number
) {
  return adminFetch('admin-update-user-role', {
    method: 'POST',
    body: JSON.stringify({
      target_user_id: targetUserId,
      new_role: newRole,
      member_limit: memberLimit,
    }),
  });
}

export async function getHouseholds(params?: {
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return adminFetch(`admin-get-households${query ? `?${query}` : ''}`);
}

export async function getAnalytics() {
  return adminFetch('admin-get-analytics');
}

export async function getLogs(params?: {
  action_type?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.action_type) queryParams.append('action_type', params.action_type);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return adminFetch(`admin-get-logs${query ? `?${query}` : ''}`);
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
