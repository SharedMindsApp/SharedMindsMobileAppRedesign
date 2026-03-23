import { useState } from 'react';
import { revokeTaskProjectionApi, type RevokeTaskProjectionRequest } from '../../lib/api/distribution/taskDistributionApi';

export function useRevokeTaskDistribution() {
  const [data, setData] = useState<void | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeTaskDistribution = async (request: RevokeTaskProjectionRequest): Promise<void | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await revokeTaskProjectionApi(request);

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

  return { data, loading, error, revokeTaskDistribution };
}
