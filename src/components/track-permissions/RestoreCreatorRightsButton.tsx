/**
 * Restore Creator Rights Button
 * 
 * Phase 4.2: Action component for restoring creator rights
 * 
 * Responsibilities:
 * - Uses useRestoreCreatorRights hook
 * - Handles loading + error states
 * - Confirmation required
 */

import { useState } from 'react';
import { useRestoreCreatorRights } from '../../hooks/creator-rights/useRestoreCreatorRights';

type RestoreCreatorRightsButtonProps = {
  trackId: string;
  creatorUserId: string;
  onRestored?: () => void;
};

export function RestoreCreatorRightsButton({ trackId, creatorUserId, onRestored }: RestoreCreatorRightsButtonProps) {
  const { restoreCreatorRights, loading, error } = useRestoreCreatorRights();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRestore = async () => {
    const result = await restoreCreatorRights({
      entityType: 'track',
      entityId: trackId,
      creatorUserId,
    });

    if (result !== null) {
      setShowConfirm(false);
      if (onRestored) {
        onRestored();
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
          onClick={handleRestore}
          disabled={loading}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Restoring...' : 'Confirm Restore'}
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
      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      Restore Creator Rights
    </button>
  );
}
