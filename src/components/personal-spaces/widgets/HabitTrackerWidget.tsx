/**
 * Personal Spaces Habit Tracker Widget (Thin Wrapper)
 * 
 * Shell component for Personal Spaces context. Contains ZERO business logic.
 * Only resolves permissions and passes props to HabitTrackerCore.
 */

import { useAuth } from '../../../contexts/AuthContext';
import { HabitTrackerCore, type HabitTrackerContext } from '../../activities/habits/HabitTrackerCore';
import type { PermissionFlags } from '../../../lib/permissions/types';

export interface HabitTrackerWidgetProps {
  layout?: 'full' | 'compact';
}

export function HabitTrackerWidget({ layout = 'compact' }: HabitTrackerWidgetProps) {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-gray-500">Please sign in to view habits.</div>;
  }

  // Personal Spaces context: user owns their own habits
  const context: HabitTrackerContext = {
    mode: 'personal_space',
    scope: 'self',
  };

  // Full permissions for own habits in personal spaces
  const permissions: PermissionFlags = {
    can_view: true,
    can_comment: false,
    can_edit: true,
    can_manage: true,
    detail_level: 'detailed',
    scope: 'this_only',
  };

  return (
    <HabitTrackerCore
      ownerUserId={user.id}
      context={context}
      permissions={permissions}
      layout={layout}
    />
  );
}






