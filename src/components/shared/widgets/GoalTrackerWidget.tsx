/**
 * Shared Spaces Goal Tracker Widget (Thin Wrapper)
 * 
 * Shell component for Shared Spaces context. Contains ZERO business logic.
 * Only resolves permissions and passes props to GoalTrackerCore.
 * 
 * Respects PermissionFlags from shared space sharing rules.
 */

import { useAuth } from '../../../contexts/AuthContext';
import { GoalTrackerCore, type GoalTrackerContext } from '../../activities/goals/GoalTrackerCore';
import type { PermissionFlags } from '../../../lib/permissions/types';

export interface GoalTrackerWidgetProps {
  ownerUserId: string;
  permissions: PermissionFlags;
  layout?: 'full' | 'compact';
}

export function GoalTrackerWidget({
  ownerUserId,
  permissions,
  layout = 'compact',
}: GoalTrackerWidgetProps) {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-gray-500">Please sign in to view goals.</div>;
  }

  // Shared Spaces context: viewing someone else's goals
  const context: GoalTrackerContext = {
    mode: 'shared_space',
    scope: 'shared',
  };

  // Permissions come from shared space sharing rules
  // Core component will enforce: can_view, can_edit, detail_level

  return (
    <GoalTrackerCore
      ownerUserId={ownerUserId}
      context={context}
      permissions={permissions}
      layout={layout}
    />
  );
}






