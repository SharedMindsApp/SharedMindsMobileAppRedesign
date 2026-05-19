import { useState, useEffect, useCallback } from 'react';
import { useSupabaseSubscription } from '../../../hooks/useSupabaseSubscription';
import { fetchActiveCommunitySessionsWithProfiles } from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/guardrails/focusTypes';

export function useCommunitySessionsSubscription() {
  const [sessions, setSessions] = useState<CommunitySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchActiveCommunitySessionsWithProfiles()
      .then((data) => { if (!cancelled) { setSessions(data); setIsLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // New session started
  const handleInsert = useCallback((payload: any) => {
    const newSession = payload.new;
    if (newSession?.status !== 'active') return;
    // Solo sessions are private — don't leak into the community feed.
    if (newSession?.session_mode === 'solo') return;
    // Fetch with profile name since realtime payload won't include joined data
    fetchActiveCommunitySessionsWithProfiles()
      .then((data) => setSessions(data))
      .catch(() => {});
  }, []);

  // Session updated (ended, paused, etc.)
  const handleUpdate = useCallback((payload: any) => {
    const updated = payload.new;
    if (!updated?.id) return;
    // Solo or non-active sessions don't belong in the community feed.
    if (updated.status !== 'active' || updated.session_mode === 'solo') {
      setSessions((prev) => prev.filter((s) => s.id !== updated.id));
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
    }
  }, []);

  // Session deleted
  const handleDelete = useCallback((payload: any) => {
    const deleted = payload.old;
    if (deleted?.id) {
      setSessions((prev) => prev.filter((s) => s.id !== deleted.id));
    }
  }, []);

  useSupabaseSubscription({
    channelName: 'community_sessions_insert',
    table: 'focus_sessions',
    event: 'INSERT',
    onEvent: handleInsert,
  });

  useSupabaseSubscription({
    channelName: 'community_sessions_update',
    table: 'focus_sessions',
    event: 'UPDATE',
    onEvent: handleUpdate,
  });

  useSupabaseSubscription({
    channelName: 'community_sessions_delete',
    table: 'focus_sessions',
    event: 'DELETE',
    onEvent: handleDelete,
  });

  return { sessions, isLoading, error };
}
