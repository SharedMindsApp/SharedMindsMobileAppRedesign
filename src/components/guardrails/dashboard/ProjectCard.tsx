import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Archive, Trash2, MoreVertical, Network, ListChecks, MapPin, X, AlertTriangle, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MasterProject, Domain } from '../../../lib/guardrailsTypes';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { abandonMasterProject } from '../../../lib/guardrails';
import { getProjectTypeById } from '../../../lib/guardrails/projectTypes';
import { getProjectTypeIcon } from '../../../lib/guardrails/projectTypeIcons';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import { getProjectLifecyclePhase, getContinuePhaseButtonLabel, canAccessExecutionTools, getExecutionToolsTooltip } from '../../../lib/guardrails/projectLifecycle';
import { PhaseProgress } from './PhaseProgress';

interface ProjectCardProps {
  project: MasterProject;
  domain: Domain;
  stats: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    blockedItems: number;
  };
  activeProjectId: string | null;
  onOpenRoadmap: (projectId: string) => void;
  onOpenMindMesh: (projectId: string) => void;
  onOpenTaskFlow: (projectId: string) => void;
  onRefresh: () => void;
}

export function ProjectCard({
  project,
  domain,
  stats,
  activeProjectId,
  onOpenRoadmap,
  onOpenMindMesh,
  onOpenTaskFlow,
  onRefresh,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { setActiveProject, clearActiveProject } = useActiveProject();
  const [showMenu, setShowMenu] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [abandoning, setAbandoning] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [projectTypeName, setProjectTypeName] = useState<string | null>(null);

  const isActive = activeProjectId === project.id;
  const progress = stats.totalItems > 0
    ? Math.round((stats.completedItems / stats.totalItems) * 100)
    : 0;

  const domainConfig = getDomainConfig(domain.name);
  const ProjectTypeIcon = projectTypeName ? getProjectTypeIcon(projectTypeName) : null;
  const lifecyclePhase = getProjectLifecyclePhase(project);
  const canAccessExecution = canAccessExecutionTools(lifecyclePhase);
  const executionTooltip = getExecutionToolsTooltip(lifecyclePhase);

  useEffect(() => {
    if (project.project_type_id) {
      getProjectTypeById(project.project_type_id).then(pt => {
        if (pt) {
          setProjectTypeName(pt.name);
        }
      });
    }
  }, [project.project_type_id]);

  const statusConfig = {
    active: {
      label: 'Active',
      icon: Clock,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50 border-green-200',
    },
    abandoned: {
      label: 'Abandoned',
      icon: Archive,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
    },
  };

  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  async function handleSetActive() {
    if (settingActive || isActive) {
      return;
    }
    
    try {
      setSettingActive(true);
      setShowMenu(false);
      await setActiveProject(project);
      onRefresh();
    } catch (error) {
      console.error('[ProjectCard] Failed to set active project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active project. Please try again.';
      const { showToast } = await import('../../Toast');
      showToast('error', errorMessage);
    } finally {
      setSettingActive(false);
    }
  }

  async function handleClearActive() {
    if (settingActive) {
      return;
    }
    
    try {
      setSettingActive(true);
      setShowMenu(false);
      await clearActiveProject();
      onRefresh();
    } catch (error) {
      console.error('[ProjectCard] Failed to clear active project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear active project. Please try again.';
      const { showToast } = await import('../../Toast');
      showToast('error', errorMessage);
    } finally {
      setSettingActive(false);
    }
  }

  function handleLaunchWizard() {
    navigate(`/guardrails/wizard?project=${project.id}`);
  }

  async function handleAbandon() {
    if (!abandonReason.trim()) {
      alert('Please provide a reason for abandoning this project.');
      return;
    }

    try {
      setAbandoning(true);
      await abandonMasterProject(project.id, abandonReason.trim());

      if (isActive) {
        try {
          await clearActiveProject();
        } catch (error) {
          console.error('[ProjectCard] Failed to clear active project after abandon:', error);
          // Don't block abandonment if clearing active fails
        }
      }

      setShowAbandonModal(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to abandon project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to abandon project. Please try again.';
      alert(errorMessage);
    } finally {
      setAbandoning(false);
    }
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border-2 transition-all ${
          isActive
            ? `${domainConfig.colors.border} shadow-lg`
            : `${domainConfig.colors.border} hover:shadow-md`
        }`}
      >
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                  <StatusIcon size={14} />
                  {config.label}
                </span>
                {project.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isActive) {
                        handleClearActive();
                      } else {
                        handleSetActive();
                      }
                    }}
                    disabled={settingActive || (isActive && settingActive)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all min-h-[32px] ${
                      isActive
                        ? `${domainConfig.colors.primary} text-white cursor-default`
                        : `${domainConfig.colors.light} ${domainConfig.colors.text} hover:${domainConfig.colors.bg} border ${domainConfig.colors.border}`
                    } ${settingActive ? 'opacity-50 cursor-wait' : ''}`}
                    title={
                      settingActive
                        ? (isActive ? 'Clearing...' : 'Setting...')
                        : (isActive ? 'Click to deselect this project' : 'Click to select as active project')
                    }
                  >
                    <CheckCircle2 size={14} />
                    {settingActive ? (isActive ? 'Clearing...' : 'Setting...') : (isActive ? 'Selected' : 'Select')}
                  </button>
                )}
                {projectTypeName && ProjectTypeIcon && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${domainConfig.colors.light} ${domainConfig.colors.text} ${domainConfig.colors.border}`}>
                    <ProjectTypeIcon size={14} />
                    {projectTypeName}
                  </span>
                )}
              </div>
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 truncate">{project.name}</h3>
              <p className={`text-xs md:text-sm font-medium ${domainConfig.colors.text}`}>
                {domainConfig.name} Domain
              </p>
              {project.description && (
                <p className="text-xs md:text-sm text-gray-500 mt-2 line-clamp-2">{project.description}</p>
              )}
            </div>

            {project.status === 'active' && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Project options"
                >
                  <MoreVertical size={20} className="text-gray-600" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => {
                          setShowAbandonModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Abandon Project
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${domainConfig.colors.primary} transition-all`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                <span className="text-gray-600">{stats.inProgressItems} In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-gray-600">{stats.blockedItems} Blocked</span>
              </div>
            </div>
          </div>

          {project.status === 'active' && (
            <div className="space-y-3">
              {/* Phase Progress Indicator */}
              <div className="pt-2 border-t border-gray-200">
                <PhaseProgress currentPhase={lifecyclePhase} />
              </div>

              {/* Continue Setup Button */}
              {(lifecyclePhase === 'intent' || lifecyclePhase === 'intent_checked' || lifecyclePhase === 'feasibility' || lifecyclePhase === 'feasibility_checked' || lifecyclePhase === 'execution') && (
                <button
                  onClick={handleLaunchWizard}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 ${domainConfig.colors.primary} text-white rounded-lg hover:opacity-90 transition-all text-sm font-semibold shadow-md min-h-[44px]`}
                >
                  <Wand2 size={16} className="md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm">{getContinuePhaseButtonLabel(lifecyclePhase)}</span>
                </button>
              )}

              {/* Execution Tools */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onOpenRoadmap(project.id)}
                  disabled={!canAccessExecution}
                  title={!canAccessExecution ? executionTooltip : ''}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2.5 md:py-3 ${domainConfig.colors.light} ${domainConfig.colors.text} rounded-lg transition-colors text-xs md:text-sm font-medium min-h-[44px] ${
                    canAccessExecution
                      ? `hover:${domainConfig.colors.bg}`
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <MapPin size={16} className="md:w-4 md:h-4" />
                  <span>Roadmap</span>
                </button>
                <button
                  onClick={() => onOpenMindMesh(project.id)}
                  disabled={!canAccessExecution}
                  title={!canAccessExecution ? executionTooltip : ''}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2.5 md:py-3 ${domainConfig.colors.light} ${domainConfig.colors.text} rounded-lg transition-colors text-xs md:text-sm font-medium min-h-[44px] ${
                    canAccessExecution
                      ? `hover:${domainConfig.colors.bg}`
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Network size={16} className="md:w-4 md:h-4" />
                  <span>Mesh</span>
                </button>
                <button
                  onClick={() => onOpenTaskFlow(project.id)}
                  disabled={!canAccessExecution}
                  title={!canAccessExecution ? executionTooltip : ''}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2.5 md:py-3 ${domainConfig.colors.light} ${domainConfig.colors.text} rounded-lg transition-colors text-xs md:text-sm font-medium min-h-[44px] ${
                    canAccessExecution
                      ? `hover:${domainConfig.colors.bg}`
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <ListChecks size={16} className="md:w-4 md:h-4" />
                  <span>Tasks</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAbandonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <AlertTriangle className="text-red-600 md:w-6 md:h-6" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Abandon Project</h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbandonModal(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm md:text-base text-gray-700 mb-4">
                You are about to abandon <span className="font-semibold">{project.name}</span>. Please provide a reason for abandoning this project.
              </p>

              <textarea
                value={abandonReason}
                onChange={(e) => setAbandonReason(e.target.value)}
                placeholder="e.g., Shifted priorities, no longer relevant, scope too large..."
                rows={4}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                autoFocus
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowAbandonModal(false)}
                className="flex-1 px-4 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm md:text-base min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleAbandon}
                disabled={!abandonReason.trim() || abandoning}
                className="flex-1 px-4 py-2.5 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base min-h-[44px]"
              >
                {abandoning ? 'Abandoning...' : 'Abandon Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
