import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Network, Kanban, Target, Activity, Share2, Settings, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from '../sharing/SharingDrawer';
import { PermissionIndicator } from '../sharing/PermissionIndicator';
import { getUserProjectPermissions } from '../../lib/guardrails/projectUserService';
import { ProjectSettingsDrawer } from './settings/ProjectSettingsDrawer';
import { ProjectSwitcherSheet } from './projects/ProjectSwitcherSheet';
import { ProjectSwitcherDropdown } from './projects/ProjectSwitcherDropdown';
import { useActiveProject } from '../../contexts/ActiveProjectContext';

interface ProjectHeaderTabsProps {
  masterProjectId: string;
  projectName: string;
  // Phase 7: Search callback for Roadmap view
  onSearchClick?: () => void;
}

export function ProjectHeaderTabs({ masterProjectId, projectName, onSearchClick }: ProjectHeaderTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { activeProjectId, activeProject } = useActiveProject();
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer('project', masterProjectId);
  const [canManageProject, setCanManageProject] = useState(false);
  const [projectPermissionFlags, setProjectPermissionFlags] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Phase 8: Project switcher state (mobile only)
  const [isMobile, setIsMobile] = useState(false);
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user && masterProjectId) {
      checkProjectPermissions();
    }
  }, [user, masterProjectId]);

  async function checkProjectPermissions() {
    if (!user || !masterProjectId) return;
    
    try {
      const permission = await getUserProjectPermissions(user.id, masterProjectId);
      if (permission) {
        setCanManageProject(permission.canManageUsers);
        setProjectPermissionFlags({
          can_view: permission.canView,
          can_edit: permission.canEdit,
          can_manage: permission.canManageUsers,
          detail_level: 'detailed',
          scope: 'include_children',
        });
      } else {
        setCanManageProject(false);
        setProjectPermissionFlags(null);
      }
    } catch (error) {
      console.error('Error checking project permissions:', error);
    }
  }

  // Determine if we're on the Roadmap view
  // Check if current path includes '/roadmap' (works for both /guardrails/roadmap and /guardrails/projects/:id/roadmap)
  const isRoadmapView = currentPath.includes('/roadmap');

  const tabs = [
    {
      name: 'Roadmap',
      path: `/guardrails/projects/${masterProjectId}/roadmap`,
      icon: Map,
    },
    {
      name: 'Nodes',
      path: `/guardrails/projects/${masterProjectId}/nodes`,
      icon: Network,
    },
    {
      name: 'Task Flow',
      path: `/guardrails/projects/${masterProjectId}/taskflow`,
      icon: Kanban,
    },
    {
      name: 'Reality Check',
      path: `/guardrails/projects/${masterProjectId}/reality`,
      icon: Activity,
    },
    {
      name: 'Settings',
      path: null, // Settings opens drawer, not a route
      icon: Settings,
      onClick: () => setIsSettingsOpen(true),
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {/* Phase 8: Project switcher - clickable dropdown on desktop, sheet on mobile */}
                {/* Use activeProject name if available, fallback to projectName prop */}
                {isMobile ? (
                  <button
                    onClick={() => setProjectSwitcherOpen(true)}
                    className="flex items-center gap-2 text-xl font-bold text-gray-900 truncate hover:text-blue-600 transition-colors text-left"
                    aria-label="Switch project"
                  >
                    <span className="truncate">{activeProject?.name || projectName}</span>
                    <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
                  </button>
                ) : (
                  <ProjectSwitcherDropdown
                    currentProjectName={activeProject?.name || projectName}
                  />
                )}
                {/* Phase 4a: Hide permission indicator on Roadmap view (too technical) */}
                {!isRoadmapView && (
                  <PermissionIndicator
                    entityType="project"
                    entityId={masterProjectId}
                    flags={projectPermissionFlags}
                    canManage={canManageProject}
                  />
                )}
              </div>
              {/* Phase 7: Remove subtitle on Roadmap view to save space */}
              {!isRoadmapView && (
                <p className="text-sm text-gray-600">Master project workspace</p>
              )}
              {/* Roadmap context label - only on Roadmap view */}
              {isRoadmapView && (
                <span className="text-xs font-medium text-gray-500 mt-1 block">
                  Roadmap
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase 7: Search button on Roadmap view */}
            {isRoadmapView && onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search roadmap"
              >
                <Search size={20} className="text-gray-600" />
              </button>
            )}
            {/* Hide Share Project button on Roadmap view (moved to Settings) */}
            {canManageProject && !isRoadmapView && (
              <button
                onClick={openSharing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Share2 size={16} />
                Share Project
              </button>
            )}
            {/* Phase 4a: Removed "Use Interventions" button - unclear/unused feature */}
          </div>
          
          {sharingAdapter && (
            <SharingDrawer
              adapter={sharingAdapter}
              isOpen={isSharingOpen}
              onClose={closeSharing}
            />
          )}
        </div>

        {/* Project Settings Drawer */}
        <ProjectSettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          projectId={masterProjectId}
          projectName={projectName}
        />

        {/* Hide tab navigation on Roadmap view (Phase 1: Structural cleanup) */}
        {!isRoadmapView && (
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.path ? currentPath.includes(tab.path) : isSettingsOpen;

              if (tab.onClick) {
                return (
                  <button
                    key={tab.name}
                    onClick={tab.onClick}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {tab.name}
                  </button>
                );
              }

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Phase 8: Project Switcher Sheet (Mobile Only) */}
      {isMobile && (
        <ProjectSwitcherSheet
          isOpen={projectSwitcherOpen}
          onClose={() => setProjectSwitcherOpen(false)}
        />
      )}
    </div>
  );
}
