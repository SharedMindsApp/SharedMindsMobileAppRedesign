import { useState } from 'react';
import { distributeEventApi, type DistributeEventRequest } from '../../lib/api/distribution/eventDistributionApi';

export function useDistributeEvent() {
  const [data, setData] = useState<{ created: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distributeEvent = async (request: DistributeEventRequest): Promise<{ created: number; skipped: number } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await distributeEventApi(request);

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

  return { data, loading, error, distributeEvent };
}
