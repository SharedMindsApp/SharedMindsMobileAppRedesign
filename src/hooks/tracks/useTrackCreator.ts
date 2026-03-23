import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useTrackCreator(trackId: string) {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) {
      setCreatorId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('guardrails_tracks')
      .select('created_by')
      .eq('id', trackId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
          setCreatorId(null);
          setLoading(false);
          return;
        }

        setCreatorId(data?.created_by || null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  return { creatorId, loading, error };
}
