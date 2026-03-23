import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, KanbanSquare, Network, Layers, Lightbulb, Timer, Shield, Target, ClipboardCheck, Archive, ChevronLeft, ChevronRight, Zap, BarChart3, History, Users, MessageSquare, Grid3x3, Share2, Smartphone, ChevronDown, ChevronUp, Sun, Moon, Check, Menu, X, BookOpen } from 'lucide-react';
import { useActiveDataContext } from '../../state/useActiveDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAIChatWidget } from '../../contexts/AIChatWidgetContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { getMasterProjects } from '../../lib/guardrails';
import type { MasterProject } from '../../lib/guardrailsTypes';
import type { AppTheme } from '../../lib/uiPreferencesTypes';
import { FloatingAIChatWidget } from '../ai-chat/FloatingAIChatWidget';
import { FEATURE_AI_CHAT_WIDGET } from '../../lib/featureFlags';
import { getSavedConversations, type GroupedConversations } from '../../lib/guardrails/ai/savedConversationsService';
import { showToast } from '../Toast';

interface GuardrailsLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  requiresProject?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/guardrails/dashboard', icon: LayoutDashboard },
  { name: 'People', path: '/guardrails/people', icon: Users },
  { name: 'AI Chats', path: '/guardrails/ai-chats', icon: MessageSquare },
  { name: 'Roadmap', path: '/guardrails/roadmap', icon: Map, requiresProject: true },
  { name: 'Task Flow', path: '/guardrails/taskflow', icon: KanbanSquare, requiresProject: true },
  { name: 'Mind Mesh', path: '/guardrails/mindmesh', icon: Network, requiresProject: true },
  { name: 'Reality Check', path: '/guardrails/reality', icon: ClipboardCheck, requiresProject: true },
  { name: 'Side Projects', path: '/guardrails/side-projects', icon: Layers, requiresProject: true },
  { name: 'Offshoot Ideas', path: '/guardrails/offshoots', icon: Lightbulb, requiresProject: true },
  { name: 'Focus Mode', path: '/guardrails/focus', icon: Zap, requiresProject: true },
  { name: 'Focus Analytics', path: '/guardrails/focus/analytics', icon: BarChart3, requiresProject: true },
  { name: 'Focus Sessions', path: '/guardrails/focus/sessions', icon: History, requiresProject: true },
  { name: 'Regulation Rules', path: '/guardrails/regulation', icon: Shield, requiresProject: true },
];

