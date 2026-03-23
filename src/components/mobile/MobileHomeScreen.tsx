import { useState, useEffect } from 'react';
import { AppIcon } from './AppIcon';
import { getMobileAppLayout, getMobileFolders, initializeDefaultAppLayout, batchUpdateAppPositions, getProfileIdFromAuthUserId } from '../../lib/mobileApps';
import { useAuth } from '../../contexts/AuthContext';
import type { AppIconConfig } from '../../lib/mobileTypes';
import { APP_METADATA } from '../../lib/mobileTypes';
import { ChevronLeft } from 'lucide-react';

interface MobileHomeScreenProps {
  onAppOpen: (appType: string, widgetId?: string) => void;
}

export function MobileHomeScreen({ onAppOpen }: MobileHomeScreenProps) {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppIconConfig[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const APPS_PER_PAGE = 16;
  const GRID_COLS = 4;
  const GRID_ROWS = 4;

  useEffect(() => {
    if (user) {
      loadApps();
    }
  }, [user]);

  const loadApps = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const profileId = await getProfileIdFromAuthUserId(user.id);
      if (!profileId) {
        console.error('No profile found for user');
        setLoading(false);
        return;
      }

      await initializeDefaultAppLayout(profileId);

      const layout = await getMobileAppLayout(profileId);
      const folders = await getMobileFolders(profileId);

      const appConfigs: AppIconConfig[] = layout.map(item => {
        const metadata = APP_METADATA[item.app_type];
        return {
          id: item.id,
          type: item.app_type,
          name: metadata?.name || 'App',
          icon: metadata?.icon || 'Square',
          color: metadata?.color || 'bg-gray-500',
          widgetId: item.widget_id || undefined,
          folderId: item.folder_id || undefined,
          // Phase 9A: No badge unless real data exists
          badge: undefined
        };
      });

      setApps(appConfigs);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppTap = (app: AppIconConfig) => {
    if (isEditMode) {
      setIsEditMode(false);
      return;
    }
    onAppOpen(app.type, app.widgetId);
  };

  const handleAppLongPress = () => {
    setIsEditMode(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }

    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const totalPages = Math.ceil(apps.length / APPS_PER_PAGE);
  const currentApps = apps.slice(
    currentPage * APPS_PER_PAGE,
    (currentPage + 1) * APPS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 px-6 pt-16 pb-8">
        <div
          className="h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentPage * 100}%)`
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-4 gap-x-4 gap-y-8 auto-rows-min">
            {currentApps.map((app) => (
              <AppIcon
                key={app.id}
                app={app}
                onTap={() => handleAppTap(app)}
                onLongPress={handleAppLongPress}
                isEditMode={isEditMode}
              />
            ))}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pb-6">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentPage
                  ? 'bg-gray-900 w-6'
                  : 'bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {isEditMode && (
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsEditMode(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold text-sm shadow-lg hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
