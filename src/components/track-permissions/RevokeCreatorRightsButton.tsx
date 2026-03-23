/**
 * Revoke Creator Rights Button
 * 
 * Phase 4.2: Action component for revoking creator rights
 * 
 * Responsibilities:
 * - Uses useRevokeCreatorRights hook
 * - Handles loading + error states
 * - Confirmation required
 */

import { useState } from 'react';
import { useRevokeCreatorRights } from '../../hooks/creator-rights/useRevokeCreatorRights';

type RevokeCreatorRightsButtonProps = {
  trackId: string;
  creatorUserId: string;
  onRevoked?: () => void;
};

export function RevokeCreatorRightsButton({ trackId, creatorUserId, onRevoked }: RevokeCreatorRightsButtonProps) {
  const { revokeCreatorRights, loading, error } = useRevokeCreatorRights();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    const result = await revokeCreatorRights({
      entityType: 'track',
      entityId: trackId,
      creatorUserId,
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
          {loading ? 'Revoking...' : 'Confirm Revoke'}
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
      Revoke Creator Rights
    </button>
  );
}
