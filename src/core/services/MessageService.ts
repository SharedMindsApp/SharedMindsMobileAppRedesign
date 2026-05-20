import { supabase } from '../../lib/supabase';

export interface DmConversation {
  id: string;
  created_at: string;
  other_user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    work_type: string | null;
  };
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type DmPrivacy = 'open' | 'connections_only' | 'do_not_disturb';

export class DmPrivacyError extends Error {
  constructor(public readonly hint: 'do_not_disturb' | 'connections_only') {
    super(
      hint === 'do_not_disturb'
        ? 'This person is not accepting messages right now.'
        : 'This person only accepts messages from their connections.',
    );
    this.name = 'DmPrivacyError';
  }
}

/** Get or create a 1:1 DM conversation with another user. Returns conversation ID.
 *  Throws DmPrivacyError if the recipient's privacy settings block this. */
export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', {
    other_user_id: otherUserId,
  });
  if (error) {
    // Detect privacy gate errors raised by the RPC (SQLSTATE P0002)
    const hint = (error as any)?.hint as string | undefined;
    if (hint === 'do_not_disturb' || hint === 'connections_only') {
      throw new DmPrivacyError(hint);
    }
    throw error;
  }
  return data as string;
}

/** Update the current user's DM privacy setting. */
export async function updateDmPrivacy(privacy: DmPrivacy): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ dm_privacy: privacy })
    .eq('id', user.id);
  if (error) throw error;
}

/** Fetch all conversations for the current user with last message + other participant info. */
export async function fetchConversations(): Promise<DmConversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get conversations this user is part of
  const { data: participantRows, error } = await supabase
    .from('dm_participants')
    .select(`
      conversation_id,
      last_read_at,
      dm_conversations!inner(id, created_at)
    `)
    .eq('user_id', user.id);

  if (error || !participantRows?.length) return [];

  const conversationIds = participantRows.map((r: any) => r.conversation_id);

  // Get the other participant in each conversation
  const { data: otherParticipants } = await supabase
    .from('dm_participants')
    .select('conversation_id, user_id, profiles(id, display_name, avatar_url, work_type)')
    .in('conversation_id', conversationIds)
    .neq('user_id', user.id);

  // Get last message per conversation
  const lastMessages: Record<string, any> = {};
  for (const convId of conversationIds) {
    const { data: msgs } = await supabase
      .from('dm_messages')
      .select('id, content, sender_id, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (msgs?.[0]) lastMessages[convId] = msgs[0];
  }

  // Get unread counts (messages after last_read_at)
  const unreadCounts: Record<string, number> = {};
  for (const row of participantRows as any[]) {
    const { count } = await supabase
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', row.conversation_id)
      .neq('sender_id', user.id)
      .gt('created_at', row.last_read_at ?? '1970-01-01');
    unreadCounts[row.conversation_id] = count ?? 0;
  }

  const otherByConv: Record<string, any> = {};
  for (const op of (otherParticipants ?? []) as any[]) {
    otherByConv[op.conversation_id] = op.profiles;
  }

  return participantRows
    .map((row: any) => {
      const other = otherByConv[row.conversation_id];
      if (!other) return null;
      return {
        id: row.conversation_id,
        created_at: (row.dm_conversations as any)?.created_at ?? '',
        other_user: {
          id: other.id,
          display_name: other.display_name ?? 'Someone',
          avatar_url: other.avatar_url ?? null,
          work_type: other.work_type ?? null,
        },
        last_message: lastMessages[row.conversation_id] ?? null,
        unread_count: unreadCounts[row.conversation_id] ?? 0,
      } as DmConversation;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a!.last_message?.created_at ?? a!.created_at;
      const bTime = b!.last_message?.created_at ?? b!.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }) as DmConversation[];
}

/** Fetch messages for a conversation (newest last). */
export async function fetchMessages(conversationId: string, limit = 50): Promise<DmMessage[]> {
  const { data, error } = await supabase
    .from('dm_messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DmMessage[];
}

/** Send a message in a conversation. */
export async function sendMessage(conversationId: string, content: string): Promise<DmMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('dm_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) throw error;
  return data as DmMessage;
}

/** Mark conversation as read (update last_read_at). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('dm_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

/**
 * Total unread DMs for the current user across all conversations.
 * Cheap-ish: one fetch of participant rows then one count query per
 * conversation. With <50 conversations this is fine; if it grows we can
 * move it into a single RPC.
 */
export async function fetchTotalUnreadDms(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: rows } = await supabase
    .from('dm_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (!rows || rows.length === 0) return 0;

  let total = 0;
  for (const row of rows as any[]) {
    const { count } = await supabase
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', row.conversation_id)
      .neq('sender_id', user.id)
      .gt('created_at', row.last_read_at ?? '1970-01-01');
    total += count ?? 0;
  }
  return total;
}

/** Subscribe to new messages in a conversation. Returns unsubscribe function. */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: DmMessage) => void
): () => void {
  const channel = supabase
    .channel(`dm:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as DmMessage)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * Subscribe to ANY new DM addressed to the current user. Used for the
 * nav-level unread badge — fires a callback so the consumer can refetch
 * the total count.
 */
export function subscribeToAnyIncomingDm(onIncoming: () => void): () => void {
  const channel = supabase
    .channel('dm:any-incoming')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages' },
      () => onIncoming()
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
