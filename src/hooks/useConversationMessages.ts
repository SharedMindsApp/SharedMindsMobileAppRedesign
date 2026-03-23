import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchConversationMessages } from '../lib/encryptionUtils';
import { useAuth } from '../core/auth/AuthProvider';
import { useEncryption } from '../contexts/EncryptionContext';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  ciphertext: string;
  nonce: string;
  message_type: 'text' | 'system' | 'info';
  created_at: string;
  sender_name?: string;
}

export function useConversationMessages(conversationId: string) {
  const { user, profile } = useAuth();
  const { isUnlocked, getConversationKey } = useEncryption();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadMessages = useCallback(
    async (before?: string) => {
      if (!user || !conversationId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchConversationMessages(conversationId, {
          limit: 50,
          before,
        });

        if (result.success) {
          if (before) {
            setMessages((prev) => [...result.messages, ...prev]);
          } else {
            setMessages(result.messages);
          }
          setHasMore(result.hasMore);
        } else {
          setError(result.error || 'Failed to load messages');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [user, conversationId]
  );

  const loadMore = useCallback(() => {
    if (hasMore && messages.length > 0) {
      const oldestMessage = messages[0];
      loadMessages(oldestMessage.id);
    }
  }, [hasMore, messages, loadMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!conversationId || !isUnlocked || !profile) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: participantCheck } = await supabase
            .from('conversation_participants')
            .select('left_at')
            .eq('conversation_id', conversationId)
            .eq('profile_id', profile.id)
            .maybeSingle();

          if (participantCheck?.left_at) {
            return;
          }

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [conversationId, isUnlocked, profile]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    reload: loadMessages,
  };
}
