import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import type { Domain, MasterProject, RoadmapItem, SideIdea, OffshootIdea } from '../../../lib/guardrailsTypes';
import {
  ensureDomainsExist,
  getDomains,
  getMasterProjects,
  getAllRoadmapItems,
  getRoadmapSections,
  getRoadmapItemsBySection,
  getSideIdeas,
  getOffshootIdeas,
} from '../../../lib/guardrails';
import { checkWizardStatus } from '../../../lib/guardrails/wizardHelpers';
import { DomainCard } from './DomainCard';
import { AnalyticsPanel } from './AnalyticsPanel';
import { WorkloadPanel } from './WorkloadPanel';
import { ActivityFeed } from './ActivityFeed';
import { GlobalActions } from './GlobalActions';
import { ProjectsOverview } from './ProjectsOverview';
import { CreateProjectModal } from './CreateProjectModal';
import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { setActiveProjectId } from '../../../state/activeDataContext';

interface ProjectWithStats {
  project: MasterProject;
  stats: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    blockedItems: number;
  };
}

interface DomainProjects {
  domain: Domain;
  activeProject: ProjectWithStats | null;
  completedProjects: ProjectWithStats[];
  abandonedProjects: ProjectWithStats[];
}

interface DomainWithProject {
  domain: Domain;
  project: MasterProject | null;
  stats: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    blockedItems: number;
  };
}

