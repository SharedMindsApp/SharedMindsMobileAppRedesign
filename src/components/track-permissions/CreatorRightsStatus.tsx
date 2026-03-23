/**
 * Creator Rights Status
 * 
 * Phase 4.2: Read-only component displaying creator rights status
 * 
 * Responsibilities:
 * - Uses useCreatorRights hook
 * - Displays creator identity and status
 * - Read-only, informational only
 */

import { useCreatorRights } from '../../hooks/creator-rights/useCreatorRights';
import { useAuth } from '../../contexts/AuthContext';

type CreatorRightsStatusProps = {
  trackId: string;
  creatorUserId: string;
};

export function CreatorRightsStatus({ trackId, creatorUserId }: CreatorRightsStatusProps) {
  const { profile } = useAuth();
  const { data: isRevoked, loading, error } = useCreatorRights({
    entityType: 'track',
    entityId: trackId,
    creatorUserId,
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">Unable to load creator rights status</p>
      </div>
    );
  }

  const statusLabel = isRevoked ? 'Revoked' : 'Active';
  const statusColor = isRevoked ? 'text-red-600' : 'text-green-600';
  const isCurrentUser = profile?.id === creatorUserId;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">Creator:</span>
            <span className="text-sm text-gray-900">
              {isCurrentUser ? 'You' : creatorUserId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
