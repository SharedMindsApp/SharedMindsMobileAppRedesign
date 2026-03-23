import { useState, useEffect, useCallback } from 'react';
import { fetchConversationsList } from '../lib/encryptionUtils';
import { useAuth } from '../core/auth/AuthProvider';

interface Conversation {
  id: string;
  type: 'household' | 'direct' | 'group';
  title: string | null;
  household_id: string | null;
  created_at: string;
  last_message?: {
    id: string;
    ciphertext: string;
    nonce: string;
    sender_profile_id: string;
    created_at: string;
    message_type: string;
  };
  participants: Array<{
    profile_id: string;
    name: string;
    role: string;
  }>;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchConversationsList();

      if (result.success) {
        setConversations(result.conversations);
      } else {
        setError(result.error || 'Failed to load conversations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    reload: loadConversations,
  };
}

export function getLastOpenedAt(conversationId: string): string | null {
  try {
    const stored = localStorage.getItem(`conversation_${conversationId}_opened`);
    return stored;
  } catch {
    return null;
  }
}

export function setLastOpenedAt(conversationId: string): void {
  try {
    localStorage.setItem(
      `conversation_${conversationId}_opened`,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Failed to store last opened timestamp', error);
  }
}

export function hasUnreadMessages(conversation: Conversation): boolean {
  if (!conversation.last_message) return false;

  const lastOpened = getLastOpenedAt(conversation.id);
  if (!lastOpened) return true;

  return new Date(conversation.last_message.created_at) > new Date(lastOpened);
}
