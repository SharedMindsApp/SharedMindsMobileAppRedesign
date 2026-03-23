import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { canUserAccessTrack } from '../../lib/guardrails/ai/aiPermissions';

export function useCanAccessTrack(trackId: string) {
  const { profile } = useAuth();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setCanAccess(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    canUserAccessTrack(profile.id, trackId)
      .then((result) => {
        if (!cancelled) {
          setCanAccess(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanAccess(false);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, profile?.id]);

  return { canAccess, loading };
}
