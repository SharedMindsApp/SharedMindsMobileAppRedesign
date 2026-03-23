/**
 * Revoke Event Distribution Button
 * 
 * Phase 4.4: Action component for revoking event distributions
 * 
 * Responsibilities:
 * - Uses mutation hook (useRevokeEventDistribution)
 * - Handles loading + error states
 * - Confirmation flow
 * - Hidden when distribution already revoked
 */

import { useState } from 'react';
import { useRevokeEventDistribution } from '../../hooks/distribution/useRevokeEventDistribution';

type RevokeEventDistributionButtonProps = {
  eventId: string;
  targetUserId: string;
  targetSpaceId?: string | null;
  onRevoked?: () => void;
};

export function RevokeEventDistributionButton({ eventId, targetUserId, targetSpaceId, onRevoked }: RevokeEventDistributionButtonProps) {
  const { revokeEventDistribution, loading, error } = useRevokeEventDistribution();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    const result = await revokeEventDistribution({
      eventId,
      targetUserId,
      targetSpaceId,
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
