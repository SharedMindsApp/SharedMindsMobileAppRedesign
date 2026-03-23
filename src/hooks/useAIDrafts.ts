import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AIDraft, DraftStatus } from '../lib/guardrails/ai/aiTypes';

export interface UseAIDraftsOptions {
  userId: string;
  projectId?: string | null;
  status?: DraftStatus | DraftStatus[];
  draftType?: string;
  limit?: number;
}

export function useAIDrafts(options: UseAIDraftsOptions) {
  const [drafts, setDrafts] = useState<AIDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [
    options.userId,
    options.projectId,
    options.status,
    options.draftType,
    options.limit,
  ]);

  async function loadDrafts() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ai_drafts')
        .select('*')
        .eq('user_id', options.userId)
        .order('created_at', { ascending: false });

      if (options.projectId !== undefined) {
        if (options.projectId === null) {
          query = query.is('project_id', null);
        } else {
          query = query.eq('project_id', options.projectId);
        }
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options.draftType) {
        query = query.eq('draft_type', options.draftType);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDrafts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }

  function refresh() {
    loadDrafts();
  }

  return {
    drafts,
    loading,
    error,
    refresh,
  };
}

export function usePendingDraftsCount(userId: string, projectId?: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCount();
  }, [userId, projectId]);

  async function loadCount() {
    try {
      setLoading(true);

      let query = supabase
        .from('ai_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'generated');

      if (projectId !== undefined) {
        if (projectId === null) {
          query = query.is('project_id', null);
        } else {
          query = query.eq('project_id', projectId);
        }
      }

      const { count: draftCount, error } = await query;

      if (error) throw error;

      setCount(draftCount || 0);
    } catch (err) {
      console.error('Failed to load pending drafts count:', err);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  function refresh() {
    loadCount();
  }

  return {
    count,
    loading,
    refresh,
  };
}

export function useDraftSubscription(
  userId: string,
  onDraftCreated?: (draft: AIDraft) => void,
  onDraftUpdated?: (draft: AIDraft) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('ai_drafts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_drafts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (onDraftCreated) {
            onDraftCreated(payload.new as AIDraft);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_drafts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (onDraftUpdated) {
            onDraftUpdated(payload.new as AIDraft);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onDraftCreated, onDraftUpdated]);
}
