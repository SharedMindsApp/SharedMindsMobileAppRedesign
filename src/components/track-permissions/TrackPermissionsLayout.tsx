/**
 * Track Permissions Layout
 * 
 * Phase 4.1: Permission-aware layout for track permissions management
 * Phase 4.2: Extended with creator rights section
 * 
 * Responsibilities:
 * - Feature flag check (ENABLE_ENTITY_GRANTS)
 * - Section-level permission check (useCanEditTrack)
 * - Structural gating of permission management section
 * - Feature flag check for creator rights (ENABLE_CREATOR_RIGHTS)
 */

import { ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS } from '../../lib/featureFlags';
import { useCanEditTrack } from '../../hooks/permissions/useCanEditTrack';

type TrackPermissionsLayoutProps = {
  trackId: string;
  children: React.ReactNode;
  grantPermissionSection?: React.ReactNode;
  creatorRightsSection?: React.ReactNode;
};

export function TrackPermissionsLayout({ trackId, children, grantPermissionSection, creatorRightsSection }: TrackPermissionsLayoutProps) {
  if (!ENABLE_ENTITY_GRANTS) {
    return null;
  }

  const { canEdit, loading } = useCanEditTrack(trackId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Track Permissions</h1>
        {ENABLE_CREATOR_RIGHTS && canEdit && creatorRightsSection && (
          <div className="mb-8">
            {creatorRightsSection}
          </div>
        )}
        {canEdit && grantPermissionSection && (
          <div className="mb-8">
            {grantPermissionSection}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
