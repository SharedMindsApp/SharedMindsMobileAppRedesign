/**
 * Revoke Permission Button
 * 
 * Phase 4.1: Action component for revoking permissions
 * 
 * Responsibilities:
 * - Uses mutation hook (useRevokeEntityPermission)
 * - Handles loading + error states
 * - Action-level only
 */

import { useState } from 'react';
import { useRevokeEntityPermission } from '../../hooks/permissions/useRevokeEntityPermission';

type RevokePermissionButtonProps = {
  grantId: string;
  onRevoked?: () => void;
};

export function RevokePermissionButton({ grantId, onRevoked }: RevokePermissionButtonProps) {
  const { revokePermission, loading, error } = useRevokeEntityPermission();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    const result = await revokePermission({ grantId });

    if (result !== null) {
      setShowConfirm(false);
      if (onRevoked) {
        onRevoked();
      }
    }
  };

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        <p>{error}</p>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Revoking...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      disabled={loading}
      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      Revoke
    </button>
  );
}
