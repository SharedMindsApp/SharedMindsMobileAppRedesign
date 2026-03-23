import { useState } from 'react';
import { revokeEntityPermissionApi, type RevokeEntityPermissionRequest } from '../../lib/api/permissions/entityGrantsApi';

export function useRevokeEntityPermission() {
  const [data, setData] = useState<void | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokePermission = async (request: RevokeEntityPermissionRequest): Promise<void | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await revokeEntityPermissionApi(request);

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

  return { data, loading, error, revokePermission };
}
