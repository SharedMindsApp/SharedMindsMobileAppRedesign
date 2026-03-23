import { useEffect, useState } from 'react';
import type { AppType } from '../../lib/mobileTypes';
import { MobileAppShell } from './MobileAppShell';
import { getMobileAppConfig, type MobileAppId } from '../../lib/mobileAppsRegistry';
import { useAuth } from '../../contexts/AuthContext';
import { getUserHousehold } from '../../lib/household';

interface AppViewRendererProps {
  appType: AppType;
  widgetId?: string;
  onClose: () => void;
}

export function AppViewRenderer({ appType, widgetId, onClose }: AppViewRendererProps) {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string>();

  useEffect(() => {
    loadHousehold();
  }, [user]);

  const loadHousehold = async () => {
    if (!user) return;

    try {
      const household = await getUserHousehold();
      if (household) {
        setHouseholdId(household.id);
      }
    } catch (err) {
      console.error('Error loading household:', err);
    }
  };

  const handleOpenApp = (appId: MobileAppId, newWidgetId?: string) => {
    console.log('Opening app:', appId, newWidgetId);
  };

  const handleBackToHome = () => {
    onClose();
  };

  const appConfig = getMobileAppConfig(appType as MobileAppId);

  if (!appConfig) {
    return (
      <div className="h-full w-full bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-xl font-bold text-gray-900 mb-2">App Not Found</p>
          <p className="text-gray-600 mb-4">
            The app type "{appType}" is not registered in the system.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <MobileAppShell
      appId={appType as MobileAppId}
      widgetId={widgetId}
      householdId={householdId}
      onClose={onClose}
      onBackToHome={handleBackToHome}
      openApp={handleOpenApp}
    />
  );
}
