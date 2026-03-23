import { useState } from 'react';
import { distributeTaskApi, type DistributeTaskRequest } from '../../lib/api/distribution/taskDistributionApi';

export function useDistributeTask() {
  const [data, setData] = useState<{ created: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distributeTask = async (request: DistributeTaskRequest): Promise<{ created: number; skipped: number } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await distributeTaskApi(request);

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

  return { data, loading, error, distributeTask };
}
