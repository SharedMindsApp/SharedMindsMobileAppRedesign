import { useState, useEffect } from 'react';
import { checkCreatorRightsApi, type CheckCreatorRightsRequest } from '../../lib/api/permissions/creatorRightsApi';

export function useCreatorRights(request: CheckCreatorRightsRequest) {
  const [data, setData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await checkCreatorRightsApi(request);

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
  }, [request.entityType, request.entityId, request.creatorUserId]);

  return { data, loading, error, refresh };
}
