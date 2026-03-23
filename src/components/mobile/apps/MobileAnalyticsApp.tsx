import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

export function MobileAnalyticsApp({ householdId, widgetId, onClose }: MobileAppProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Analytics</h2>
      <p className="text-gray-600">Mobile analytics coming soon...</p>
      {householdId && <p className="text-xs text-gray-400 mt-2">Household: {householdId}</p>}
      {widgetId && <p className="text-xs text-gray-400">Widget: {widgetId}</p>}
    </div>
  );
}
