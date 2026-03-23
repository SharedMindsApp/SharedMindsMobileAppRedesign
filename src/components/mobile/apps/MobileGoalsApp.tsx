import { GoalWidgetCore } from '../../shared/GoalWidgetCore';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

export function MobileGoalsApp({ householdId, widgetId, onClose }: MobileAppProps) {
  return (
    <GoalWidgetCore
      mode="mobile"
      householdId={householdId}
    />
  );
}
