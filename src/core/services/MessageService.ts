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

/** Get or create a 1:1 DM conversation with another user. Returns conversation ID. */
export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', {
    other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
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
