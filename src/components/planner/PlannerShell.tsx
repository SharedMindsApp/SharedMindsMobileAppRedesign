/**
 * Planner Shell - Fixed Flex Layout
 * 
 * Structural Fix: Replaced CSS Grid with Flexbox
 * - Fixed-width sidebars (no width animations)
 * - Main content uses flex-1 min-w-0
 * - No vw/max-width constraints
 * - Stable layout without reflow
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, X, Menu, Plus, Calendar, Target, ChevronLeft, ChevronRight, BarChart3, Bell, Activity, TrendingUp, CheckCircle2, Clock, Layers, Search, Zap } from 'lucide-react';
import { CalendarSettingsSheet } from '../calendar/CalendarSettingsSheet';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { PlannerSettings } from './PlannerSettings';
import { QuickActionsMenu } from './QuickActionsMenu';
import { PillActionNav } from '../shared/PillActionNav';
import { PlannerQuickViewDrawer } from './PlannerQuickViewDrawer';
import { PlannerSearchOverlay } from './PlannerSearchOverlay';
import { CalendarSelector } from './CalendarSelector';
import {
  DEFAULT_PLANNER_SETTINGS,
  PLANNER_STYLE_PRESETS,
  type PlannerSettings as PlannerSettingsType,
} from '../../lib/plannerTypes';
import { saveLastPlannerView } from '../../lib/contextMemory';
import { useActiveCalendarContext } from '../../contexts/ActiveCalendarContext';
import { showToast } from '../Toast';
import { LIFE_AREAS, shouldShowLifeArea, type LifeArea } from '../../lib/planner/plannerIA';
import { useAuth } from '../../contexts/AuthContext';

type PlannerShellProps = {
  children: React.ReactNode;
};

export function PlannerShell({ children }: PlannerShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCustomOverride } = useUIPreferences();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuSide, setMobileMenuSide] = useState<'left' | 'right' | null>(null);
  const [showSidecar, setShowSidecar] = useState(false);
  const [sidecarCollapsed, setSidecarCollapsed] = useState(false);
  const [sidecarTab, setSidecarTab] = useState<'analytics' | 'notifications'>('notifications');
  const [windowWidth, setWindowWidth] = useState(0);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [areasMenuOpen, setAreasMenuOpen] = useState(false);
  const [visibleLifeAreas, setVisibleLifeAreas] = useState<LifeArea[]>([]);
  const [quickViewDrawerOpen, setQuickViewDrawerOpen] = useState(false);
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const quickActionsButtonRef = useRef<HTMLButtonElement>(null);

  // Detect if we're on the calendar view
  const isCalendarView = location.pathname === '/planner/calendar' || location.pathname.startsWith('/planner/calendar');

  // Active calendar context
  const { activeContext, setActiveContext } = useActiveCalendarContext();

  // Handle revoked access
  const handleRevokedAccess = () => {
    showToast('warning', 'Access to that calendar is no longer available');
  };

  // Open Quick View drawer
  const openQuickViewDrawer = () => {
    setQuickViewDrawerOpen(true);
  };

  // Layout Detector: Show sidecar on screens >= 1024px (lg), always visible on >= 1920px (2xl)
  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      // Always show on 2xl+ (>= 1920px), collapsible on lg-xl (1024px - 1919px)
      setShowSidecar(width >= 1024);
      // Auto-expand on larger screens
      if (width >= 1920) {
        setSidecarCollapsed(false);
      }
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Load visible life areas (handles episodic areas like Travel)
  useEffect(() => {
    const loadVisibleLifeAreas = async () => {
      const userId = user?.id;
      const visible: LifeArea[] = [];
      
      for (const area of LIFE_AREAS) {
        const shouldShow = await shouldShowLifeArea(area.id, userId);
        if (shouldShow) {
          visible.push(area);
        }
      }
      
      setVisibleLifeAreas(visible);
    };

    loadVisibleLifeAreas();
  }, [user]);

  const plannerSettings: PlannerSettingsType = getCustomOverride('planner_settings', DEFAULT_PLANNER_SETTINGS);
  const stylePreset = PLANNER_STYLE_PRESETS[plannerSettings.stylePreset];
  const spacing = plannerSettings.comfort.spacing;
  
  // Get enabled quick actions, sorted by order (with backward compatibility)
  const enabledQuickActions = (plannerSettings.quickActions || DEFAULT_PLANNER_SETTINGS.quickActions || [])
    .filter((action) => action.enabled)
    .sort((a, b) => a.order - b.order);

  // Map paths to color keys
  const getTabColor = (path: string): string => {
    // Extract base path (without query params) for color matching
    const basePath = path.split('?')[0];
    
    const colorMap: Record<string, string> = {
      // Temporal views (primary)
      '/planner/today': stylePreset.colors.leftTabs.daily,
      '/planner/week': stylePreset.colors.leftTabs.weekly,
      '/planner/month': stylePreset.colors.leftTabs.monthly,
      '/planner/quarter': stylePreset.colors.leftTabs.monthly, // Reuse monthly color
      '/planner/year': stylePreset.colors.leftTabs.monthly, // Reuse monthly color
      '/planner': stylePreset.colors.leftTabs.index,
      // Legacy calendar routes (for backward compat)
      '/planner/calendar': stylePreset.colors.leftTabs.daily,
      '/planner/calendar?view=day': stylePreset.colors.leftTabs.daily,
      '/planner/calendar?view=week': stylePreset.colors.leftTabs.weekly,
      '/planner/calendar?view=month': stylePreset.colors.leftTabs.monthly,
      '/planner/tasks': stylePreset.colors.leftTabs.tasks,
      '/settings': stylePreset.colors.leftTabs.settings,
      // Life area filters (deprecated, kept for backward compat)
      '/planner/personal': stylePreset.colors.rightTabs.personal,
      '/planner/work': stylePreset.colors.rightTabs.work,
      '/planner/education': stylePreset.colors.rightTabs.education,
      '/planner/finance': stylePreset.colors.rightTabs.finance,
      '/planner/budget': stylePreset.colors.rightTabs.budget,
      '/planner/vision': stylePreset.colors.rightTabs.vision,
      '/planner/planning': stylePreset.colors.rightTabs.planning,
      '/planner/household': stylePreset.colors.rightTabs.household,
      '/planner/selfcare': stylePreset.colors.rightTabs.selfCare,
      '/planner/travel': stylePreset.colors.rightTabs.travel,
      '/planner/social': stylePreset.colors.rightTabs.social,
      '/planner/journal': stylePreset.colors.rightTabs.journal,
    };
    return colorMap[basePath] || colorMap[path] || 'bg-gray-500';
  };

  // Build tab arrays from settings
  const leftTabs = plannerSettings.tabConfig
    .filter((tab) => tab.side === 'left' && tab.enabled)
    .sort((a, b) => a.order - b.order)
    .map((tab) => ({
      path: tab.path,
      label: tab.label,
      color: getTabColor(tab.path),
    }));

  const rightTabs = plannerSettings.tabConfig
    .filter((tab) => tab.side === 'right' && tab.enabled)
    .sort((a, b) => a.order - b.order)
    .map((tab) => ({
      path: tab.path,
      label: tab.label,
      color: getTabColor(tab.path),
    }));

  const allTabs = [...leftTabs, ...rightTabs];

  // Favourites Bar
  // Phase 2D: Mobile-first default - prioritize daily view (most actionable) on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const defaultFavourites = isMobile 
    ? ['/planner/today', '/planner/week', '/planner/month', '/planner/quarter']
    : ['/planner/today', '/planner/week', '/planner/month', '/planner/quarter'];
  const favouritesList = plannerSettings.favouriteTabs?.length
    ? plannerSettings.favouriteTabs
    : defaultFavourites;

  const favouriteTabs = favouritesList
    .map(path => allTabs.find(tab => tab.path === path))
    .filter((tab): tab is NonNullable<typeof tab> => tab !== undefined);

  const isActive = (path: string) => {
    const basePath = path.split('?')[0];
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    // Handle tasks path
    if (basePath === '/planner/tasks' || path.startsWith('/planner/tasks')) {
      return currentPath === '/planner/tasks';
    }
    
    // Handle settings path - match /settings and any /settings/* routes
    if (basePath === '/settings') {
      return currentPath === '/settings' || currentPath.startsWith('/settings/');
    }
    
    // Handle temporal views with life area filters (e.g., /planner/today?area=work)
    if (['/planner/today', '/planner/week', '/planner/month', '/planner/quarter', '/planner/year'].includes(basePath)) {
      if (path.includes('?')) {
        const [pathPart, queryPart] = path.split('?');
        if (currentPath === pathPart) {
          const areaParam = new URLSearchParams(queryPart).get('area');
          const currentArea = new URLSearchParams(currentSearch).get('area');
          // If area param is specified, match both path and area
          if (areaParam) {
            return areaParam === currentArea;
          }
          // If no area param, match just the path (no area filter)
          return !currentArea;
        }
        return false;
      }
      // Exact path match (no query params)
      return currentPath === basePath && !currentSearch.includes('area=');
    }
    
    // Handle /planner default route
    if (basePath === '/planner') {
      return currentPath === '/planner' || currentPath === '/planner/index';
    }
    
    // Handle legacy calendar paths with query params
    if (path.startsWith('/planner/calendar')) {
      // If path has query params, match both path and view param
      if (path.includes('?')) {
        const [pathPart, queryPart] = path.split('?');
        if (currentPath === pathPart) {
          const viewParam = new URLSearchParams(queryPart).get('view');
          const currentView = new URLSearchParams(currentSearch).get('view') || 'month';
          return viewParam === currentView;
        }
        return false;
      }
      // If path is just /planner/calendar, match any calendar route
      return currentPath === '/planner/calendar';
    }
    
    // Default: exact pathname match
    return currentPath === basePath;
  };


  // Phase 4A: Remember last planner view when navigating
  useEffect(() => {
    // Save temporal view routes
    if (['/planner/today', '/planner/week', '/planner/month', '/planner/quarter', '/planner/year'].includes(location.pathname)) {
      saveLastPlannerView(location.pathname);
    } else if (location.pathname === '/planner/calendar') {
      const viewParam = new URLSearchParams(location.search).get('view') || 'month';
      saveLastPlannerView(`/planner/calendar?view=${viewParam}`);
    } else if (location.pathname === '/planner') {
      saveLastPlannerView('/planner/today'); // Default to today
    }
  }, [location.pathname, location.search]);

  // Apply color intensity reduction
  const getTabColorClass = (baseColor: string) => {
    if (plannerSettings.comfort.reduceColorIntensity) {
      return baseColor.replace(/-(500|600|700|800|900)/, '-400').replace(/bg-black/, 'bg-gray-600');
    }
    return baseColor;
  };

  return (
    <>
      <PlannerSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {/* Full-Width Canvas Container */}
      <div className={`min-h-screen-safe bg-gradient-to-br ${stylePreset.colors.bookBg} w-full`}>
        {/* Flex Layout: Left Sidebar + Main Content + Right Sidebar + Sidecar */}
        <div className="flex min-h-screen-safe relative z-10">
          
          {/* Desktop Left Sidebar - Fixed Width (xl+) */}
          <aside className="hidden xl:block w-16 flex-shrink-0">
            <div className="sticky top-0 h-screen-safe flex flex-col items-center py-2 gap-1 overflow-y-auto">
              {leftTabs.map((tab) => {
                const active = isActive(tab.path);
                return (
                  <button
                    key={tab.path}
                    onClick={() => {
                      // Navigate directly - React Router handles query params
                      navigate(tab.path);
                    }}
                    className={`
                      ${getTabColorClass(tab.color)}
                      w-full flex-shrink-0
                      ${active ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
                      transition-opacity duration-200
                      rounded-r-lg rounded-l-none
                      py-3 px-1.5
                      flex items-center justify-center
                      backdrop-blur-sm bg-opacity-90
                      ${active ? 'shadow-xl ring-2 ring-white/30' : 'shadow-md'}
                    `}
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                    }}
                    title={tab.label}
                  >
                    <span className="text-white text-[10px] font-bold">
                      {tab.label.toUpperCase()}
                    </span>
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Tablet Left Sidebar - Icon Only (lg-xl) */}
          <aside className="hidden lg:flex xl:hidden w-12 flex-shrink-0 flex-col items-center py-4 gap-2">
            {leftTabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => {
                    // Navigate directly - React Router handles query params
                    navigate(tab.path);
                  }}
                  className={`
                    ${getTabColorClass(tab.color)}
                    w-12 h-12 rounded-lg
                    ${active ? 'opacity-100 shadow-lg' : 'opacity-70 hover:opacity-90'}
                    transition-opacity duration-200
                    flex items-center justify-center
                    backdrop-blur-sm bg-opacity-90
                    ${active ? 'ring-2 ring-white/30' : ''}
                  `}
                  title={tab.label}
                >
                  <span className="text-white text-xs font-bold">
                    {tab.label.substring(0, 2)}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Main Content Area - Flex-1 (Fills Remaining Space) */}
          <main className="flex-1 min-w-0">
            {/* Sticky Header with Favourites */}
            {/* Phase 2C: Reduce vertical density on mobile by adjusting padding */}
            <header className={`
              sticky top-0 z-40 safe-top
              bg-gradient-to-r ${stylePreset.colors.headerGradient}
              backdrop-blur-md bg-opacity-95
              border-b-2 border-gray-300/50
              ${spacing === 'compact' ? 'px-2 sm:px-4 py-1.5 sm:py-2' : 'px-3 sm:px-6 py-2 sm:py-3'}
              shadow-lg
            `}>
              <div className="w-full flex items-center justify-between gap-2">
                {/* Favourites Tabs - Scrollable on mobile */}
                {/* Hide on mobile when on calendar view */}
                {!(isMobile && isCalendarView) && (
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide overscroll-contain px-1 sm:px-0">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-max">
                      {favouriteTabs.map((tab) => {
                        const isCalendarPath = tab.path.startsWith('/planner/calendar');
                        return (
                          <button
                            key={tab.path}
                            onClick={() => {
                              if (isCalendarPath && tab.path.includes('?')) {
                                // Already has query params, navigate as-is
                                navigate(tab.path);
                              } else if (isCalendarPath) {
                                // Calendar path without params, add default view
                                navigate('/planner/calendar?view=month');
                              } else {
                                navigate(tab.path);
                              }
                            }}
                            className={`
                              ${getTabColorClass(tab.color)}
                              ${isActive(tab.path.split('?')[0]) ? 'opacity-100 shadow-md ring-2 ring-white/50' : 'opacity-70 hover:opacity-90 active:opacity-100'}
                              transition-opacity duration-200
                              ${spacing === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3'} rounded-lg
                              text-white text-xs font-bold uppercase
                              whitespace-nowrap
                              backdrop-blur-sm bg-opacity-90
                              min-h-[44px] flex items-center justify-center
                            `}
                            aria-label={tab.label}
                            aria-current={isActive(tab.path.split('?')[0]) ? 'page' : undefined}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {/* Phase 2C: Reduce gap on mobile to prevent header crowding */}
                <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 flex-shrink-0">
                  {/* Calendar Selector - Only show on calendar view */}
                  {isCalendarView && (
                    <CalendarSelector
                      activeContext={activeContext}
                      onContextChange={setActiveContext}
                      onRevokedAccess={handleRevokedAccess}
                    />
                  )}
                  {/* Search Button */}
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 sm:p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 active:bg-blue-100/70 rounded-lg transition-colors backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Search Planner"
                    title="Search Planner"
                  >
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {/* Quick View Button - Mobile only, when on calendar view */}
                  {isMobile && isCalendarView && (
                    <button
                      onClick={openQuickViewDrawer}
                      className="p-2 sm:p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 active:bg-blue-100/70 rounded-lg transition-colors backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Quick View"
                      title="Quick View"
                    >
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  {/* Quick Actions Button - Replaces Home icon */}
                  <button
                    ref={quickActionsButtonRef}
                    onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                    className="p-2 sm:p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 active:bg-blue-100/70 rounded-lg transition-colors backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Quick Actions"
                    title="Quick Actions"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 sm:p-3 text-gray-700 hover:text-gray-900 hover:bg-white/30 active:bg-white/50 rounded-lg transition-colors backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Planner Settings"
                    title="Planner Settings"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </header>

            {/* Content Canvas - Fills Available Space */}
            <div className="relative w-full">
              {/* Paper Background - Full Width with Texture */}
              <div
                className={`
                  ${stylePreset.colors.paperBg}
                  min-h-[calc(100dvh-4rem)]
                  pb-24 sm:pb-20 md:pb-16 lg:pb-8 safe-bottom
                  relative w-full
                `}
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 31px,
                      rgba(0, 0, 0, 0.03) 31px,
                      rgba(0, 0, 0, 0.03) 32px
                    )
                  `,
                }}
              >
                {/* Content Container - Responsive Padding (No Width Constraints) */}
                <div className={`
                  w-full
                  ${spacing === 'compact' 
                    ? 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-4 sm:py-5 md:py-6 lg:py-8' 
                    : 'px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 2xl:px-20 py-5 sm:py-6 md:py-8 lg:py-10 xl:py-12'
                  }
                `}>
                  {children}
                </div>
              </div>
            </div>
          </main>

          {/* Desktop Right Sidebar - Fixed Width (xl+) */}
          <aside className="hidden xl:block w-16 flex-shrink-0">
            <div className="sticky top-0 h-screen-safe flex flex-col items-center py-2 gap-1 overflow-y-auto">
              {rightTabs.map((tab) => {
                const active = isActive(tab.path);
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={`
                      ${getTabColorClass(tab.color)}
                      w-full flex-shrink-0
                      ${active ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
                      transition-opacity duration-200
                      rounded-l-lg rounded-r-none
                      py-3 px-1.5
                      flex items-center justify-center
                      backdrop-blur-sm bg-opacity-90
                      ${active ? 'shadow-xl ring-2 ring-white/30' : 'shadow-md'}
                    `}
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                    }}
                    title={tab.label}
                  >
                    <span className="text-white text-[10px] font-bold">
                      {tab.label.toUpperCase()}
                    </span>
                    {active && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-l-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Tablet Right Sidebar - Icon Only (lg-xl) */}
          <aside className="hidden lg:flex xl:hidden w-12 flex-shrink-0 flex-col items-center py-4 gap-2">
            {rightTabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`
                    ${getTabColorClass(tab.color)}
                    w-12 h-12 rounded-lg
                    ${active ? 'opacity-100 shadow-lg' : 'opacity-70 hover:opacity-90'}
                    transition-opacity duration-200
                    flex items-center justify-center
                    backdrop-blur-sm bg-opacity-90
                    ${active ? 'ring-2 ring-white/30' : ''}
                  `}
                  title={tab.label}
                >
                  <span className="text-white text-xs font-bold">
                    {tab.label.substring(0, 2)}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Sidecar Panel - Fixed Width Flex Child (lg+ screens, collapsible on smaller) */}
          {showSidecar && (
            <aside className={`
              hidden lg:block flex-shrink-0 sticky top-0 h-screen-safe overflow-y-auto scrollbar-hide border-l border-gray-200/50 bg-white/60 backdrop-blur-sm transition-all duration-300
              ${windowWidth >= 1920 ? 'w-[320px]' : sidecarCollapsed ? 'w-12' : 'w-[320px]'}
            `}>
              {/* Collapse Toggle Button (only on screens < 1920px) */}
              {windowWidth > 0 && windowWidth < 1920 && (
                <button
                  onClick={() => setSidecarCollapsed(!sidecarCollapsed)}
                  className="absolute top-1/2 -left-6 z-20 w-12 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-2 border-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                  aria-label={sidecarCollapsed ? 'Expand Quick View' : 'Collapse Quick View'}
                  title={sidecarCollapsed ? 'Expand Quick View' : 'Collapse Quick View'}
                >
                  {sidecarCollapsed ? (
                    <ChevronLeft className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                  )}
                  <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
              )}
              
              {(!sidecarCollapsed || windowWidth >= 1920) && (
                <div className="flex flex-col h-full">
                  {/* Tab Header */}
                  <div className="flex border-b border-gray-200/50 bg-white/40 backdrop-blur-sm sticky top-0 z-10">
                    <button
                      onClick={() => setSidecarTab('notifications')}
                      className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                        sidecarTab === 'notifications'
                          ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Updates</span>
                    </button>
                    <button
                      onClick={() => setSidecarTab('analytics')}
                      className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                        sidecarTab === 'analytics'
                          ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {sidecarTab === 'notifications' && (
                      <>
                        {/* Today's Focus */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-semibold text-gray-700">Today's Focus</h4>
                          </div>
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span>Review weekly goals</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>Update budget tracker</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <span>Plan next trip</span>
                            </div>
                          </div>
                        </div>

                        {/* Live Activity Feed */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-green-600" />
                            <h4 className="text-xs font-semibold text-gray-700">Live Feed</h4>
                          </div>
                          <div className="space-y-3 text-xs">
                            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-medium">Added goal: "Learn Spanish"</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">2 minutes ago</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-medium">Planned: "Morning Run"</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">15 minutes ago</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-medium">Updated: Budget Tracker</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">1 hour ago</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-medium">New event: "Team Meeting"</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">2 hours ago</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Calendar */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <h4 className="text-xs font-semibold text-gray-700">This Month</h4>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                              <div key={i} className="text-[10px] text-gray-500 font-medium py-1">
                                {day}
                              </div>
                            ))}
                            {Array.from({ length: 28 }).map((_, i) => {
                              const today = new Date();
                              const isToday = i + 1 === today.getDate();
                              return (
                                <div
                                  key={i}
                                  className={`text-[10px] py-1 rounded ${
                                    isToday
                                      ? 'bg-blue-500 text-white font-bold'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {i + 1}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {sidecarTab === 'analytics' && (
                      <>
                        {/* Weekly Stats */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-semibold text-gray-700">This Week</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Goals Planned</span>
                              <span className="text-sm font-bold text-gray-900">3/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Tasks Done</span>
                              <span className="text-sm font-bold text-gray-900">12/15</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Habits Tracked</span>
                              <span className="text-sm font-bold text-gray-900">18/21</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '86%' }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Monthly Overview */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            <h4 className="text-xs font-semibold text-gray-700">This Month</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs text-gray-700">Goals</span>
                              </div>
                              <span className="text-sm font-bold text-blue-600">12</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-50/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-xs text-gray-700">Events</span>
                              </div>
                              <span className="text-sm font-bold text-green-600">28</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-purple-50/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-purple-600" />
                                <span className="text-xs text-gray-700">Habits</span>
                              </div>
                              <span className="text-sm font-bold text-purple-600">21</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs text-gray-700">Journal Entries</span>
                              </div>
                              <span className="text-sm font-bold text-amber-600">8</span>
                            </div>
                          </div>
                        </div>

                        {/* Streaks & Consistency */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-green-600" />
                            <h4 className="text-xs font-semibold text-gray-700">Streaks</h4>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Daily Planning</span>
                              <span className="font-bold text-gray-900">7 days</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Habit Tracking</span>
                              <span className="font-bold text-gray-900">12 days</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Journal Writing</span>
                              <span className="font-bold text-gray-900">5 days</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Collapsed State - Show Icon Only */}
              {sidecarCollapsed && windowWidth < 1920 && (
                <div className="p-4 flex flex-col items-center gap-4">
                  <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider" style={{ writingMode: 'vertical-rl' }}>
                    Quick View
                  </h3>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Mobile Bottom Navigation - Pill-style action nav */}
        <PillActionNav
          leftAction={{
            label: 'Settings',
            icon: <Settings size={20} />,
            onPress: () => {
              setMobileMenuSide(mobileMenuSide === 'left' ? null : 'left');
              setMobileMenuOpen(mobileMenuSide !== 'left');
              setSettingsOpen(mobileMenuSide !== 'left');
            },
          }}
          middleAction={{
            label: 'Actions',
            icon: <Zap size={20} />,
            onPress: () => {
              setQuickActionsOpen(!quickActionsOpen);
            },
          }}
          rightAction={{
            label: 'Areas',
            icon: <Layers size={20} />,
            onPress: () => {
              setAreasMenuOpen(!areasMenuOpen);
              // Close other menus when opening Areas
              if (!areasMenuOpen) {
                setMobileMenuOpen(false);
                setMobileMenuSide(null);
                setQuickActionsOpen(false);
              }
            },
          }}
          leftActive={mobileMenuSide === 'left'}
          middleActive={quickActionsOpen}
          rightActive={areasMenuOpen}
        />

        {/* Mobile Side Drawers */}
        {mobileMenuOpen && mobileMenuSide === 'left' && (
          <div className="lg:hidden fixed inset-0 bg-black/50" style={{ zIndex: 400 }} onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="fixed left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-md shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Phase 2D: Ensure close button is always visible and reachable */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-bold text-gray-900">Calendar</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCalendarSettingsOpen(true);
                    }}
                    className="p-3 text-gray-600 hover:text-gray-900 active:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Calendar settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 text-gray-600 hover:text-gray-900 active:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="py-2">
                {leftTabs.map((tab) => {
                  return (
                    <button
                      key={tab.path}
                      onClick={() => {
                        // Navigate directly - React Router handles query params
                        navigate(tab.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full ${getTabColorClass(tab.color)}
                        ${isActive(tab.path) ? 'opacity-100 ring-2 ring-white/70 shadow-lg' : 'opacity-80 active:opacity-100'}
                        px-4 py-4 text-left text-white font-bold uppercase
                        border-b border-white/20
                        transition-all duration-200
                        min-h-[44px] flex items-center
                        ${isActive(tab.path) ? 'pl-6 border-l-4 border-white/80' : 'pl-4'}
                      `}
                      aria-label={tab.label}
                      aria-current={isActive(tab.path) ? 'page' : undefined}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Areas Menu Drawer */}
        {areasMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/50" style={{ zIndex: 400 }} onClick={() => setAreasMenuOpen(false)}>
            <div 
              className="fixed right-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-md shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Phase 2D: Ensure close button is always visible and reachable */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-bold text-gray-900">Life Areas</h3>
                <button
                  onClick={() => setAreasMenuOpen(false)}
                  className="p-3 text-gray-600 hover:text-gray-900 active:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="py-2">
                {visibleLifeAreas.map((area) => {
                  const Icon = area.icon;
                  // Ensure route is properly formatted: default to /planner/today with area filter
                  const areaRoute = area.route || `/planner/today?area=${area.id}`;
                  const areaColor = area.color || 'bg-gray-500';
                  const isAreaActive = isActive(areaRoute) || (location.search.includes(`area=${area.id}`) && location.pathname.startsWith('/planner/'));
                  
                  const handleAreaClick = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Use explicit navigation to ensure query params are handled correctly
                    const [pathname, search] = areaRoute.split('?');
                    const targetPath = search ? `${pathname}?${search}` : pathname;
                    
                    // Navigate to the route
                    navigate(targetPath);
                    setAreasMenuOpen(false);
                  };
                  
                  return (
                    <button
                      key={area.id}
                      onClick={handleAreaClick}
                      type="button"
                      className={`
                        w-full ${areaColor}
                        ${isAreaActive ? 'opacity-100 ring-2 ring-white/70 shadow-lg' : 'opacity-80 active:opacity-100'}
                        px-4 py-4 text-left text-white font-bold uppercase
                        border-b border-white/20
                        transition-all duration-200
                        min-h-[44px] flex items-center gap-2
                        ${isAreaActive ? 'pr-6 border-r-4 border-white/80' : 'pr-4'}
                      `}
                      aria-label={area.label}
                      aria-current={isAreaActive ? 'page' : undefined}
                    >
                      {Icon && <Icon size={18} className="flex-shrink-0" />}
                      {area.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Settings Sheet */}
        <CalendarSettingsSheet
          isOpen={calendarSettingsOpen}
          onClose={() => setCalendarSettingsOpen(false)}
        />

        {/* Quick Actions Menu - Positioned relative to header button */}
        <QuickActionsMenu
          isOpen={quickActionsOpen}
          onClose={() => setQuickActionsOpen(false)}
          actions={enabledQuickActions}
          position={
            quickActionsButtonRef.current
              ? {
                  x: quickActionsButtonRef.current.getBoundingClientRect().left,
                  y: quickActionsButtonRef.current.getBoundingClientRect().top,
                }
              : { x: 0, y: 0 } // Fallback position
          }
        />

        {/* Mobile Quick View Drawer */}
        <PlannerQuickViewDrawer
          isOpen={quickViewDrawerOpen}
          onClose={() => setQuickViewDrawerOpen(false)}
          activeTab={sidecarTab}
        />

        {/* Planner Search Overlay */}
        <PlannerSearchOverlay
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </div>
    </>
  );
}
