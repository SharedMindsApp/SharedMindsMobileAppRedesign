import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

export interface Reaction {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  profiles: string[];
  hasUserReacted: boolean;
}

export function useReactions(messageId: string) {
  const { profile } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setReactions(data || []);
    } catch (err) {
      console.error('Failed to load reactions:', err);
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  useEffect(() => {
    loadReactions();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          setReactions((prev) => [...prev, payload.new as Reaction]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          setReactions((prev) =>
            prev.filter((r) => r.id !== (payload.old as Reaction).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, loadReactions]);

  const addReaction = useCallback(
    async (emoji: string) => {
      if (!profile) return;

      try {
        const { error } = await supabase.from('message_reactions').insert({
          message_id: messageId,
          profile_id: profile.id,
          emoji,
        });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    },
    [messageId, profile]
  );

  const removeReaction = useCallback(
    async (emoji: string) => {
      if (!profile) return;

      try {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('profile_id', profile.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } catch (err) {
        console.error('Failed to remove reaction:', err);
      }
    },
    [messageId, profile]
  );

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!profile) return;

      const hasReacted = reactions.some(
        (r) => r.profile_id === profile.id && r.emoji === emoji
      );

      if (hasReacted) {
        await removeReaction(emoji);
      } else {
        await addReaction(emoji);
      }
    },
    [reactions, profile, addReaction, removeReaction]
  );

  const groupedReactions = reactions.reduce((acc, reaction) => {
    const existing = acc.find((g) => g.emoji === reaction.emoji);
    if (existing) {
      existing.count++;
      existing.profiles.push(reaction.profile_id);
      if (profile && reaction.profile_id === profile.id) {
        existing.hasUserReacted = true;
      }
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        profiles: [reaction.profile_id],
        hasUserReacted: profile ? reaction.profile_id === profile.id : false,
      });
    }
    return acc;
  }, [] as ReactionGroup[]);

  return {
    reactions,
    groupedReactions,
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
  };
}