export function GuardrailsDashboard() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveDataContext();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsWithProjects, setDomainsWithProjects] = useState<DomainWithProject[]>([]);
  const [domainProjectsGrouped, setDomainProjectsGrouped] = useState<DomainProjects[]>([]);
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [allItems, setAllItems] = useState<(RoadmapItem & { project?: MasterProject })[]>([]);
  const [sideIdeas, setSideIdeas] = useState<SideIdea[]>([]);
  const [offshootIdeas, setOffshootIdeas] = useState<OffshootIdea[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [showWizardPrompt, setShowWizardPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      await ensureDomainsExist();
      const domainsData = await getDomains();
      const projectsData = await getMasterProjects();

      if (projectsData.length === 0) {
        const wizardStatus = await checkWizardStatus();
        if (!wizardStatus.hasCompleted) {
          navigate('/guardrails/wizard');
          return;
        }
        if (wizardStatus.hasSkipped) {
          setShowWizardPrompt(true);
        }
      }

      setDomains(domainsData);
      setProjects(projectsData);

      async function getProjectStats(project: MasterProject) {
        const sections = await getRoadmapSections(project.id);
        const itemsArrays = await Promise.all(
          sections.map(section => getRoadmapItemsBySection(section.id))
        );
        const items = itemsArrays.flat();

        return {
          totalItems: items.length,
          completedItems: items.filter(i => i.status === 'completed').length,
          inProgressItems: items.filter(i => i.status === 'in_progress').length,
          blockedItems: items.filter(i => i.status === 'blocked').length,
        };
      }

      const domainProjectsGroupedData: DomainProjects[] = await Promise.all(
        domainsData.map(async domain => {
          const domainProjects = projectsData.filter(p => p.domain_id === domain.id);

          const activeProjects = domainProjects.filter(p => p.status === 'active');
          const completedProjects = domainProjects.filter(p => p.status === 'completed');
          const abandonedProjects = domainProjects.filter(p => p.status === 'abandoned');

          const activeProject = activeProjects.length > 0
            ? {
                project: activeProjects[0],
                stats: await getProjectStats(activeProjects[0]),
              }
            : null;

          const completed: ProjectWithStats[] = await Promise.all(
            completedProjects.map(async project => ({
              project,
              stats: await getProjectStats(project),
            }))
          );

          const abandoned: ProjectWithStats[] = await Promise.all(
            abandonedProjects.map(async project => ({
              project,
              stats: await getProjectStats(project),
            }))
          );

          return {
            domain,
            activeProject,
            completedProjects: completed,
            abandonedProjects: abandoned,
          };
        })
      );

      setDomainProjectsGrouped(domainProjectsGroupedData);

      const domainsWithProjectsData: DomainWithProject[] = domainProjectsGroupedData.map(dp => ({
        domain: dp.domain,
        project: dp.activeProject?.project || null,
        stats: dp.activeProject?.stats || {
          totalItems: 0,
          completedItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
        },
      }));

      setDomainsWithProjects(domainsWithProjectsData);

      const allItemsData: (RoadmapItem & { project?: MasterProject })[] = [];
      for (const project of projectsData.filter(p => p.status === 'active')) {
        const sections = await getRoadmapSections(project.id);
        for (const section of sections) {
          const items = await getRoadmapItemsBySection(section.id);
          allItemsData.push(...items.map(item => ({ ...item, project })));
        }
      }
      setAllItems(allItemsData);

      const allSideIdeas: SideIdea[] = [];
      const allOffshootIdeas: OffshootIdea[] = [];
      for (const project of projectsData.filter(p => p.status === 'active')) {
        const ideas = await getSideIdeas(project.id);
        allSideIdeas.push(...ideas);

        const offshoots = await getOffshootIdeas(project.id);
        allOffshootIdeas.push(...offshoots);
      }
      setSideIdeas(allSideIdeas);
      setOffshootIdeas(allOffshootIdeas);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateModal(domainId?: string) {
    setSelectedDomainId(domainId || null);
    setShowCreateModal(true);
  }

  function handleProjectCreated(project: MasterProject) {
    setShowCreateModal(false);
    setSelectedDomainId(null);
    setActiveProjectId(project.id, project.domain_id);
    loadData();
    navigate(`/guardrails/wizard?project=${project.id}`);
  }

  function handleOpenProject(projectId: string) {
    navigate(`/guardrails/roadmap?project=${projectId}`);
  }

  function handleOpenFocusMode() {
    const activeProject = projects.find(p => p.status === 'active');
    if (activeProject) {
      navigate(`/guardrails/sessions?project=${activeProject.id}`);
    } else {
      alert('No active projects. Create a project first.');
    }
  }

  function handleViewIdeas() {
    navigate('/guardrails/offshoots');
  }

  function handleOpenSettings() {
    alert('Settings coming soon');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Guardrails Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Overview of all your domains, projects, and progress</p>
        </div>

        {showWizardPrompt && projects.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                    Ready to Create Your First Project?
                  </h3>
                  <p className="text-sm md:text-base text-gray-700 mb-4">
                    Use our guided wizard to set up a structured project with tracks, subtracks, and templates
                    tailored to your domain.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/guardrails/wizard')}
                    className="w-full sm:w-auto px-6 py-2.5 md:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base min-h-[44px]"
                  >
                    Start Project Wizard
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWizardPrompt(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <ProjectsOverview
          domainsWithProjects={domainProjectsGrouped}
          activeProjectId={activeProjectId}
          onCreateProject={handleOpenCreateModal}
          onOpenRoadmap={(projectId) => navigate(`/guardrails/roadmap?project=${projectId}`)}
          onOpenMindMesh={(projectId) => navigate(`/guardrails/nodes?project=${projectId}`)}
          onOpenTaskFlow={(projectId) => navigate(`/guardrails/taskflow?project=${projectId}`)}
          onRefresh={loadData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <AnalyticsPanel items={allItems} projects={projects.filter(p => p.status === 'active')} />
          </div>
          <div>
            <GlobalActions
              onCreateProject={() => handleOpenCreateModal()}
              onOpenFocusMode={handleOpenFocusMode}
              onViewIdeas={handleViewIdeas}
              onOpenSettings={handleOpenSettings}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <WorkloadPanel domains={domains} projects={projects} items={allItems} />
          <ActivityFeed
            items={allItems}
            projects={projects}
            sideIdeas={sideIdeas}
            offshootIdeas={offshootIdeas}
          />
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          domains={domains}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDomainId(null);
          }}
          onSuccess={handleProjectCreated}
          preselectedDomainId={selectedDomainId || undefined}
        />
      )}
    </div>
  );
}
