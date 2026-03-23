/**
 * ProjectSwitcherDropdown
 * 
 * Phase 8: Desktop dropdown/popover for switching active project.
 * 
 * Displays a list of projects the user has access to in a dropdown menu.
 * Highlights the current active project.
 * Handles selection via setActiveProject from ActiveProjectContext.
 * 
 * ⚠️ CRITICAL: This component is read-only. All state changes happen via callbacks.
 */

import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, ChevronDown } from 'lucide-react';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getMasterProjects } from '../../../lib/guardrails';
import type { MasterProject } from '../../../lib/guardrailsTypes';

interface ProjectSwitcherDropdownProps {
  currentProjectName: string;
  // Note: currentProjectId is not used but kept for consistency/future use
}

export function ProjectSwitcherDropdown({
  currentProjectName,
}: ProjectSwitcherDropdownProps) {
  const { user } = useAuth();
  const { activeProjectId, setActiveProject } = useActiveProject();
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [switchingProjectId, setSwitchingProjectId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load projects on mount
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Phase 8: Use existing getMasterProjects which respects RLS
      const projectsData = await getMasterProjects();
      
      // Filter to only active projects
      const activeProjects = projectsData.filter(p => p.status === 'active' && !p.is_archived);
      
      setProjects(activeProjects);
    } catch (error) {
      console.error('[ProjectSwitcherDropdown] Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project: MasterProject) => {
    // No-op if selecting the same project
    if (project.id === activeProjectId) {
      setIsOpen(false);
      return;
    }

    // No-op if already switching
    if (switchingProjectId !== null) {
      return;
    }

    try {
      setSwitchingProjectId(project.id);
      // Phase 8: Use central Active Project setter
      await setActiveProject(project);
      setIsOpen(false);
    } catch (error) {
      console.error('[ProjectSwitcherDropdown] Failed to switch project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch project. Please try again.';
      const { showToast } = await import('../../Toast');
      showToast('error', errorMessage);
    } finally {
      setSwitchingProjectId(null);
    }
  };

  const hasMultipleProjects = projects.length > 1;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => hasMultipleProjects && setIsOpen(!isOpen)}
        disabled={!hasMultipleProjects}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
          hasMultipleProjects
            ? 'hover:bg-gray-100 cursor-pointer'
            : 'cursor-default'
        }`}
        aria-label="Switch project"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-xl font-bold text-gray-900 truncate max-w-[200px]">
          {currentProjectName}
        </span>
        {hasMultipleProjects && (
          <ChevronDown
            size={20}
            className={`text-gray-500 transition-transform flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isOpen && hasMultipleProjects && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-hidden flex flex-col"
          role="listbox"
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Switch Project</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <p className="text-sm font-medium text-gray-900 mb-1">No projects available</p>
              <p className="text-xs text-gray-500 text-center">
                You don't have access to any active projects yet.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[320px] py-1">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const isSwitching = switchingProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    disabled={isSwitching}
                    className={`w-full px-4 py-3 text-left transition-colors min-h-[48px] ${
                      isActive
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-gray-900 hover:bg-gray-50'
                    } ${
                      isSwitching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate mb-1">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {isActive && !isSwitching && (
                        <Check size={18} className="text-blue-600 flex-shrink-0" />
                      )}
                      {isSwitching && (
                        <Loader2 size={18} className="text-blue-600 animate-spin flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
