/**
 * Personal Spaces Goal Tracker Widget (Thin Wrapper)
 * 
 * Shell component for Personal Spaces context. Contains ZERO business logic.
 * Only resolves permissions and passes props to GoalTrackerCore.
 */

import { useAuth } from '../../../contexts/AuthContext';
import { GoalTrackerCore, type GoalTrackerContext } from '../../activities/goals/GoalTrackerCore';
import type { PermissionFlags } from '../../../lib/permissions/types';

export interface GoalTrackerWidgetProps {
  layout?: 'full' | 'compact';
}

export function GoalTrackerWidget({ layout = 'compact' }: GoalTrackerWidgetProps) {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-gray-500">Please sign in to view goals.</div>;
  }

  // Personal Spaces context: user owns their own goals
  const context: GoalTrackerContext = {
    mode: 'personal_space',
    scope: 'self',
  };

  // Full permissions for own goals in personal spaces
  const permissions: PermissionFlags = {
    can_view: true,
    can_comment: false,
    can_edit: true,
    can_manage: true,
    detail_level: 'detailed',
    scope: 'this_only',
  };

  return (
    <GoalTrackerCore
      ownerUserId={user.id}
      context={context}
      permissions={permissions}
      layout={layout}
    />
  );
}






