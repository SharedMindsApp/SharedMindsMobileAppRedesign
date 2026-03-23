import { useState } from 'react';
import { revokeEventDistributionApi, type RevokeEventDistributionRequest } from '../../lib/api/distribution/eventDistributionApi';

export function useRevokeEventDistribution() {
  const [data, setData] = useState<void | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeEventDistribution = async (request: RevokeEventDistributionRequest): Promise<void | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await revokeEventDistributionApi(request);

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

  return { data, loading, error, revokeEventDistribution };
}
