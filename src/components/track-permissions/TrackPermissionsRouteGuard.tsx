/**
 * Track Permissions Route Guard
 * 
 * Phase 4.1: Route-level permission guard for /projects/:projectId/tracks/:trackId/permissions
 * 
 * Responsibilities:
 * - Checks route-level permission (canUserAccessTrack)
 * - Prevents rendering until permission is confirmed
 * - Redirects unauthorized users
 * - Shows skeleton while loading
 */

import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCanAccessTrack } from '../../hooks/permissions/useCanAccessTrack';

type TrackPermissionsRouteGuardProps = {
  children: React.ReactNode;
};

export function TrackPermissionsRouteGuard({ children }: TrackPermissionsRouteGuardProps) {
  const { trackId } = useParams<{ trackId: string }>();

  if (!trackId) {
    return <Navigate to="/" replace />;
  }

  const { canAccess, loading } = useCanAccessTrack(trackId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