export function GuardrailsLayout({ children }: GuardrailsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProjectId } = useActiveDataContext();
  const { user } = useAuth();
  const { isDocked } = useAIChatWidget();
  const { config, updatePreferences } = useUIPreferences();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOptionsCollapsed, setMoreOptionsCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<MasterProject | null>(null);
  const [conversations, setConversations] = useState<GroupedConversations>({
    personal: [],
    projectGroups: [],
    shared: [],
  });

  useEffect(() => {
    if (isDocked) {
      setCollapsed(true);
    }
  }, [isDocked]);

  useEffect(() => {
    if (activeProjectId) {
      getMasterProjects().then((projects) => {
        const project = projects.find((p) => p.id === activeProjectId);
        // Only update if project found - don't clear if not found (might be loading)
        if (project) {
          setActiveProject(project);
        }
        // If not found, keep the existing activeProject from localStorage
        // This prevents clearing the project during page refresh while data is loading
      }).catch((error) => {
        console.error('[GuardrailsLayout] Failed to load projects:', error);
        // Don't clear activeProject on error - keep what's stored
      });
    }
    // Don't clear activeProject if activeProjectId becomes null - let user explicitly clear it
  }, [activeProjectId]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  async function loadConversations() {
    if (!user) return;
    try {
      const data = await getSavedConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  const handleThemeChange = (theme: AppTheme) => {
    updatePreferences({ appTheme: theme });
  };

  const isActive = (path: string) => {
    if (path === '/guardrails/reality') {
      return location.pathname.includes('/reality');
    }
    if (path === '/guardrails/focus') {
      return location.pathname === '/guardrails/focus' || location.pathname.startsWith('/guardrails/focus/live');
    }
    if (path === '/guardrails/focus/analytics') {
      return location.pathname === '/guardrails/focus/analytics';
    }
    if (path === '/guardrails/focus/sessions') {
      return location.pathname === '/guardrails/focus/sessions';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen-safe bg-slate-50">
      {/* 
        Z-INDEX HIERARCHY (App-Wide)
        ============================
        Layer 100: Main content (Roadmap, Planner, Calendar)
        Layer 200: Pill Action Nav (Settings/Actions bottom pill)
        Layer 300: Overlays / Sheets (Bottom sheets, modals)
        Layer 400: Side Navigation (Guardrails left panel)
        Layer 500: System dialogs (Alerts, confirmations)
      */}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center active:bg-gray-50"
        aria-label="Open menu"
        style={{
          // Layer 400: Side Navigation controls
          zIndex: 400,
        }}
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            // Layer 400: Side Navigation backdrop (same level as panel)
            zIndex: 400,
          }}
        ></div>
      )}

      <aside 
        className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300
          ${mobileMenuOpen ? 'fixed inset-y-0 left-0' : 'hidden'} lg:flex`}
        style={{
          // Layer 400: Side Navigation panel
          // This ensures the side navigation always appears above pill action nav (200) and content (100)
          zIndex: mobileMenuOpen ? 400 : undefined,
        }}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Guardrails</h1>
              <p className="text-xs text-gray-500 mt-1">Focus & Structure</p>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
              title="Close menu"
            >
              <X size={20} />
            </button>
            {/* Desktop collapse button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>

        {activeProject && (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/guardrails/dashboard');
            }}
            className={`w-full px-4 py-3 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors text-left ${collapsed ? 'flex justify-center' : ''}`}
            title="Go to Dashboard"
          >
            {collapsed ? (
              <div className="group relative">
                <Target size={20} className="text-blue-600" />
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {activeProject.name}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Active Project</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{activeProject.name}</p>
              </>
            )}
          </button>
        )}

        {!activeProject && location.pathname !== '/guardrails/dashboard' && (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/guardrails/dashboard');
            }}
            className={`w-full px-4 py-3 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors text-left ${collapsed ? 'flex justify-center' : ''}`}
            title="Select a project"
          >
            {collapsed ? (
              <div className="group relative">
                <Target size={20} className="text-amber-600" />
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                  No active project
                </div>
                <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  No active project
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-amber-600" />
                  <span className="text-xs font-medium text-amber-600">No Active Project</span>
                </div>
                <p className="text-xs text-amber-700">Go to Dashboard to select one</p>
              </>
            )}
          </button>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const requiresProject = item.requiresProject && !activeProject;

            return (
              <div key={item.path} className="group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (requiresProject) {
                      // Phase 5A: Use toast instead of alert
                      showToast('warning', 'Please select an active project from the Dashboard first.');
                      navigate('/guardrails/dashboard');
                    } else {
                      if (item.path === '/guardrails/reality' && activeProject) {
                        navigate(`/guardrails/projects/${activeProject.id}/reality`);
                      } else {
                        navigate(item.path);
                      }
                    }
                  }}
                  disabled={requiresProject}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                    active
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-300 shadow-md font-semibold'
                      : requiresProject
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label={item.name}
                  aria-current={active ? 'page' : undefined}
                  title={!collapsed && requiresProject ? 'Select an active project first' : item.name}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.name}</span>}
                </button>
                {/* Phase 2B: Replace hover-only tooltip with always-visible label on mobile */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      {item.name}
                      {requiresProject && <span className="block text-gray-400 text-[10px]">Needs active project</span>}
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.name}
                      {requiresProject && <span className="block text-gray-400 text-[10px]">Needs active project</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {!collapsed && conversations && (conversations.personal.length > 0 || conversations.projectGroups.length > 0 || conversations.shared.length > 0) && (
            <div className="px-4 pt-4 border-t border-gray-200 mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <MessageSquare size={14} />
                AI Chats
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {conversations.personal.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-ai-chat', {
                        detail: { conversationId: conv.id, surfaceType: 'personal' }
                      }));
                    }}
                    className="w-full text-left px-3 py-2 rounded text-xs text-gray-700 hover:bg-gray-100 transition-colors truncate"
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))}

                {conversations.projectGroups.map((group) => (
                  <div key={group.projectId}>
                    <div className="text-xs font-medium text-gray-600 px-3 py-1 truncate" title={group.projectName}>
                      {group.projectName}
                    </div>
                    {group.conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-ai-chat', {
                            detail: { conversationId: conv.id, surfaceType: 'project', masterProjectId: conv.master_project_id }
                          }));
                        }}
                        className="w-full text-left pl-6 pr-3 py-2 rounded text-xs text-gray-700 hover:bg-gray-100 transition-colors truncate"
                        title={conv.title}
                      >
                        {conv.title}
                      </button>
                    ))}
                  </div>
                ))}

                {conversations.shared.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-ai-chat', {
                        detail: { conversationId: conv.id, surfaceType: 'shared' }
                      }));
                    }}
                    className="w-full text-left px-3 py-2 rounded text-xs text-gray-700 hover:bg-gray-100 transition-colors truncate"
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {!collapsed && (
            <button
              onClick={() => setMoreOptionsCollapsed(!moreOptionsCollapsed)}
              className="w-full flex items-center justify-between px-2 py-2 mb-3 hover:bg-gray-50 rounded-lg transition-colors group"
            >
              <h4 className="text-xs font-semibold text-gray-500 uppercase">More Options</h4>
              {moreOptionsCollapsed ? (
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronUp size={14} className="text-gray-400 group-hover:text-gray-600" />
              )}
            </button>
          )}

          {!moreOptionsCollapsed && (
            <>
              <div className="mb-2 group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/planner');
                  }}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    location.pathname.startsWith('/planner')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label="Planner"
                >
                  <BookOpen size={18} />
                  {!collapsed && <span>Planner</span>}
                </button>
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      Planner
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Planner
                    </div>
                  </>
                )}
              </div>

              <div className="mb-2 group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/spaces/personal');
                  }}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    location.pathname === '/spaces/personal'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label="Personal Widgets"
                >
                  <Grid3x3 size={18} />
                  {!collapsed && <span>Personal Widgets</span>}
                </button>
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      Personal Widgets
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Personal Widgets
                    </div>
                  </>
                )}
              </div>

              <div className="mb-2 group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/spaces/shared');
                  }}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    location.pathname === '/spaces/shared'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label="Shared Widgets"
                >
                  <Share2 size={18} />
                  {!collapsed && <span>Shared Widgets</span>}
                </button>
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      Shared Widgets
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Shared Widgets
                    </div>
                  </>
                )}
              </div>

              <div className="mb-3 group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/mobile');
                  }}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    location.pathname === '/mobile'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label="Mobile Mode"
                >
                  <Smartphone size={18} />
                  {!collapsed && <span>Mobile Mode</span>}
                </button>
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      Mobile Mode
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Mobile Mode
                    </div>
                  </>
                )}
              </div>

              <div className="mb-3 group relative">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/guardrails/settings/archive');
                  }}
                  className={`w-full flex items-center ${collapsed ? 'justify-center min-h-[44px]' : 'gap-3'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    location.pathname === '/guardrails/settings/archive'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-label="Archive"
                >
                  <Archive size={18} />
                  {!collapsed && <span>Archive</span>}
                </button>
                {/* Phase 2B: Always-visible label on mobile, hover on desktop */}
                {collapsed && (
                  <>
                    <div className="lg:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                      Archive
                    </div>
                    <div className="hidden lg:block absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Archive
                    </div>
                  </>
                )}
              </div>

              {!collapsed && (
                <div className="mb-3 pb-3 border-t border-gray-200 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Theme</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                        config.appTheme === 'light'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sun size={16} />
                        <span>Light</span>
                      </div>
                      {config.appTheme === 'light' && <Check size={16} />}
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                        config.appTheme === 'dark'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Moon size={16} />
                        <span>Dark</span>
                      </div>
                      {config.appTheme === 'dark' && <Check size={16} />}
                    </button>
                    <button
                      onClick={() => handleThemeChange('neon-dark')}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                        config.appTheme === 'neon-dark'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap size={16} />
                        <span>Neon Dark</span>
                      </div>
                      {config.appTheme === 'neon-dark' && <Check size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!collapsed && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/dashboard');
              }}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Back to Main Dashboard
            </button>
          )}
        </div>
      </aside>

      {/* Phase 2C: Ensure main content expands fully on mobile when sidebar is drawer */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>

      {FEATURE_AI_CHAT_WIDGET && <FloatingAIChatWidget />}
    </div>
  );
}
