import { ChevronLeft, Home, MoreVertical } from 'lucide-react';
import { getMobileAppConfig, type MobileAppId } from '../../lib/mobileAppsRegistry';

interface MobileAppShellProps {
  appId: MobileAppId;
  widgetId?: string;
  householdId?: string;
  onClose: () => void;
  onBackToHome: () => void;
  openApp: (appId: MobileAppId, widgetId?: string) => void;
}

export function MobileAppShell({
  appId,
  widgetId,
  householdId,
  onClose,
  onBackToHome,
  openApp
}: MobileAppShellProps) {
  const appConfig = getMobileAppConfig(appId);

  if (!appConfig) {
    return (
      <div className="h-full w-full bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 mb-2">App Not Found</p>
          <p className="text-gray-600 mb-4">The requested app could not be loaded.</p>
          <button
            onClick={onBackToHome}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const AppComponent = appConfig.component;

  return (
    <div className="h-full w-full bg-white flex flex-col animate-slideInRight">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>

        <h1 className="text-lg font-semibold text-gray-900 truncate mx-2">
          {appConfig.name}
        </h1>

        <div className="flex items-center gap-1">
          <button
            onClick={onBackToHome}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Home"
          >
            <Home size={20} className="text-gray-700" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical size={20} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AppComponent
          householdId={householdId}
          widgetId={widgetId}
          onClose={onClose}
          openApp={openApp}
        />
      </div>
    </div>
  );
}
