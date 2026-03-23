import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Users, MessageCircle, ChevronUp, Menu, LayoutGrid, Smartphone, User, ChevronDown, Target, Shield, LogOut, Sun, Moon, Zap, Check, BookOpen, Grid3x3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserUIMode, setUserUIMode } from '../../lib/mobileApps';
import type { UIMode } from '../../lib/mobileTypes';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { triggerGlitchTransition } from '../../lib/glitchTransition';
import { isStandaloneApp } from '../../lib/appContext';

interface CanvasHeaderProps {
  householdName?: string;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function CanvasHeader({ householdName, onMenuClick, isMobile: isMobileProp }: CanvasHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [uiMode, setUIMode] = useState<UIMode>('fridge');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { appTheme, setAppTheme } = useUIPreferences();

  // Phase 9A: Detect mobile/installed app
  useEffect(() => {
    if (isMobileProp !== undefined) {
      setIsMobile(isMobileProp);
      return;
    }
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || isStandaloneApp();
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileProp]);

  useEffect(() => {
    loadUIMode();
  }, [user, location.pathname, isMobile]); // Phase 9A: Reload when pathname or mobile state changes to sync state

  const loadUIMode = async () => {
    if (!user) return;

    // Phase 9A: On Spaces pages, sync uiMode with what's actually being shown (viewport-based)
    const isOnSpacesPage = location.pathname.startsWith('/spaces/personal') || 
                          (location.pathname.startsWith('/spaces/') && location.pathname !== '/spaces/shared' && !location.pathname.endsWith('/shared'));
    
    if (isOnSpacesPage) {
      // On Spaces pages, the view is determined by viewport, not database
      // Desktop = widget mode (fridge), Mobile = mobile mode
      const actualMode = isMobile ? 'mobile' : 'fridge';
      setUIMode(actualMode);
      return;
    }

    // Not on Spaces page - load from database
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

  // Switch back to app view (OS launcher) on mobile
  const handleSwitchToAppView = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('view'); // Remove view=canvas to go back to app view
    setSearchParams(newParams, { replace: true });
  };

  const handleUIModeToggle = async (mode: UIMode) => {
    if (!user || mode === uiMode) return;

    // Phase 9A: Check if we're on a Spaces page
    const isOnSpacesPage = location.pathname.startsWith('/spaces/personal') || 
                          (location.pathname.startsWith('/spaces/') && location.pathname !== '/spaces/shared' && !location.pathname.endsWith('/shared'));

    // Phase 9A: On desktop, widget mode is always shown for Spaces (no toggle needed)
    // On mobile, OS launcher is always shown (toggle is hidden)
    // So if we're on a Spaces page, the toggle shouldn't do anything
    if (isOnSpacesPage) {
      // Just update the state for consistency, but don't navigate or reload
      // The view is determined by viewport, not uiMode
      try {
        await setUserUIMode(user.id, mode);
        setUIMode(mode);
        localStorage.setItem('ui_mode', mode);
      } catch (err) {
        console.error('Error setting UI mode:', err);
        localStorage.setItem('ui_mode', mode);
        setUIMode(mode);
      }
      return;
    }

    triggerGlitchTransition(400);

    try {
      await setUserUIMode(user.id, mode);
      setUIMode(mode);
      localStorage.setItem('ui_mode', mode);

      // Not on Spaces page - navigate as before
      setTimeout(() => {
        if (mode === 'mobile') {
          navigate('/mobile');
        } else {
          navigate('/planner');
        }
      }, 200);
    } catch (err) {
      console.error('Error setting UI mode:', err);
      localStorage.setItem('ui_mode', mode);
      setUIMode(mode);

      setTimeout(() => {
        if (mode === 'mobile') {
          navigate('/mobile');
        } else {
          navigate('/planner');
        }
      }, 200);
    }
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Mobile app view button in collapsed state */}
        {isMobile && (location.pathname.startsWith('/spaces/personal') || (location.pathname.startsWith('/spaces/') && location.pathname !== '/spaces/shared' && !location.pathname.endsWith('/shared'))) && (
          <button
            onClick={handleSwitchToAppView}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-orange-200 hover:bg-white transition-all hover:scale-105"
            title="Switch to App View"
            aria-label="Switch to App View"
          >
            <Smartphone size={20} className="text-gray-700" />
          </button>
        )}
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-orange-200 hover:bg-white transition-all hover:scale-105"
          title="Show navigation"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-orange-200 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            {/* Mobile menu button */}
            {isMobile && onMenuClick && (
              <button
                onClick={onMenuClick}
                className="p-2 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Mobile app view button - switch back to OS launcher */}
            {isMobile && (location.pathname.startsWith('/spaces/personal') || (location.pathname.startsWith('/spaces/') && location.pathname !== '/spaces/shared' && !location.pathname.endsWith('/shared'))) && (
              <button
                onClick={handleSwitchToAppView}
                className="p-2 text-gray-700 hover:bg-orange-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Switch to App View"
                title="Switch to App View"
              >
                <Smartphone size={20} />
              </button>
            )}
            
            <div className="flex items-center gap-4">
              {/* Phase 9A: Hide mode toggle on mobile/installed app */}
              {!isMobile && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleUIModeToggle('fridge')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      uiMode === 'fridge'
                        ? 'bg-white text-orange-700 shadow-sm'
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
                        ? 'bg-white text-orange-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone size={16} />
                    <span>Mobile Mode</span>
                  </button>
                </div>
              )}

              {householdName && (
                <p className="text-xs text-gray-500 hidden sm:block">{householdName}</p>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <Home size={16} />
                Dashboard
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSpacesMenu(!showSpacesMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 transition-colors"
                >
                  <Users size={16} />
                  Spaces
                  <ChevronDown size={14} className={`transition-transform ${showSpacesMenu ? 'rotate-180' : ''}`} />
                </button>

                {showSpacesMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSpacesMenu(false)}
                    ></div>
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[500]">
                      <button
                        onClick={() => {
                          setShowSpacesMenu(false);
                          navigate('/spaces/personal');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <User size={16} />
                        Personal Space
                      </button>
                      <button
                        onClick={() => {
                          setShowSpacesMenu(false);
                          navigate('/spaces/shared');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Users size={16} />
                        Shared Spaces
                      </button>
                      <button
                        onClick={() => {
                          setShowSpacesMenu(false);
                          navigate('/guardrails');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Target size={16} />
                        Teams
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => navigate('/guardrails')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <Target size={16} />
                Guardrails
              </button>

              <button
                onClick={() => navigate('/planner')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
              >
                <BookOpen size={16} />
                Planner
              </button>

              <button
                onClick={() => navigate('/regulation')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <Shield size={16} />
                Regulation
              </button>

              <button
                onClick={() => navigate('/messages')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <MessageCircle size={16} />
                Messages
              </button>

            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            title="Hide navigation"
          >
            <ChevronUp size={14} />
            <span className="hidden sm:inline">Hide</span>
          </button>
        </div>
      </div>
    </div>
  );
}
