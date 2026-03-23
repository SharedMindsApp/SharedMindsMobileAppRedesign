import { useState, useEffect } from 'react';
import { Sparkles, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { SideProjectCard } from './SideProjectCard';
import { SideProjectsMobileList } from './SideProjectsMobileList';
import { CreateSideProjectModal } from './CreateSideProjectModal';
import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { getMasterProjects } from '../../../lib/guardrails';
import type { MasterProject } from '../../../lib/guardrailsTypes';
import {
  getTracksByCategoryWithStats,
  createTrack,
  archiveTrack,
  deleteTrack,
  promoteSideProjectToMaster,
  updateTrack,
  type TrackWithStats,
} from '../../../lib/guardrails/trackService';

export function SideProjectsList() {
  const { activeProjectId } = useActiveDataContext();
  const [activeProject, setActiveProject] = useState<MasterProject | null>(null);
  const [sideProjects, setSideProjects] = useState<TrackWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'items'>('recent');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log('[SideProjectsList] activeProjectId from ADC:', activeProjectId);
    async function loadProject() {
      if (activeProjectId) {
        try {
          const projects = await getMasterProjects();
          const project = projects.find(p => p.id === activeProjectId);
          console.log('[SideProjectsList] Found project:', project);
          // Only update if project found - don't clear if not found (might be loading)
          if (project) {
            setActiveProject(project);
          }
          // If not found, keep the existing activeProject from localStorage
        } catch (error) {
          console.error('[SideProjectsList] Failed to load projects:', error);
          // Don't clear activeProject on error - keep what's stored
        }
      }
      // Don't clear activeProject if activeProjectId becomes null - let user explicitly clear it
    }
    loadProject();
  }, [activeProjectId]);

  useEffect(() => {
    console.log('[SideProjectsList] activeProject changed:', activeProject);
    if (activeProject) {
      loadSideProjects();
    } else {
      setLoading(false);
    }
  }, [activeProject]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function loadSideProjects() {
    if (!activeProject) return;

    try {
      setLoading(true);
      const data = await getTracksByCategoryWithStats(activeProject.id, 'side_project');
      setSideProjects(data);
    } catch (error) {
      console.error('Failed to load side projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: { title: string; description: string; color: string }) {
    if (!activeProject) return;

    await createTrack({
      masterProjectId: activeProject.id,
      name: data.title,
      description: data.description,
      color: data.color,
      category: 'side_project',
      includeInRoadmap: false,
    });
    await loadSideProjects();
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this side project? All items will remain but be unassigned.')) return;

    try {
      await archiveTrack(id);
      await loadSideProjects();
    } catch (error) {
      console.error('Failed to archive side project:', error);
      alert('Failed to archive side project');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this side project? All items will be unassigned. This cannot be undone.')) return;

    try {
      await deleteTrack(id);
      await loadSideProjects();
    } catch (error) {
      console.error('Failed to delete side project:', error);
      alert('Failed to delete side project');
    }
  }

  async function handleConvertToMaster(id: string) {
    if (!confirm('Convert this side project to a full Master Project? This will create a new independent project.')) return;

    try {
      await promoteSideProjectToMaster(id);
      alert('Side project converted to Master Project successfully!');
      await loadSideProjects();
    } catch (error) {
      console.error('Failed to convert side project:', error);
      alert('Failed to convert side project to Master Project');
    }
  }

  async function handleEdit(project: TrackWithStats) {
    const newTitle = prompt('Enter new title:', project.name);
    if (!newTitle || newTitle === project.name) return;

    try {
      await updateTrack(project.id, { name: newTitle });
      await loadSideProjects();
    } catch (error) {
      console.error('Failed to update side project:', error);
      alert('Failed to update side project');
    }
  }

  const sortedProjects = [...sideProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'items':
        return b.totalItemsCount - a.totalItemsCount;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (!activeProject) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-900 font-medium">No active project selected</p>
          <p className="text-sm text-amber-700 mt-1">
            Please select or create a master project first
          </p>
        </div>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={24} className="text-purple-600" />
            Side Projects
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and decide on exploratory work
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading side projects...</p>
            </div>
          </div>
        ) : (
          <SideProjectsMobileList
            projects={sideProjects}
            activeProject={activeProject}
            onRefresh={loadSideProjects}
          />
        )}
      </div>
    );
  }

  // Desktop view (unchanged)
  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles size={32} className="text-purple-600" />
              Side Projects
            </h1>
            <p className="text-gray-600 mt-1">
              Secondary orbit mini-projects that deserve space, but not center stage
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            <Plus size={20} />
            New Side Project
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="items">Most Items</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
              {sideProjects.length} {sideProjects.length === 1 ? 'project' : 'projects'}
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
              {sideProjects.reduce((sum, p) => sum + p.totalItemsCount, 0)} total items
            </span>
          </div>
        </div>
      </div>

      {sideProjects.length === 0 ? (
        <div className="bg-white border-2 border-purple-200 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Side Projects Yet</h2>
            <p className="text-gray-600 mb-6">
              A side project is an idea that deserves space, but not center stage.
              Create one when you want to explore something related to your main project,
              but need to keep it separate.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              <Plus size={20} />
              Create Your First Side Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
            <SideProjectCard
              key={project.id}
              project={project}
              onConvertToMaster={handleConvertToMaster}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSideProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
