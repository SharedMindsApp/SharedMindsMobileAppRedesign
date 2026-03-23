import { useState } from 'react';
import { revokeCreatorRightsApi, type RevokeCreatorRightsRequest } from '../../lib/api/permissions/creatorRightsApi';

export function useRevokeCreatorRights() {
  const [data, setData] = useState<void | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeCreatorRights = async (request: RevokeCreatorRightsRequest): Promise<void | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await revokeCreatorRightsApi(request);

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

  return { data, loading, error, revokeCreatorRights };
}
