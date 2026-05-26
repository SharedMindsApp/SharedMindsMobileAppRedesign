import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, LogOut, Shield, Eye, X, MessageCircle, MessageSquare, Brain, Users, Target, User, UserRound, ChevronDown, Zap, Sun, Moon, Check, Calendar, MoreHorizontal, Settings, Activity, BookOpen, Menu, Package, Link2, TrendingUp, ExternalLink, Globe, Sparkles, BellOff, Bell, Video } from 'lucide-react';
import { useFocusSession } from '../contexts/FocusSessionContext';
import { ToastContainer, useToasts } from './Toast';
import { getUserHousehold, Household } from '../lib/household';
import { signOut } from '../lib/auth';
import { useAuth } from '../core/auth/AuthProvider';
import { useViewAs } from '../contexts/ViewAsContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { fetchTotalUnreadDms, subscribeToAnyIncomingDm, updateDmPrivacy, type DmPrivacy } from '../core/services/MessageService';
import { supabase } from '../lib/supabase';
import { MessagingDock } from '../core/features/messages/MessagingDock';
import { NotificationsBell } from './notifications/NotificationsBell';
// SpaceSwitcher removed — replaced by SharedMinds brand text in header
// Cleaned duplicate and missing imports
import { getUserUIMode } from '../lib/mobileApps';
import type { UIMode } from '../lib/mobileTypes';
import type { AppTheme, NavigationTabId } from '../lib/uiPreferencesTypes';
import { ALL_NAVIGATION_TABS, DEFAULT_FAVOURITE_NAV_TABS } from '../lib/uiPreferencesTypes';
import { RegulationNotificationBanner } from './sessions/RegulationNotificationBanner';
import { OfflineIndicator } from './OfflineIndicator';
import { AppUpdateBanner } from './system/AppUpdateBanner';
// SharedSpaceSwitcher removed — replaced by brand text
import { SharedSpacesManagementPanel } from './shared/SharedSpacesManagementPanel';
import { CreateSpaceModal } from './shared/CreateSpaceModal';
// ChatBubble removed — functionality merged into unified MessagingDock

type LayoutProps = {
  children: React.ReactNode;
};

