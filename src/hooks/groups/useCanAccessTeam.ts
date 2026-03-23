import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { canUserAccessTeam } from '../../lib/permissions/teamPermissions';

export function useCanAccessTeam(teamId: string) {
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

    canUserAccessTeam(teamId, profile.id)
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
  }, [teamId, profile?.id]);

  return { canAccess, loading };
}
