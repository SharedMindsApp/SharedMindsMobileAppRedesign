import { useState } from 'react';
import { restoreCreatorRightsApi, type RestoreCreatorRightsRequest } from '../../lib/api/permissions/creatorRightsApi';

export function useRestoreCreatorRights() {
  const [data, setData] = useState<void | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreCreatorRights = async (request: RestoreCreatorRightsRequest): Promise<void | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await restoreCreatorRightsApi(request);

      if (!response.success) {
        setError(response.error || 'An unexpected error occurred');
        return null;
      }

      setData(undefined);
      return undefined;
    } catch {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, restoreCreatorRights };
}
