import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, LogOut, Shield, Eye, X, MessageCircle, Brain, Users, Target, User, ChevronDown, Zap, Sun, Moon, Check, Calendar, MoreHorizontal, Settings, Activity, BookOpen, Menu, Package } from 'lucide-react';
import { ToastContainer, useToasts } from './Toast';
import { getUserHousehold, Household } from '../lib/household';
import { signOut } from '../lib/auth';
import { useAuth } from '../core/auth/AuthProvider';
import { useViewAs } from '../contexts/ViewAsContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
// SpaceSwitcher removed — replaced by SharedMinds brand text in header
// Cleaned duplicate and missing imports
import { getUserUIMode } from '../lib/mobileApps';
import type { UIMode } from '../lib/mobileTypes';
import type { AppTheme, NavigationTabId } from '../lib/uiPreferencesTypes';
import { ALL_NAVIGATION_TABS, DEFAULT_FAVOURITE_NAV_TABS } from '../lib/uiPreferencesTypes';
import { RegulationNotificationBanner } from './guardrails/regulation/RegulationNotificationBanner';
import { FloatingAIChatWidget } from './ai-chat/FloatingAIChatWidget';
import { FEATURE_AI_CHAT_WIDGET } from '../lib/featureFlags';
import { OfflineIndicator } from './OfflineIndicator';
import { AppUpdateBanner } from './system/AppUpdateBanner';
import { NotificationBell } from './notifications/NotificationBell';
// SharedSpaceSwitcher removed — replaced by brand text
import { SharedSpacesManagementPanel } from './shared/SharedSpacesManagementPanel';
import { CreateSpaceModal } from './shared/CreateSpaceModal';

type LayoutProps = {
  children: React.ReactNode;
};

const ICON_MAP: Record<string, any> = {
  Home,
  Brain,
  Users,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  FileText,
  Shield,
  Activity,
  Settings,
  BookOpen,
  Package,
};

