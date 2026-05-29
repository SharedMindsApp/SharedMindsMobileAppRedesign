import { supabase } from '../../lib/supabase';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  /** Optional "why I'd like to connect" message, up to 280 chars. */
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionWithProfile extends Connection {
  display_name: string;
  avatar_url: string | null;
  other_user_id: string;
}

/** A "you two keep working together — connect?" suggestion, driven by repeated
 *  co-sessions. shared_skills / shared_work_types are the overlap with the
 *  viewer (for ranking + copy), already computed server-side. */
export interface ConnectionSuggestion {
  other_user_id: string;
  co_sessions: number;
  last_session_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  work_type: string | null;
  shared_skills: string[];
  shared_work_types: string[];
  country_code: string | null;
}

/** Partners the user has co-worked with 3+ times and isn't yet connected to.
 *  Ordered by frequency, then shared skills/work-types. Returns [] on error or
 *  if the RPC isn't migrated yet. */
export async function fetchConnectionSuggestions(): Promise<ConnectionSuggestion[]> {
  const { data, error } = await supabase.rpc('get_connection_suggestions');
  if (error) { console.warn('[fetchConnectionSuggestions] failed:', error); return []; }
  return (data ?? []).map((r: any) => ({
    other_user_id: r.other_user_id,
    co_sessions: Number(r.co_sessions ?? 0),
    last_session_at: r.last_session_at ?? null,
    display_name: r.display_name ?? null,
    avatar_url: r.avatar_url ?? null,
    work_type: r.work_type ?? null,
    shared_skills: (r.shared_skills ?? []) as string[],
    shared_work_types: (r.shared_work_types ?? []) as string[],
    country_code: r.country_code ?? null,
  }));
}

/** Hide a connect suggestion ("not now"). Persisted so it doesn't re-surface. */
export async function dismissConnectionSuggestion(otherUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('connection_suggestion_dismissals')
    .upsert({ user_id: user.id, other_user_id: otherUserId }, { onConflict: 'user_id,other_user_id' });
  if (error) console.warn('[dismissConnectionSuggestion] failed:', error);
}

export async function sendConnectionRequest(
  addresseeId: string,
  note?: string,
): Promise<Connection> {
  const trimmed = note?.trim() || null;
  const { data, error } = await supabase
    .from('connections')
    .insert({
      addressee_id: addresseeId,
      // Only send when present so legacy clients still work
      ...(trimmed ? { note: trimmed.slice(0, 280) } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Connection;
}

export async function acceptConnectionRequest(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', connectionId);

  if (error) throw error;
}

export async function removeConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId);

  if (error) throw error;
}

export async function fetchConnectionStatus(
  currentUserId: string,
  otherUserId: string
): Promise<{ status: ConnectionStatus; connectionId: string | null }> {
  const { data, error } = await supabase
    .from('connections')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),` +
      `and(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (error || !data) return { status: 'none', connectionId: null };

  if (data.status === 'accepted') return { status: 'connected', connectionId: data.id };
  if (data.requester_id === currentUserId) return { status: 'pending_sent', connectionId: data.id };
  return { status: 'pending_received', connectionId: data.id };
}

export async function fetchConnections(): Promise<ConnectionWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('connections')
    .select('*, requester:profiles!connections_requester_id_fkey(display_name, avatar_url), addressee:profiles!connections_addressee_id_fkey(display_name, avatar_url)')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const isRequester = row.requester_id === user.id;
    return {
      ...row,
      other_user_id: isRequester ? row.addressee_id : row.requester_id,
      display_name: isRequester
        ? (row.addressee?.display_name ?? 'Someone')
        : (row.requester?.display_name ?? 'Someone'),
      avatar_url: isRequester
        ? (row.addressee?.avatar_url ?? null)
        : (row.requester?.avatar_url ?? null),
    } as ConnectionWithProfile;
  });
}

/**
 * Cheap count of accepted connections. Use this instead of
 * `(await fetchConnections()).length` when you only need the number —
 * skips fetching full profile rows + serialisation, and PostgREST returns
 * just a row count in the response header.
 */
export async function fetchConnectionsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) {
    console.warn('[ConnectionService] fetchConnectionsCount failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchPendingRequests(): Promise<ConnectionWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('connections')
    .select('*, requester:profiles!connections_requester_id_fkey(display_name)')
    .eq('status', 'pending')
    .eq('addressee_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    other_user_id: row.requester_id,
    display_name: row.requester?.display_name ?? 'Someone',
  } as ConnectionWithProfile));
}
