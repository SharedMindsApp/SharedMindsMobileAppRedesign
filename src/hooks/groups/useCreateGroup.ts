import { useState } from 'react';
import { createGroupApi, type CreateGroupRequest } from '../../lib/api/groups/groupsApi';
import type { TeamGroup } from '../../lib/groups/teamGroupsService';

export function useCreateGroup() {
  const [data, setData] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = async (request: CreateGroupRequest): Promise<TeamGroup | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await createGroupApi(request);

      if (!response.success) {
        setError(response.error || 'An unexpected error occurred');
        return null;
      }

      setData(response.data ?? null);
      return response.data ?? null;
    } catch {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, createGroup };
}
