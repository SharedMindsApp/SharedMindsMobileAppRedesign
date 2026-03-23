/**
 * Revoke Task Distribution Button
 * 
 * Phase 4.3: Action component for revoking task distributions
 * 
 * Responsibilities:
 * - Uses mutation hook (useRevokeTaskDistribution)
 * - Handles loading + error states
 * - Confirmation flow
 * - Hidden when distribution already revoked
 */

import { useState } from 'react';
import { useRevokeTaskDistribution } from '../../hooks/distribution/useRevokeTaskDistribution';

type RevokeTaskDistributionButtonProps = {
  taskId: string;
  targetUserId: string;
  onRevoked?: () => void;
};

export function RevokeTaskDistributionButton({ taskId, targetUserId, onRevoked }: RevokeTaskDistributionButtonProps) {
  const { revokeTaskDistribution, loading, error } = useRevokeTaskDistribution();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    const result = await revokeTaskDistribution({
      taskId,
      targetUserId,
    });

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
