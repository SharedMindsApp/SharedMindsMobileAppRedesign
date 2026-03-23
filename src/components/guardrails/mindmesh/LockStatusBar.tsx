/**
 * Lock Status Bar - Canvas Lock Awareness UI
 *
 * Displays current lock status and provides explicit lock controls.
 * Shows:
 * - Who has the lock
 * - Acquire/Release buttons
 * - Lock expiry information
 *
 * Rules:
 * - No automatic lock acquisition
 * - No retry logic
 * - Errors shown verbatim
 * - Buttons disabled appropriately
 */

import { Lock, Unlock, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { MindMeshCanvasLock } from '../../../hooks/useMindMesh';

interface LockStatusBarProps {
  lock: MindMeshCanvasLock | null;
  onAcquireLock: () => void;
  onReleaseLock: () => void;
  executing: boolean;
  error: string | null;
}

export function LockStatusBar({
  lock,
  onAcquireLock,
  onReleaseLock,
  executing,
  error,
}: LockStatusBarProps) {
  const { user } = useAuth();

  const isLockHolder = lock && user && lock.user_id === user.id;
  const isLockExpired = lock && new Date(lock.expires_at) < new Date();

  const getLockStatusText = (): string => {
    if (!lock) {
      return 'Canvas unlocked';
    }

    if (isLockExpired) {
      return 'Lock expired';
    }

    if (isLockHolder) {
      return 'You have the lock';
    }

    return 'Locked by another user';
  };

  const getLockStatusColor = (): string => {
    if (!lock || isLockExpired) {
      return 'bg-gray-50 border-gray-300 text-gray-700';
    }

    if (isLockHolder) {
      return 'bg-green-50 border-green-300 text-green-700';
    }

    return 'bg-amber-50 border-amber-300 text-amber-700';
  };

  const canAcquire = !lock || isLockExpired || isLockHolder;
  const canRelease = isLockHolder && !isLockExpired;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
      {/* Lock Status */}
      <div className={`flex items-center gap-2 px-3 py-1.5 border rounded ${getLockStatusColor()}`}>
        {isLockHolder ? (
          <Lock size={16} />
        ) : lock && !isLockExpired ? (
          <User size={16} />
        ) : (
          <Unlock size={16} />
        )}
        <span className="text-sm font-medium">{getLockStatusText()}</span>
      </div>

      {/* Lock Expiry Info */}
      {lock && !isLockExpired && (
        <span className="text-xs text-gray-500">
          Expires {new Date(lock.expires_at).toLocaleTimeString()}
        </span>
      )}

      {/* Lock Controls */}
      <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
        <button
          onClick={onAcquireLock}
          disabled={executing || (!canAcquire)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
          title={canAcquire ? 'Acquire lock to edit canvas' : 'Cannot acquire lock while another user has it'}
        >
          <Lock size={14} />
          Acquire Lock
        </button>

        <button
          onClick={onReleaseLock}
          disabled={executing || !canRelease}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
          title={canRelease ? 'Release lock' : 'You must hold the lock to release it'}
        >
          <Unlock size={14} />
          Release Lock
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-300 rounded max-w-sm">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-600 truncate">{error}</span>
        </div>
      )}
    </div>
  );
}
