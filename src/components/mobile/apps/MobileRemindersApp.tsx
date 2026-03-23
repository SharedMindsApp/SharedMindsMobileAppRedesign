import { ReminderWidgetCore } from '../../shared/ReminderWidgetCore';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

export function MobileRemindersApp({ householdId, widgetId, onClose }: MobileAppProps) {
  return (
    <ReminderWidgetCore
      mode="mobile"
      householdId={householdId}
    />
  );
}
