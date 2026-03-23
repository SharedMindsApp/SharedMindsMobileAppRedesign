/**
 * Team Groups Route Guard
 * 
 * Phase 4.0: Route-level permission guard for /teams/:teamId/groups
 * 
 * Responsibilities:
 * - Checks route-level permission (canUserAccessTeam)
 * - Prevents rendering until permission is confirmed
 * - Redirects unauthorized users
 * - Shows skeleton while loading
 */

import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCanAccessTeam } from '../../hooks/groups/useCanAccessTeam';

type TeamGroupsRouteGuardProps = {
  children: React.ReactNode;
};

export function TeamGroupsRouteGuard({ children }: TeamGroupsRouteGuardProps) {
  const { teamId } = useParams<{ teamId: string }>();

  if (!teamId) {
    return <Navigate to="/" replace />;
  }

  const { canAccess, loading } = useCanAccessTeam(teamId);

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
