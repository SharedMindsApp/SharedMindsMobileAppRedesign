import { supabase } from '../../lib/supabase';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  updated_at: string;
}

export interface ConnectionWithProfile extends Connection {
  display_name: string;
  avatar_url: string | null;
  other_user_id: string;
}

export async function sendConnectionRequest(addresseeId: string): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .insert({ addressee_id: addresseeId })
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
