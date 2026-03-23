import { useState, useEffect } from 'react';
import { listEntityPermissionsApi, type ListEntityPermissionsRequest } from '../../lib/api/permissions/entityGrantsApi';
import type { EntityPermissionGrant } from '../../lib/permissions/entityGrantsService';

export function useEntityPermissions(request: ListEntityPermissionsRequest) {
  const [data, setData] = useState<EntityPermissionGrant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listEntityPermissionsApi(request);

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
  }, [request.entityType, request.entityId]);

  return { data, loading, error, refresh };
}
