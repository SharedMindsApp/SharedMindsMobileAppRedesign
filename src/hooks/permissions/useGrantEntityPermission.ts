import { useState } from 'react';
import { grantEntityPermissionApi, type GrantEntityPermissionRequest } from '../../lib/api/permissions/entityGrantsApi';
import type { EntityPermissionGrant } from '../../lib/permissions/entityGrantsService';

export function useGrantEntityPermission() {
  const [data, setData] = useState<EntityPermissionGrant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantPermission = async (request: GrantEntityPermissionRequest): Promise<EntityPermissionGrant | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await grantEntityPermissionApi(request);

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

  return { data, loading, error, grantPermission };
}
