/**
 * ProjectSwitcherSheet
 * 
 * Phase 8: Mobile bottom sheet for switching active project.
 * 
 * Displays a list of projects the user has access to.
 * Highlights the current active project.
 * Handles selection via setActiveProject from ActiveProjectContext.
 * 
 * ⚠️ CRITICAL: This component is read-only. All state changes happen via callbacks.
 */

import { useState, useEffect } from 'react';
import { BottomSheet } from '../../shared/BottomSheet';
import { Check, Loader2 } from 'lucide-react';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getMasterProjects } from '../../../lib/guardrails';
import type { MasterProject } from '../../../lib/guardrailsTypes';

interface ProjectSwitcherSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSwitcherSheet({ isOpen, onClose }: ProjectSwitcherSheetProps) {
  const { user } = useAuth();
  const { activeProjectId, setActiveProject } = useActiveProject();
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingProjectId, setSwitchingProjectId] = useState<string | null>(null);

  // Load projects when sheet opens
  useEffect(() => {
    if (isOpen && user) {
      loadProjects();
    } else if (!isOpen) {
      // Reset state when closed
      setProjects([]);
      setLoading(true);
      setSwitchingProjectId(null);
    }
  }, [isOpen, user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Phase 8: Use existing getMasterProjects which respects RLS
      // RLS ensures only projects the user has access to are returned
      const projectsData = await getMasterProjects();
      
      // Filter to only active projects (completed/abandoned are excluded from switcher)
      const activeProjects = projectsData.filter(p => p.status === 'active' && !p.is_archived);
      
      setProjects(activeProjects);
    } catch (error) {
      console.error('[ProjectSwitcherSheet] Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project: MasterProject) => {
    // No-op if selecting the same project
    if (project.id === activeProjectId) {
      onClose();
      return;
    }

    // No-op if already switching
    if (switchingProjectId !== null) {
      return;
    }

    try {
      setSwitchingProjectId(project.id);
      // Phase 8: Use central Active Project setter (updates global state, resets track, triggers refresh)
      await setActiveProject(project);
      onClose();
    } catch (error) {
      console.error('[ProjectSwitcherSheet] Failed to switch project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch project. Please try again.';
      const { showToast } = await import('../../Toast');
      showToast('error', errorMessage);
    } finally {
      setSwitchingProjectId(null);
    }
  };

  // Edge case: Only one project - disable switcher (already handled by parent showing it or not)
  const hasMultipleProjects = projects.length > 1;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Project"
      maxHeight="85vh"
      closeOnBackdrop={true}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-sm font-medium text-gray-900 mb-1">No projects available</p>
            <p className="text-xs text-gray-500 text-center">
              You don't have access to any active projects yet.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
            <div className="space-y-1">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const isSwitching = switchingProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    disabled={!hasMultipleProjects || isSwitching}
                    className={`w-full px-4 py-3 text-left border rounded-lg transition-all min-h-[56px] ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    } ${
                      !hasMultipleProjects || isSwitching
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate mb-1">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {isActive && !isSwitching && (
                        <Check size={20} className="text-blue-600 flex-shrink-0" />
                      )}
                      {isSwitching && (
                        <Loader2 size={20} className="text-blue-600 animate-spin flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
