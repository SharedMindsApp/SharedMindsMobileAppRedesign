import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { canUserEditTrack } from '../../lib/guardrails/ai/aiPermissions';

export function useCanEditTrack(trackId: string) {
  const { profile } = useAuth();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setCanEdit(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    canUserEditTrack(profile.id, trackId)
      .then((result) => {
        if (!cancelled) {
          setCanEdit(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanEdit(false);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, profile?.id]);

  return { canEdit, loading };
}
