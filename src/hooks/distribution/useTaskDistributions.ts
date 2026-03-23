import { useState, useEffect } from 'react';
import { listTaskProjectionsApi, type ListTaskProjectionsRequest } from '../../lib/api/distribution/taskDistributionApi';
import type { TaskProjection } from '../../lib/distribution/taskDistributionService';

export function useTaskDistributions(request: ListTaskProjectionsRequest) {
  const [data, setData] = useState<TaskProjection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listTaskProjectionsApi(request);

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
  }, [request.taskId]);

  return { data, loading, error, refresh };
}
