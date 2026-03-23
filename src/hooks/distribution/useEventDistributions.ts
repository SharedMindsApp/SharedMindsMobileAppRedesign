import { useState, useEffect } from 'react';
import { listEventDistributionsApi, type ListEventDistributionsRequest } from '../../lib/api/distribution/eventDistributionApi';
import type { CalendarProjection } from '../../lib/distribution/eventDistributionService';

export function useEventDistributions(request: ListEventDistributionsRequest) {
  const [data, setData] = useState<CalendarProjection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listEventDistributionsApi(request);

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
  }, [request.eventId]);

  return { data, loading, error, refresh };
}
