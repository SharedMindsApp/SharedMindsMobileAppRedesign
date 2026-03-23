import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

interface TypingUser {
  profile_id: string;
  name: string;
}

export function useTypingIndicator(conversationId: string | null) {
  const { profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !profile) {
      return;
    }

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on(
        'broadcast',
        { event: 'typing' },
        (payload: { payload: { profile_id: string; name: string; is_typing: boolean } }) => {
          const { profile_id, name, is_typing } = payload.payload;

          if (profile_id === profile.id) return;

          setTypingUsers((prev) => {
            if (is_typing) {
              if (prev.some((u) => u.profile_id === profile_id)) {
                return prev;
              }
              return [...prev, { profile_id, name }];
            } else {
              return prev.filter((u) => u.profile_id !== profile_id);
            }
          });

          if (is_typing) {
            setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.profile_id !== profile_id)
              );
            }, 3000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, profile]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !profile || isTypingRef.current) return;

    isTypingRef.current = true;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        profile_id: profile.id,
        name: profile.name,
        is_typing: true,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [profile]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !profile || !isTypingRef.current) return;

    isTypingRef.current = false;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        profile_id: profile.id,
        name: profile.name,
        is_typing: false,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [profile]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}
