import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

interface PresenceState {
  profile_id: string;
  name: string;
  online_at: string;
}

export function usePresence(conversationId: string | null) {
  const { profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Map<string, Date>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId || !profile) {
      return;
    }

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const online = new Set<string>();

        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            online.add(presence.profile_id);
          });
        });

        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: PresenceState) => {
          setOnlineUsers((prev) => new Set([...prev, presence.profile_id]));
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: PresenceState) => {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(presence.profile_id);
            return next;
          });
          setLastSeen((prev) => new Map(prev).set(presence.profile_id, new Date()));
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            profile_id: profile.id,
            name: profile.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, profile]);

  const isOnline = (profileId: string): boolean => {
    return onlineUsers.has(profileId);
  };

  const getLastSeen = (profileId: string): Date | null => {
    return lastSeen.get(profileId) || null;
  };

  return {
    onlineUsers: Array.from(onlineUsers),
    isOnline,
    getLastSeen,
  };
}
