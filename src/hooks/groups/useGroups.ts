import { useState, useEffect } from 'react';
import { listGroupsApi, type ListGroupsRequest } from '../../lib/api/groups/groupsApi';
import type { TeamGroup } from '../../lib/groups/teamGroupsService';

export function useGroups(teamId: string) {
  const [data, setData] = useState<TeamGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listGroupsApi({ teamId });

      if (!response.success) {
        setError(response.error || 'An unexpected error occurred');
        setData(null);
        return;
      }

      setData(response.data ?? null);
    } catch {
      setError('An unexpected error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  return { data, loading, error, refresh };
}
