/**
 * Shared Spaces Habit Tracker Widget (Thin Wrapper)
 * 
 * Shell component for Shared Spaces context. Contains ZERO business logic.
 * Only resolves permissions and passes props to HabitTrackerCore.
 * 
 * Respects PermissionFlags from shared space sharing rules.
 */

import { useAuth } from '../../../contexts/AuthContext';
import { HabitTrackerCore, type HabitTrackerContext } from '../../activities/habits/HabitTrackerCore';
import type { PermissionFlags } from '../../../lib/permissions/types';

export interface HabitTrackerWidgetProps {
  ownerUserId: string;
  permissions: PermissionFlags;
  layout?: 'full' | 'compact';
}

export function HabitTrackerWidget({
  ownerUserId,
  permissions,
  layout = 'compact',
}: HabitTrackerWidgetProps) {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-gray-500">Please sign in to view habits.</div>;
  }

  // Shared Spaces context: viewing someone else's habits
  const context: HabitTrackerContext = {
    mode: 'shared_space',
    scope: 'shared',
  };

  // Permissions come from shared space sharing rules
  // Core component will enforce: can_view, can_edit, detail_level

  return (
    <HabitTrackerCore
      ownerUserId={ownerUserId}
      context={context}
      permissions={permissions}
      layout={layout}
    />
  );
}






