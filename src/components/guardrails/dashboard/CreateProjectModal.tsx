import { useState, useEffect } from 'react';
import { X, Plus, Loader2, AlertCircle, CheckCircle, Trash2, Briefcase, User, Lightbulb, Heart } from 'lucide-react';
import type { Domain, MasterProject } from '../../../lib/guardrailsTypes';
import { createMasterProject, getMasterProjectByDomain, deleteMasterProject } from '../../../lib/guardrails';
import { BottomSheet } from '../../shared/BottomSheet';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';
import { showToast } from '../../Toast';

interface CreateProjectModalProps {
  domains: Domain[];
  onClose: () => void;
  onSuccess: (project: MasterProject) => void;
  preselectedDomainId?: string;
}

const domainDisplayNames: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  creative: 'Startup',
  health: 'Health',
};

const domainConfig: Record<string, { icon: typeof Briefcase; gradient: string; hoverGradient: string; description: string }> = {
  work: {
    icon: Briefcase,
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'from-blue-600 to-blue-700',
    description: 'Professional projects and career goals',
  },
  personal: {
    icon: User,
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'from-emerald-600 to-emerald-700',
    description: 'Personal development and life goals',
  },
  creative: {
    icon: Lightbulb,
    gradient: 'from-amber-500 to-orange-600',
    hoverGradient: 'from-amber-600 to-orange-700',
    description: 'Business ideas and ventures',
  },
  health: {
    icon: Heart,
    gradient: 'from-rose-500 to-rose-600',
    hoverGradient: 'from-rose-600 to-rose-700',
    description: 'Health and wellness initiatives',
  },
};

