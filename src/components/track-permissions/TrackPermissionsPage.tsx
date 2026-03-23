/**
 * Track Permissions Page
 * 
 * Phase 4.1: Composition-only page component
 * 
 * Responsibilities:
 * - Composition only
 * - No permission checks
 * - No feature flag checks
 * - No API calls directly
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrackPermissionsLayout } from './TrackPermissionsLayout';
import { PermissionGrantsList } from './PermissionGrantsList';
import { GrantPermissionSection } from './GrantPermissionSection';
import { CreatorRightsSection } from './CreatorRightsSection';

export function TrackPermissionsPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!trackId) {
    return null;
  }

  const handlePermissionGranted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleRightsChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <TrackPermissionsLayout
      trackId={trackId}
      creatorRightsSection={<CreatorRightsSection trackId={trackId} onRightsChanged={handleRightsChanged} />}
      grantPermissionSection={<GrantPermissionSection trackId={trackId} onPermissionGranted={handlePermissionGranted} />}
    >
      <PermissionGrantsList key={refreshKey} trackId={trackId} />
    </TrackPermissionsLayout>
  );
}
