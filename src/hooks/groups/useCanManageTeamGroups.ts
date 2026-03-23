import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { canUserManageTeamGroups } from '../../lib/permissions/teamPermissions';

export function useCanManageTeamGroups(teamId: string) {
  const { profile } = useAuth();
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    canUserManageTeamGroups(teamId, profile.id)
      .then((result) => {
        if (!cancelled) {
          setCanManage(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanManage(false);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, profile?.id]);

  return { canManage, loading };
}