export function Layout({ children }: LayoutProps) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [createSpaceType, setCreateSpaceType] = useState<'household' | 'team' | undefined>();
  const [uiMode, setUIMode] = useState<UIMode>('fridge');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, isAdmin, canAccessPantry } = useAuth();
  const role = profile?.role || 'free';
  const isViewingAs = false;
  const { clearViewAs } = useViewAs();
  const { config, updatePreferences } = useUIPreferences();
  const { toasts, dismissToast } = useToasts();

  const spacesMenuButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null);
  const spacesMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [spacesMenuPosition, setSpacesMenuPosition] = useState({ top: 0, left: 0 });
  const [moreMenuPosition, setMoreMenuPosition] = useState({ top: 0, right: 0 });

  // Mobile detection for hiding AI chat widget
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dropdown positions
  useEffect(() => {
    if (showSpacesMenu && spacesMenuButtonRef.current) {
      const rect = spacesMenuButtonRef.current.getBoundingClientRect();
      setSpacesMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [showSpacesMenu]);

  useEffect(() => {
    if (showMoreMenu && moreMenuButtonRef.current) {
      const rect = moreMenuButtonRef.current.getBoundingClientRect();
      setMoreMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMoreMenu]);

  useEffect(() => {
    loadHousehold();
    loadUIMode();
  }, [user]);

  const loadHousehold = async () => {
    try {
      const householdData = await getUserHousehold();
      setHousehold(householdData);
    } catch (err) {
      console.error('Error loading household:', err);
    }
  };

  const loadUIMode = async () => {
    if (!user) return;

    try {
      const mode = await getUserUIMode(user.id);
      setUIMode(mode);

      if (mode === 'mobile' && location.pathname === '/household') {
        navigate('/mobile');
      }
    } catch (err) {
      console.error('Error loading UI mode:', err);
      const savedMode = localStorage.getItem('ui_mode') as UIMode;
      if (savedMode) {
        setUIMode(savedMode);
      }
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/auth/login');
  };

  const handleThemeChange = (theme: AppTheme) => {
    updatePreferences({ appTheme: theme });
    // Settings menu removed - theme changes are handled in left navigation menu
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isSpacesActive = () => {
    return location.pathname === '/household' ||
      location.pathname === '/spaces/personal' ||
      location.pathname === '/spaces/shared' ||
      location.pathname.startsWith('/spaces/');
  };

  const favouriteNavTabs = config.favouriteNavTabs || DEFAULT_FAVOURITE_NAV_TABS;

  const availableTabs = ALL_NAVIGATION_TABS.filter((tab) => {
    if (tab.requiresAdmin && !isAdmin) return false;
    if (tab.requiresPantryAccess && !canAccessPantry) return false;
    return true;
  });

  const favouriteTabs = availableTabs.filter((tab) =>
    favouriteNavTabs.includes(tab.id)
  );

  const moreTabs = availableTabs.filter((tab) =>
    !favouriteNavTabs.includes(tab.id)
  );

  const isTabActive = (tabPath: string) => {
    return location.pathname === tabPath || location.pathname.startsWith(`${tabPath}/`);
  };

  // Notification bell visibility guard
  const shouldShowNotificationBell = () => {
    const hiddenPaths = [
      '/auth/',
      '/onboarding/',
      '/brain-profile/onboarding',
      '/journey',
      '/guardrails/wizard',
    ];

    // Hide on auth and onboarding pages
    if (hiddenPaths.some((path) => location.pathname.startsWith(path))) {
      return false;
    }

    // Hide on landing and how-it-works
    if (location.pathname === '/' || location.pathname === '/how-it-works') {
      return false;
    }

    return true;
  };

  const renderNavTab = (tab: typeof ALL_NAVIGATION_TABS[0]) => {
    const Icon = ICON_MAP[tab.icon];

    return (
      <button
        key={tab.id}
        onClick={() => navigate(tab.path)}
        className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${isTabActive(tab.path)
          ? 'bg-primary/[0.07] text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low active:bg-surface-container'
          }`}
      >
        <Icon size={16} className="lg:w-[18px] lg:h-[18px]" />
        <span className="hidden lg:inline">{tab.label}</span>
      </button>
    );
  };

  // Hide header on Spaces pages (they have their own headers)
  const isSpacesPage = location.pathname.startsWith('/spaces/personal') ||
    (location.pathname.startsWith('/spaces/') &&
      location.pathname !== '/spaces/shared' &&
      !location.pathname.endsWith('/shared'));

  return (
    <div className="min-h-screen-safe bg-surface" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowY: 'visible' }}>
      {!isSpacesPage && (
        <nav className={`overflow-x-hidden overflow-y-visible fixed top-0 inset-x-0 z-50 backdrop-blur-xl ${config.appTheme === 'dark'
          ? 'bg-gray-900/92 border-b border-gray-700/40'
          : config.appTheme === 'neon-dark'
            ? 'bg-gray-950/92 border-b border-cyan-500/15'
            : 'bg-white/88 border-b border-outline-variant/15'
          }`}
          style={{
            boxShadow: '0 4px 24px rgba(15, 23, 42, 0.04)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16 min-h-[56px]">
              <div className="flex items-center gap-2 sm:gap-4 md:gap-8 flex-1 min-w-0">
                {/* Mobile hamburger menu button */}
                <button
                  type="button"
                  className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors flex-shrink-0 ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  aria-label="Open navigation"
                  onClick={() => setShowMobileMenu(true)}
                >
                  <Menu size={22} strokeWidth={1.75} />
                </button>

                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Logo Icon */}
                  <img
                    src="/icon-192.png"
                    alt="SharedMinds"
                    className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
                  />
                  <span
                    className={`text-base sm:text-lg font-bold tracking-tight truncate ${
                      config.appTheme === 'dark'
                        ? 'text-white'
                        : config.appTheme === 'neon-dark'
                          ? 'text-cyan-50'
                          : ''
                    }`}
                    style={{ fontFamily: "'Manrope', sans-serif", ...(config.appTheme === 'light' ? { color: '#2e3336' } : {}) }}
                  >
                    SharedMinds
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  {favouriteTabs.map((tab) => renderNavTab(tab))}

                  {moreTabs.length > 0 && (
                    <div className="relative">
                      <button
                        ref={moreMenuButtonRef}
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50"
                      >
                        <MoreHorizontal size={16} className="lg:w-[18px] lg:h-[18px]" />
                        <span className="hidden lg:inline">More</span>
                        <ChevronDown size={14} className={`transition-transform lg:w-4 lg:h-4 ${showMoreMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showMoreMenu && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[90]"
                            onClick={() => setShowMoreMenu(false)}
                          ></div>
                          <div
                            ref={moreMenuRef}
                            className={`fixed w-56 rounded-lg shadow-xl border py-2 z-[95] ${config.appTheme === 'dark'
                              ? 'bg-gray-800 border-gray-700'
                              : config.appTheme === 'neon-dark'
                                ? 'bg-gray-900 border-gray-800'
                                : 'bg-white border-gray-200'
                              }`}
                            style={{
                              top: `${moreMenuPosition.top}px`,
                              right: `${moreMenuPosition.right}px`,
                            }}
                          >
                            {moreTabs.map((tab) => {
                              const Icon = ICON_MAP[tab.icon];
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => {
                                    setShowMoreMenu(false);
                                    navigate(tab.path);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${isTabActive(tab.path)
                                    ? config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                                      ? 'text-blue-400 bg-blue-900/30'
                                      : 'text-blue-700 bg-blue-50'
                                    : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                                      ? 'text-gray-200 hover:bg-gray-700'
                                      : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                  <Icon size={16} />
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center flex-shrink-0">
                {shouldShowNotificationBell() && <NotificationBell />}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Spacer to offset fixed header — height matches nav bar at each breakpoint */}
      {!isSpacesPage && (
        <div
          className="w-full h-14 sm:h-16"
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="core-mobile-sidebar-backdrop md:hidden"
            aria-label="Close navigation"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Drawer - Theme-aware styling with slide-in animation */}
          <div className={`core-mobile-sidebar md:hidden overflow-y-auto ${config.appTheme === 'dark'
            ? 'bg-gray-900'
            : config.appTheme === 'neon-dark'
              ? 'bg-gray-950'
              : 'bg-white'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                  ? 'text-white'
                  : 'text-gray-900'
                  }`}>Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2">
                {availableTabs.map((tab) => {
                  const Icon = ICON_MAP[tab.icon];
                  const active = isTabActive(tab.path);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setShowMobileMenu(false);
                        navigate(tab.path);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${active
                        ? config.appTheme === 'neon-dark'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : config.appTheme === 'dark'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-primary/[0.07] text-primary font-semibold'
                        : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                          ? 'text-gray-300 hover:bg-gray-800/60 active:bg-gray-700/60'
                          : 'text-on-surface hover:bg-surface-container-low active:bg-surface-container'
                        }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {Icon && <Icon size={20} />}
                      {tab.label}
                    </button>
                  );
                })}

                <div className={`border-t my-4 ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                  ? 'border-gray-700'
                  : 'border-gray-200'
                  }`}></div>

                <div className="px-4 py-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-400'
                    : 'text-gray-500'
                    }`}>Theme</p>
                </div>

                <button
                  onClick={() => {
                    handleThemeChange('light');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-200 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun size={20} />
                    Light
                  </div>
                  {config.appTheme === 'light' && <Check size={18} className="text-blue-600" />}
                </button>

                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-200 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon size={20} />
                    Dark
                  </div>
                  {config.appTheme === 'dark' && <Check size={18} className="text-blue-600" />}
                </button>

                <button
                  onClick={() => {
                    handleThemeChange('neon-dark');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-200 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={20} />
                    Neon Dark
                  </div>
                  {config.appTheme === 'neon-dark' && <Check size={18} className="text-blue-600" />}
                </button>

                <div className={`border-t my-4 ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                  ? 'border-gray-700'
                  : 'border-gray-200'
                  }`}></div>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-red-600 hover:bg-red-50'
                    }`}
                >
                  <LogOut size={20} />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isViewingAs && (
        <div className="bg-amber-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye size={20} />
                <div>
                  <p className="text-sm font-semibold">Admin View Mode</p>
                  <p className="text-xs opacity-90">
                    Currently viewing as: <span className="font-medium">{profile?.display_name || 'User'}</span> (<span className="capitalize">{role || 'Member'}</span>)
                  </p>
                </div>
              </div>
              <button
                onClick={clearViewAs}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                <X size={16} />
                Exit View Mode
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={
          location.pathname.startsWith('/planner')
            ? 'w-full min-h-screen-safe'
            : 'w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-24 md:pb-8'
        }
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="core-mobile-tabs">
        {favouriteTabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon];
          const active = isTabActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`core-mobile-tab ${active ? 'core-mobile-tab--active' : ''}`}
            >
              {Icon && <Icon size={20} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="core-mobile-tab"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </div>

      <RegulationNotificationBanner />
      {/* Hide AI chat widget on planner, spaces routes, mobile devices, and when feature flag is disabled */}
      {FEATURE_AI_CHAT_WIDGET &&
        !location.pathname.startsWith('/planner') &&
        !location.pathname.startsWith('/spaces') &&
        !isMobile &&
        <FloatingAIChatWidget />}
      <OfflineIndicator />
      <AppUpdateBanner />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <p className="flex-1 font-medium text-gray-900">Are you sure you want to log out?</p>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors min-h-[44px]"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedSpacesManagementPanel
        isOpen={showManageSpaces}
        onClose={() => setShowManageSpaces(false)}
        onCreateHousehold={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('household');
          setShowCreateSpace(true);
        }}
        onCreateTeam={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('team');
          setShowCreateSpace(true);
        }}
      />

      <CreateSpaceModal
        isOpen={showCreateSpace}
        onClose={() => {
          setShowCreateSpace(false);
          setCreateSpaceType(undefined);
        }}
        defaultType={createSpaceType}
        onSpaceCreated={() => {
          // Space switching is handled in the modal
          // Refresh spaces list if management panel is open
          if (showManageSpaces) {
            // Trigger refresh by closing and reopening
            setShowManageSpaces(false);
            setTimeout(() => setShowManageSpaces(true), 100);
          }
        }}
      />
    </div>
  );
}