export function CreateProjectModal({
  domains,
  onClose,
  onSuccess,
  preselectedDomainId,
}: CreateProjectModalProps) {
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(preselectedDomainId || null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [domainHasProject, setDomainHasProject] = useState(false);
  const [existingProject, setExistingProject] = useState<MasterProject | null>(null);
  const [domainProjects, setDomainProjects] = useState<Map<string, MasterProject>>(new Map());
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function loadDomainProjects() {
    setLoadingDomains(true);
    const projectsMap = new Map<string, MasterProject>();

    for (const domain of domains) {
      try {
        const project = await getMasterProjectByDomain(domain.id);
        if (project) {
          projectsMap.set(domain.id, project);
        }
      } catch (error) {
        console.error(`Failed to check domain ${domain.id}:`, error);
      }
    }

    setDomainProjects(projectsMap);
    setLoadingDomains(false);

    if (preselectedDomainId) {
      const preselectedProject = projectsMap.get(preselectedDomainId);
      if (preselectedProject) {
        setDomainHasProject(true);
        setExistingProject(preselectedProject);
      }
    }
  }

  async function checkDomainAvailability(domainId: string) {
    try {
      const project = await getMasterProjectByDomain(domainId);
      if (project) {
        setDomainHasProject(true);
        setExistingProject(project);
        return false;
      }
      setDomainHasProject(false);
      setExistingProject(null);
      return true;
    } catch (error) {
      setDomainHasProject(false);
      setExistingProject(null);
      return true;
    }
  }

  async function handleDomainSelect(domainId: string) {
    setSelectedDomainId(domainId);
    await checkDomainAvailability(domainId);
  }

  useEffect(() => {
    loadDomainProjects();
  }, []);

  async function handleDeleteExistingProject() {
    if (!existingProject) return;
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!existingProject) return;
    setShowDeleteConfirm(false);

    try {
      setDeleting(true);
      await deleteMasterProject(existingProject.id);

      setDomainHasProject(false);
      setExistingProject(null);

      const updatedProjectsMap = new Map(domainProjects);
      if (selectedDomainId) {
        updatedProjectsMap.delete(selectedDomainId);
        setDomainProjects(updatedProjectsMap);
      }

      showToast('success', 'Project deleted successfully. You can now create a new project in this domain.');
    } catch (error) {
      console.error('Failed to delete project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project. Please try again.';
      showToast('error', errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate() {
    if (!selectedDomainId || !projectName.trim()) return;

    if (domainHasProject) {
      showToast('warning', 'This domain already has a master project. Each domain can only have one master project.');
      return;
    }

    try {
      setCreating(true);
      const newProject = await createMasterProject(
        selectedDomainId,
        projectName.trim(),
        projectDescription.trim() || undefined
      );

      onSuccess(newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      showToast('error', errorMessage);
    } finally {
      setCreating(false);
    }
  }

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <div className="space-y-6">
      {!selectedDomainId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Choose Your Domain
          </label>
          {loadingDomains ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {domains.map(domain => {
                const hasProject = domainProjects.has(domain.id);
                const project = domainProjects.get(domain.id);
                const config = domainConfig[domain.name];
                const Icon = config?.icon || Briefcase;

                return (
                  <button
                    key={domain.id}
                    onClick={() => handleDomainSelect(domain.id)}
                    disabled={hasProject}
                    className={`relative group p-6 rounded-xl transition-all duration-300 transform ${
                      hasProject
                        ? 'bg-gray-100 cursor-not-allowed opacity-50'
                        : 'bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-xl active:scale-95'
                    }`}
                  >
                    <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
                      config?.hoverGradient || 'from-blue-600 to-blue-700'
                    } ${hasProject ? 'hidden' : ''}`} />

                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 ${
                        hasProject
                          ? 'bg-gray-200'
                          : `bg-gradient-to-br ${config?.gradient || 'from-blue-500 to-blue-600'} group-hover:bg-white`
                      }`}>
                        <Icon
                          size={28}
                          className={`transition-colors duration-300 ${
                            hasProject
                              ? 'text-gray-400'
                              : 'text-white group-hover:text-blue-600'
                          }`}
                        />
                      </div>

                      <div className="text-left">
                        <h4 className={`font-bold text-lg mb-1 transition-colors duration-300 ${
                          hasProject
                            ? 'text-gray-400'
                            : 'text-gray-900 group-hover:text-white'
                        }`}>
                          {domainDisplayNames[domain.name] || domain.name}
                        </h4>
                        <p className={`text-sm transition-colors duration-300 ${
                          hasProject
                            ? 'text-gray-400'
                            : 'text-gray-500 group-hover:text-white group-hover:text-opacity-90'
                        }`}>
                          {config?.description || ''}
                        </p>
                      </div>

                      {hasProject && (
                        <div className="absolute top-4 right-4">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle size={20} className="text-white" />
                          </div>
                        </div>
                      )}

                      {hasProject && project && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <p className="text-xs text-gray-500 font-medium">
                            Active: {project.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedDomainId && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selected Domain
            </label>
            {(() => {
              const selectedDomain = domains.find(d => d.id === selectedDomainId);
              const config = selectedDomain ? domainConfig[selectedDomain.name] : null;
              const Icon = config?.icon || Briefcase;

              return (
                <div className={`relative overflow-hidden rounded-xl border-2 border-transparent bg-gradient-to-br ${
                  config?.gradient || 'from-blue-500 to-blue-600'
                } p-0.5`}>
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                          config?.gradient || 'from-blue-500 to-blue-600'
                        }`}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {domainDisplayNames[selectedDomain?.name || ''] || selectedDomain?.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {config?.description || ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDomainId(null);
                          setDomainHasProject(false);
                          setExistingProject(null);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors min-h-[44px]"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {domainHasProject && existingProject && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    This domain already has a master project
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    <span className="font-medium">{existingProject.name}</span> ({existingProject.status})
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Each domain can only have one master project. To create a new one, you must first delete the existing project.
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <button
                  onClick={handleDeleteExistingProject}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm min-h-[44px]"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Existing Project
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!domainHasProject && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Q1 Growth Initiative, Personal Website Redesign..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief description of what this project aims to achieve..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <ConfirmDialogInline
        isOpen={showDeleteConfirm}
        message={existingProject ? `Are you sure you want to delete "${existingProject.name}"? This action cannot be undone and will remove all associated data (roadmap, tasks, etc.).` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Mobile: Bottom Sheet (Half-height 60vh per audit) */}
      {isMobile ? (
        <BottomSheet
          isOpen={true}
          onClose={onClose}
          header={
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Master Project</h2>
              <p className="text-sm text-gray-500">Start a new project in one of your domains</p>
            </div>
          }
          footer={
            !selectedDomainId || domainHasProject ? null : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all font-medium min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!projectName.trim() || creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Create
                    </>
                  )}
                </button>
              </div>
            )
          }
          maxHeight="60vh"
          closeOnBackdrop={!creating && !deleting}
          preventClose={creating || deleting}
        >
          <div className="px-4 py-4">
            {renderFormContent()}
          </div>
        </BottomSheet>
      ) : (
        /* Desktop: Centered modal (unchanged) */
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm safe-top safe-bottom">
          <div className="bg-white rounded-2xl shadow-2xl max-w-full sm:max-w-2xl w-full max-h-screen-safe overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Create Master Project</h2>
                  <p className="text-blue-100">Start a new project in one of your domains</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 transition-colors rounded-lg p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {renderFormContent()}

              {selectedDomainId && !domainHasProject && (
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!projectName.trim() || creating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-md"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create Project
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
