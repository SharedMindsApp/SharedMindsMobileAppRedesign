import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Smartphone, Home, Users, MessageCircle, Settings } from 'lucide-react';
import { MobilePhoneFrame } from './MobilePhoneFrame';
import { MobileHomeScreen } from './MobileHomeScreen';
import { AppViewRenderer } from './AppViewRenderer';
import { useAuth } from '../../contexts/AuthContext';
import { getUserUIMode, setUserUIMode } from '../../lib/mobileApps';
import type { AppType, UIMode } from '../../lib/mobileTypes';

interface MobileModeContainerProps {
  showHeader?: boolean;
}

export function MobileModeContainer({ showHeader = true }: MobileModeContainerProps) {
  const [openApp, setOpenApp] = useState<{ type: AppType; widgetId?: string } | null>(null);
  const [uiMode, setUIMode] = useState<UIMode>('mobile');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadUIMode();
  }, [user]);

  const loadUIMode = async () => {
    if (!user) return;

    try {
      const mode = await getUserUIMode(user.id);
      setUIMode(mode);
    } catch (err) {
      console.error('Error loading UI mode:', err);
      const savedMode = localStorage.getItem('ui_mode') as UIMode;
      if (savedMode) {
        setUIMode(savedMode);
      }
    }
  };

  const saveLastOpenedApp = (appType: string, widgetId?: string) => {
    if (!user) return;

    const lastAppKey = `last_mobile_app_${user.id}`;
    localStorage.setItem(lastAppKey, JSON.stringify({ appType, widgetId }));
  };

  const handleUIModeToggle = async (mode: UIMode) => {
    if (!user) return;

    try {
      await setUserUIMode(user.id, mode);
      setUIMode(mode);
      localStorage.setItem('ui_mode', mode);

      if (mode === 'mobile') {
        navigate('/mobile');
      } else {
        navigate('/planner');
      }
    } catch (err) {
      console.error('Error setting UI mode:', err);
      localStorage.setItem('ui_mode', mode);
      setUIMode(mode);

      if (mode === 'mobile') {
        navigate('/mobile');
      } else {
        navigate('/planner');
      }
    }
  };

  const handleAppOpen = (appType: string, widgetId?: string) => {
    setOpenApp({ type: appType as AppType, widgetId });
    saveLastOpenedApp(appType, widgetId);
  };

  const handleAppClose = () => {
    setOpenApp(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {showHeader && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-blue-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleUIModeToggle('fridge')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      uiMode === 'fridge'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    <span>Widget Mode</span>
                  </button>
                  <button
                    onClick={() => handleUIModeToggle('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      uiMode === 'mobile'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone size={16} />
                    <span>Mobile Mode</span>
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Home size={16} />
                    Dashboard
                  </button>

                  <button
                    onClick={() => navigate('/planner')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Users size={16} />
                    Spaces
                  </button>

                  <button
                    onClick={() => navigate('/messages')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <MessageCircle size={16} />
                    Messages
                  </button>

                  <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={showHeader ? "pt-14" : ""}>
        <MobilePhoneFrame>
          {openApp ? (
            <AppViewRenderer
              appType={openApp.type}
              widgetId={openApp.widgetId}
              onClose={handleAppClose}
            />
          ) : (
            <MobileHomeScreen onAppOpen={handleAppOpen} />
          )}
        </MobilePhoneFrame>
      </div>
    </div>
  );
}
