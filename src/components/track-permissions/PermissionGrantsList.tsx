/**
 * Permission Grants List Section
 * 
 * Phase 4.1: Section component that displays entity permission grants
 * 
 * Responsibilities:
 * - Uses useEntityPermissions hook
 * - Displays current grants
 * - No permission logic
 */

import { useEntityPermissions } from '../../hooks/permissions/useEntityPermissions';
import type { EntityPermissionGrant } from '../../lib/permissions/entityGrantsService';
import { RevokePermissionButton } from './RevokePermissionButton';

type PermissionGrantsListProps = {
  trackId: string;
};

export function PermissionGrantsList({ trackId }: PermissionGrantsListProps) {
  const { data: grants, loading, error, refresh } = useEntityPermissions({
    entityType: 'track',
    entityId: trackId,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!grants || grants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No permission grants found. Grant permissions to users or groups to get started.</p>
      </div>
    );
  }

  const activeGrants = grants.filter((grant) => !grant.revokedAt);
  const revokedGrants = grants.filter((grant) => grant.revokedAt);

  return (
    <div className="space-y-6">
      {activeGrants.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Permissions</h2>
          <div className="space-y-4">
            {activeGrants.map((grant) => (
              <GrantItem key={grant.id} grant={grant} onRevoked={refresh} />
            ))}
          </div>
        </div>
      )}

      {revokedGrants.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revoked Permissions</h2>
          <div className="space-y-4">
            {revokedGrants.map((grant) => (
              <GrantItem key={grant.id} grant={grant} onRevoked={refresh} isRevoked />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type GrantItemProps = {
  grant: EntityPermissionGrant;
  onRevoked?: () => void;
  isRevoked?: boolean;
};

function GrantItem({ grant, onRevoked, isRevoked }: GrantItemProps) {
  const subjectLabel = grant.subjectType === 'user' ? 'User' : 'Group';
  const roleLabel = grant.permissionRole.charAt(0).toUpperCase() + grant.permissionRole.slice(1);

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${isRevoked ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{subjectLabel}:</span>
            <span className="text-sm text-gray-900">{grant.subjectId}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-medium text-gray-700">Role:</span>
            <span className="text-sm text-gray-900">{roleLabel}</span>
          </div>
          {grant.revokedAt && (
            <div className="mt-2 text-sm text-gray-500">
              Revoked on {new Date(grant.revokedAt).toLocaleDateString()}
            </div>
          )}
        </div>
        {!isRevoked && (
          <div>
            <RevokePermissionButton grantId={grant.id} onRevoked={onRevoked} />
          </div>
        )}
      </div>
    </div>
  );
}