const ICON_MAP: Record<string, any> = {
  Home,
  Brain,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  MessageSquare,
  FileText,
  Shield,
  Activity,
  Settings,
  BookOpen,
  Package,
  Link2,
  UserRound,
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
  const { profile, user, isAdmin, canAccessPantry, refreshProfile } = useAuth();
  const { activeSession, sessionGoal } = useFocusSession();
  const role = profile?.role || 'free';
  // showAdmin: use isAdmin (profile.role) OR fall back to checking the JWT email
  // directly so the admin panel is visible even if the cached profile has stale role.
  const ADMIN_EMAILS = ['matthew@leonardfilming.com'];
  const showAdmin = isAdmin || ADMIN_EMAILS.includes(user?.email ?? '');
  const isViewingAs = false;
  const { clearViewAs } = useViewAs();
  const { config, updatePreferences } = useUIPreferences();
  const { toasts, dismissToast } = useToasts();

  // Ensure we always have the latest profile so isAdmin reflects the DB truth.
  // The initial auth fetch can return a stale/fallback profile (role: 'free')
  // if the DB was momentarily unavailable. Fire once whenever user.id settles.
  useEffect(() => {
    if (user?.id) refreshProfile().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Unread DM counter for the nav badge — polls on load + subscribes to any
  // new dm_messages insert (RLS filters to ones we can see). Kept simple:
  // any incoming insert triggers a refetch, no client-side optimism.
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const refresh = () => {
      fetchTotalUnreadDms().then((n) => { if (!cancelled) setUnreadDmCount(n); }).catch(() => {});
    };
    refresh();
    const unsub = subscribeToAnyIncomingDm(refresh);
    // Also refresh when the route changes — covers "user just opened a thread"
    return () => { cancelled = true; unsub(); };
  }, [user?.id]);

  // Heartbeat: update last_seen_at every 5 min so the email dispatcher knows
  // the user is active and can skip DM emails within their inactivity threshold.
  useEffect(() => {
    if (!user?.id) return;
    const ping = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {})
        .catch(() => {});
    };
    ping(); // immediate on mount
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Decrement the badge eagerly when navigating into messages so it feels
  // instant — server-side count catches up on next refresh.
  useEffect(() => {
    if (location.pathname.startsWith('/messages')) {
      // Schedule a refetch in a moment to catch markConversationRead settling
      const t = setTimeout(() => {
        fetchTotalUnreadDms().then(setUnreadDmCount).catch(() => {});
      }, 600);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

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
    if (tab.requiresAdmin && !showAdmin) return false;
    if (tab.requiresPantryAccess && !canAccessPantry) return false;
    return true;
  });

  // Admins always see the Admin tab in the favourites bar, regardless of
  // whatever favouriteNavTabs they've configured. Without this auto-pin the
  // tab would only show up for users who manually added 'admin' to favourites
  // (which is impossible since the tab didn't exist when their config was saved).
  const favouriteTabs = availableTabs.filter((tab) =>
    favouriteNavTabs.includes(tab.id) || (tab.id === 'admin' && showAdmin)
  );

  const moreTabs = availableTabs.filter((tab) =>
    !favouriteNavTabs.includes(tab.id) && !tab.requiresAdmin && !tab.requiresPantryAccess
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
    const showUnread = tab.id === 'messages' && unreadDmCount > 0;

    return (
      <button
        key={tab.id}
        onClick={() => navigate(tab.path)}
        className={`relative flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${isTabActive(tab.path)
          ? 'bg-primary/[0.07] text-primary font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container-low active:bg-surface-container'
          }`}
      >
        <span className="relative">
          <Icon size={16} className="lg:w-[18px] lg:h-[18px]" />
          {showUnread && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
              {unreadDmCount > 9 ? '9+' : unreadDmCount}
            </span>
          )}
        </span>
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
    <div className="core-app-shell flex min-h-screen-safe flex-col bg-surface" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
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

                <button
                  type="button"
                  onClick={() => navigate('/sessions')}
                  className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 text-left"
                >
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
                </button>

                <div className="hidden md:flex items-center gap-2">
                  {favouriteTabs.map((tab) => renderNavTab(tab))}

                  {/* Notifications bell + dropdown */}
                  <NotificationsBell />

                  {/* Avatar dropdown replaces the More button — holds everything personal */}
                  {(() => {
                    const isDark = config.appTheme === 'dark' || config.appTheme === 'neon-dark';
                    const initial = (profile?.display_name ?? user?.email ?? '?').charAt(0).toUpperCase();
                    const firstWorkType = (profile?.work_types && profile.work_types[0]) || profile?.work_type || null;
                    const workTypeLabel = firstWorkType
                      ? ({
                          designer: 'Designer', developer: 'Developer', writer: 'Writer / Creator',
                          founder: 'Founder', filmmaker: 'Filmmaker', marketer: 'Marketer',
                          consultant: 'Consultant', researcher: 'Researcher', other: 'Creative',
                        } as Record<string, string>)[firstWorkType] ?? null
                      : null;

                    return (
                      <div className="relative">
                        <button
                          ref={moreMenuButtonRef}
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          aria-label="Profile menu"
                          className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full transition-all ${
                            showMoreMenu
                              ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                              : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                          }`}
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile?.display_name ?? 'Profile'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full stitch-card--accent flex items-center justify-center text-white font-bold text-sm">
                              {initial}
                            </div>
                          )}
                          <ChevronDown
                            size={13}
                            className={`transition-transform ${showMoreMenu ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          />
                        </button>

                        {showMoreMenu && createPortal(
                          <>
                            {/* Backdrop — dim + click-to-close. */}
                            <div
                              className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
                              onClick={() => setShowMoreMenu(false)}
                            />

                            {/* Right-side slide-in panel — full height, generous
                                spacing. FLOWN-style "this is YOUR drawer" feel
                                rather than a quick-access dropdown. Width caps
                                at 360px so it doesn't dominate small laptop screens. */}
                            <div
                              ref={moreMenuRef}
                              role="dialog"
                              aria-label="Profile menu"
                              className={`fixed top-0 right-0 bottom-0 w-[88vw] max-w-[360px] z-[95] flex flex-col overflow-y-auto shadow-2xl border-l animate-[slideInFromRight_220ms_cubic-bezier(0.16,1,0.3,1)] ${
                                isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
                              }`}
                              style={{ paddingTop: 'env(safe-area-inset-top)' }}
                            >
                              {/* Close X */}
                              <div className="flex items-center justify-end px-4 pt-4 pb-1">
                                <button
                                  type="button"
                                  onClick={() => setShowMoreMenu(false)}
                                  aria-label="Close menu"
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                    isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              {/* ── Profile header — big avatar, name, role, View profile CTA ── */}
                              <div className="px-5 pb-4">
                                <button
                                  type="button"
                                  onClick={() => { setShowMoreMenu(false); navigate('/profile'); }}
                                  className="flex items-center gap-4 w-full text-left group"
                                >
                                  {profile?.avatar_url ? (
                                    <img
                                      src={profile.avatar_url}
                                      alt={profile?.display_name ?? 'Profile'}
                                      className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-full stitch-card--accent flex items-center justify-center text-white font-extrabold text-2xl shrink-0 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                                      {initial}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className={`text-lg font-extrabold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {profile?.display_name ?? 'Your Profile'}
                                    </p>
                                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {workTypeLabel ?? user?.email ?? 'View profile'}
                                    </p>
                                    <p className="text-[11px] font-bold text-primary mt-1 inline-flex items-center gap-1">
                                      View profile →
                                    </p>
                                  </div>
                                </button>
                              </div>

                              <div className={`mx-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />

                              {/* ── DM Privacy / Do Not Disturb ── */}
                              <div className="px-2 py-2">
                                <DmPrivacyToggle
                                  current={(profile as any)?.dm_privacy ?? 'open'}
                                  isDark={isDark}
                                />
                              </div>

                              <div className={`mx-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />

                              {/* ── Primary actions: ritual + secondary tabs ── */}
                              <div className="py-2 px-2">
                                <PanelRow
                                  icon={<Sparkles size={18} />}
                                  label="Weekly review"
                                  active={isTabActive('/reflection')}
                                  isDark={isDark}
                                  onClick={() => { setShowMoreMenu(false); navigate('/reflection'); }}
                                />
                                {moreTabs.filter((t) => t.id !== 'settings').map((tab) => {
                                  const Icon = ICON_MAP[tab.icon];
                                  return (
                                    <PanelRow
                                      key={tab.id}
                                      icon={Icon ? <Icon size={18} /> : null}
                                      label={tab.label}
                                      active={isTabActive(tab.path)}
                                      isDark={isDark}
                                      onClick={() => { setShowMoreMenu(false); navigate(tab.path); }}
                                    />
                                  );
                                })}
                              </div>

                              {/* ── Admin section ── */}
                              {showAdmin && (
                                <>
                                  <div className={`mx-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />
                                  <div className="py-2 px-2">
                                    <p className={`px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Admin
                                    </p>
                                    {[
                                      { path: '/admin', icon: Shield, label: 'Admin Panel' },
                                      { path: '/pantry', icon: Package, label: 'Pantry' },
                                      { path: '/journal', icon: BookOpen, label: 'Journal' },
                                    ].map(({ path, icon: Icon, label }) => (
                                      <PanelRow
                                        key={path}
                                        icon={<Icon size={18} />}
                                        label={label}
                                        active={isTabActive(path)}
                                        isDark={isDark}
                                        onClick={() => { setShowMoreMenu(false); navigate(path); }}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}

                              <div className={`mx-5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />

                              {/* ── External link + Sign out, anchored to the bottom
                                  via mt-auto so the panel feels like a proper drawer
                                  even when content is short. ── */}
                              <div className="py-2 px-2 mt-auto">
                                <a
                                  href={(import.meta.env.VITE_MARKETING_URL as string | undefined) || 'https://sharedminds.app'}
                                  onClick={() => setShowMoreMenu(false)}
                                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <Globe size={18} />
                                  <span className="flex-1">View website</span>
                                  <ExternalLink size={12} className="opacity-50" />
                                </a>

                                <button
                                  onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${
                                    isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  <LogOut size={18} />
                                  Sign out
                                </button>
                              </div>
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                    );
                  })()}
                </div>
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
            ? 'core-main core-main--native w-full min-h-screen-safe'
            : 'core-main core-main--native w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-24 md:pb-8'
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

      {/* ── Return-to-session chip ─────────────────────────────────────────
          Shown when there's an active session but the user has navigated
          away from it. Floats above the mobile tab bar (bottom-20 on small
          screens) so it never collides with the dock. */}
      {activeSession && !location.pathname.startsWith(`/session/${activeSession.id}`) && (
        <button
          type="button"
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full shadow-lg text-sm font-bold active:scale-95 transition-all hover:bg-primary/90 pointer-events-auto"
          style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
        >
          <Video size={14} />
          Back to session
          {sessionGoal ? (
            <span className="hidden sm:inline opacity-70 font-normal truncate max-w-[140px]">
              · {sessionGoal}
            </span>
          ) : null}
        </button>
      )}

      {/* Persistent floating chat dock — portals to body so it sits above
          all page content. Hidden during active video sessions so users
          can focus on their work without two competing chat surfaces. */}
      {!location.pathname.startsWith('/session/') && <MessagingDock />}

    </div>
  );
}

// ── Panel row helper ─────────────────────────────────────────────────────────
//
// Single source for the slide-in panel's nav rows so we don't repeat the
// active/inactive/dark styling at every call-site. Generous padding (py-3,
// gap-3) is deliberate — the panel is a "this is your space" surface, not
// a cramped dropdown.

function PanelRow({
  icon, label, active, isDark, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
        active
          ? isDark ? 'text-blue-400 bg-blue-900/20' : 'text-blue-700 bg-blue-50'
          : isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="text-left">{label}</span>
    </button>
  );
}

// ── DM Privacy toggle (rendered inside the avatar dropdown) ──────────────────

const DM_PRIVACY_OPTIONS: { value: DmPrivacy; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'open',
    label: 'Everyone',
    icon: <Bell size={12} />,
    description: 'Anyone can message you',
  },
  {
    value: 'connections_only',
    label: 'Connections',
    icon: <Users size={12} />,
    description: 'Only people you\'re connected with',
  },
  {
    value: 'do_not_disturb',
    label: 'Off',
    icon: <BellOff size={12} />,
    description: 'No one can message you',
  },
];

function DmPrivacyToggle({ current, isDark }: { current: DmPrivacy; isDark: boolean }) {
  const [value, setValue] = useState<DmPrivacy>(current);
  const [saving, setSaving] = useState(false);

  // Sync if profile reloads
  useEffect(() => { setValue(current); }, [current]);

  async function handleChange(next: DmPrivacy) {
    if (next === value || saving) return;
    setValue(next); // optimistic
    setSaving(true);
    try {
      await updateDmPrivacy(next);
    } catch {
      setValue(value); // revert
    } finally {
      setSaving(false);
    }
  }

  const activeOption = DM_PRIVACY_OPTIONS.find((o) => o.value === value) ?? DM_PRIVACY_OPTIONS[0];

  return (
    <div className={`px-3 py-2.5`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Direct messages from
      </p>
      <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'} p-0.5 gap-0.5`}>
        {DM_PRIVACY_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              disabled={saving}
              title={opt.description}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                isActive
                  ? opt.value === 'do_not_disturb'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : opt.value === 'connections_only'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-cyan-500 text-white shadow-sm'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className={`text-[10px] mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {activeOption.description}
      </p>
    </div>
  );
}
