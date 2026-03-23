/**
 * Creator Rights Section
 * 
 * Phase 4.2: Section component for creator rights management
 * 
 * Responsibilities:
 * - Container only
 * - No permission logic
 * - No feature flag logic
 * - Coordinates creator rights UI
 */

import { CreatorRightsStatus } from './CreatorRightsStatus';
import { RevokeCreatorRightsButton } from './RevokeCreatorRightsButton';
import { RestoreCreatorRightsButton } from './RestoreCreatorRightsButton';
import { useCreatorRights } from '../../hooks/creator-rights/useCreatorRights';
import { useTrackCreator } from '../../hooks/tracks/useTrackCreator';

type CreatorRightsSectionProps = {
  trackId: string;
  onRightsChanged?: () => void;
};

export function CreatorRightsSection({ trackId, onRightsChanged }: CreatorRightsSectionProps) {
  const { creatorId, loading: creatorLoading, error: creatorError } = useTrackCreator(trackId);
  const { data: isRevoked, loading: rightsLoading } = useCreatorRights({
    entityType: 'track',
    entityId: trackId,
    creatorUserId: creatorId || '',
  });

  if (creatorLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Creator Rights</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (creatorError || !creatorId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Creator Rights</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-yellow-800 text-sm">
            {creatorError ? 'Unable to load creator information' : 'No creator information available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Creator Rights</h2>
      
      <div className="space-y-4">
        <CreatorRightsStatus trackId={trackId} creatorUserId={creatorId} />
        
        {!rightsLoading && (
          <div className="flex items-center gap-3">
            {!isRevoked && (
              <RevokeCreatorRightsButton
                trackId={trackId}
                creatorUserId={creatorId}
                onRevoked={onRightsChanged}
              />
            )}
            {isRevoked && (
              <RestoreCreatorRightsButton
                trackId={trackId}
                creatorUserId={creatorId}
                onRestored={onRightsChanged}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
