import { useState } from 'react';
import { Check, Briefcase, Heart, Lightbulb, Rocket, MapPin, Network, LayoutGrid, Archive, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import type { Domain, MasterProject } from '../../../lib/guardrailsTypes';

interface ProjectSwitcherProps {
  domainProjectsGrouped: Array<{
    domain: Domain;
    activeProject: { project: MasterProject; stats: any } | null;
    completedProjects: Array<{ project: MasterProject; stats: any }>;
    abandonedProjects: Array<{ project: MasterProject; stats: any }>;
  }>;
  onRefresh: () => void;
}

const DOMAIN_ICONS = {
  work: Briefcase,
  personal: Heart,
  creative: Lightbulb,
  health: Heart,
};

const DOMAIN_COLORS = {
  work: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
  },
  personal: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
  },
  creative: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'text-orange-600',
  },
  health: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
  },
};

export function ProjectSwitcher({ domainProjectsGrouped, onRefresh }: ProjectSwitcherProps) {
  const navigate = useNavigate();
  const { activeProjectId, setActiveProject, clearActiveProject } = useActiveProject();
  const [settingActive, setSettingActive] = useState<string | null>(null);

  const handleSetActive = async (project: MasterProject) => {
    if (settingActive === project.id || settingActive === 'clear') {
      return;
    }
    
    try {
      setSettingActive(project.id);
      await setActiveProject(project);
      onRefresh();
    } catch (error) {
      console.error('[ProjectSwitcher] Failed to set active project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active project. Please try again.';
      const { showToast } = await import('../Toast');
      showToast('error', errorMessage);
    } finally {
      setSettingActive(null);
    }
  };

  const handleClearActive = async () => {
    if (settingActive !== null) return;
    
    try {
      setSettingActive('clear');
      await clearActiveProject();
      onRefresh();
    } catch (error) {
      console.error('[ProjectSwitcher] Failed to clear active project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear active project. Please try again.';
      const { showToast } = await import('../Toast');
      showToast('error', errorMessage);
    } finally {
      setSettingActive(null);
    }
  };

  const handleOpenRoadmap = (projectId: string) => {
    navigate(`/guardrails/projects/${projectId}/roadmap`);
  };

  const handleOpenMindMesh = (projectId: string) => {
    navigate(`/guardrails/projects/${projectId}/nodes`);
  };

  const handleOpenTaskFlow = (projectId: string) => {
    navigate(`/guardrails/projects/${projectId}/taskflow`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Completed
          </span>
        );
      case 'abandoned':
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            Abandoned
          </span>
        );
      default:
        return null;
    }
  };

  const renderProjectCard = (
    project: MasterProject,
    stats: any,
    isActiveProject: boolean,
    isInactive: boolean
  ) => {
    const canSetActive = project.status === 'active' && !isActiveProject;

    return (
      <div
        key={project.id}
        className={`
          relative p-4 rounded-lg border-2 transition-all
          ${isActiveProject ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
          ${isInactive ? 'opacity-60' : ''}
          ${canSetActive ? 'hover:border-blue-300' : ''}
        `}
      >
        {project.status === 'active' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isActiveProject) {
                handleClearActive();
              } else {
                handleSetActive(project);
              }
            }}
            disabled={settingActive !== null && (isActiveProject ? settingActive !== 'clear' : settingActive !== project.id)}
            className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
              isActiveProject
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 border border-gray-300 hover:border-blue-300'
            } ${(settingActive === project.id || (isActiveProject && settingActive === 'clear')) ? 'opacity-50 cursor-wait' : ''}`}
            title={
              isActiveProject 
                ? 'Click to deselect this project' 
                : settingActive === project.id 
                ? 'Setting as active...'
                : 'Click to select as active project'
            }
          >
            {settingActive === project.id || (isActiveProject && settingActive === 'clear') ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {isActiveProject ? 'Clearing...' : 'Setting...'}
              </>
            ) : isActiveProject ? (
              <>
                <X className="w-3 h-3" />
                Deselect
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Select
              </>
            )}
          </button>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1 pr-20">
              {project.name}
            </h4>

            {project.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                {getStatusBadge(project.status)}
              </div>
              <div>
                {stats.totalItems || 0} items
              </div>
              <div>
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isInactive && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenRoadmap(project.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Roadmap
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMindMesh(project.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Network className="w-3.5 h-3.5" />
                    Mind Mesh
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenTaskFlow(project.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Task Flow
                  </button>
                </>
              )}

              {isInactive && (
                <button
                  type="button"
                  onClick={() => navigate('/guardrails/settings/archive')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  View Archive
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasAnyProjects = domainProjectsGrouped.some(
    dp => dp.activeProject || dp.completedProjects.length > 0 || dp.abandonedProjects.length > 0
  );

  if (!hasAnyProjects) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Active Project
        </h2>
        <p className="text-gray-600">
          Select which project you want to work on. All Guardrails sections will use the active project.
        </p>
      </div>

      <div className="space-y-6">
        {domainProjectsGrouped.map(({ domain, activeProject, completedProjects, abandonedProjects }) => {
          const hasProjects = activeProject || completedProjects.length > 0 || abandonedProjects.length > 0;
          if (!hasProjects) return null;

          const DomainIcon = DOMAIN_ICONS[domain.name as keyof typeof DOMAIN_ICONS] || Rocket;
          const colors = DOMAIN_COLORS[domain.name as keyof typeof DOMAIN_COLORS] || DOMAIN_COLORS.work;

          return (
            <div key={domain.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <DomainIcon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {domain.name}
                </h3>
              </div>

              <div className="space-y-3">
                {activeProject && renderProjectCard(
                  activeProject.project,
                  activeProject.stats,
                  activeProjectId === activeProject.project.id,
                  false
                )}

                {completedProjects.map(({ project, stats }) =>
                  renderProjectCard(
                    project,
                    stats,
                    activeProjectId === project.id,
                    true
                  )
                )}

                {abandonedProjects.map(({ project, stats }) =>
                  renderProjectCard(
                    project,
                    stats,
                    activeProjectId === project.id,
                    true
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!activeProjectId && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-semibold text-amber-900">No Active Project Selected</div>
              <div className="text-sm text-amber-800 mt-1">
                Click "Set Active" on a project above to enable Roadmap, Mind Mesh, and other Guardrails features.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
