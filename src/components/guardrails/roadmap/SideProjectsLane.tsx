import { useState, useEffect } from 'react';
import { Sparkles, Archive, ChevronDown, ChevronRight, Plus, MoreVertical, ArrowUp, Trash2 } from 'lucide-react';
import {
  getSideProjectsWithStats,
  getSideProjectItems,
  archiveSideProject,
  deleteSideProject,
  convertSideProjectToMasterProject,
  createSideProject,
} from '../../../lib/guardrails/sideProjects';
import type { SideProjectWithStats } from '../../../lib/guardrails/sideProjects';

interface Props {
  masterProjectId: string;
  onRefresh: () => void;
}

export function SideProjectsLane({ masterProjectId, onRefresh }: Props) {
  const [sideProjects, setSideProjects] = useState<SideProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  useEffect(() => {
    loadSideProjects();
  }, [masterProjectId]);

  async function loadSideProjects() {
    try {
      setLoading(true);
      const data = await getSideProjectsWithStats(masterProjectId);
      setSideProjects(data);
    } catch (error) {
      console.error('Failed to load side projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(projectId: string) {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this side project? All items will remain but be unassigned.')) return;

    try {
      await archiveSideProject(id);
      await loadSideProjects();
      onRefresh();
    } catch (error) {
      console.error('Failed to archive side project:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this side project? All items will be unassigned. This cannot be undone.')) return;

    try {
      await deleteSideProject(id);
      await loadSideProjects();
      onRefresh();
    } catch (error) {
      console.error('Failed to delete side project:', error);
    }
  }

  async function handleConvertToMaster(id: string) {
    if (!confirm('Convert this side project to a full Master Project? This will create a new project.')) return;

    try {
      await convertSideProjectToMasterProject(id);
      await loadSideProjects();
      onRefresh();
      alert('Side project converted to Master Project successfully!');
    } catch (error) {
      console.error('Failed to convert side project:', error);
      alert('Failed to convert side project. Please try again.');
    }
  }

  async function handleCreate() {
    if (!newProjectTitle.trim()) return;

    try {
      await createSideProject(masterProjectId, { title: newProjectTitle.trim() });
      setNewProjectTitle('');
      setIsCreating(false);
      await loadSideProjects();
      onRefresh();
    } catch (error) {
      console.error('Failed to create side project:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-5 w-5 bg-purple-200 rounded"></div>
          <div className="h-4 bg-purple-200 rounded w-40"></div>
        </div>
      </div>
    );
  }

  if (sideProjects.length === 0 && !isCreating) {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            <span className="font-semibold text-purple-900">Side Projects</span>
            <span className="text-xs text-purple-700">(0)</span>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            <Plus size={14} />
            New Side Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          Side Projects ({sideProjects.length})
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-purple-700">Secondary orbit mini-projects</p>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-white border-2 border-purple-300 rounded-lg p-3 mb-3">
          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            placeholder="Side project title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newProjectTitle.trim()}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewProjectTitle('');
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sideProjects.map(project => (
          <div
            key={project.id}
            className="bg-white border-2 border-purple-300 rounded-lg"
            style={{
              borderLeftWidth: '6px',
              borderLeftColor: project.color || '#A855F7',
            }}
          >
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => toggleExpanded(project.id)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                  <Sparkles size={16} className="text-purple-600" />
                  <h4 className="font-medium text-gray-900">{project.title}</h4>
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    {project.total_items_count} items
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === project.id ? null : project.id);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mt-2 ml-8">{project.description}</p>
              )}

              {expandedProjects.has(project.id) && (
                <div className="mt-3 ml-8 pl-4 border-l-2 border-purple-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-purple-50 rounded px-2 py-1">
                      <span className="text-purple-700">Roadmap items:</span>{' '}
                      <span className="font-medium">{project.roadmap_items_count}</span>
                    </div>
                    <div className="bg-purple-50 rounded px-2 py-1">
                      <span className="text-purple-700">Nodes:</span>{' '}
                      <span className="font-medium">{project.nodes_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {openMenuId === project.id && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    handleConvertToMaster(project.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowUp size={14} />
                  Convert to Master Project
                </button>
                <button
                  onClick={() => {
                    handleArchive(project.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-amber-600"
                >
                  <Archive size={14} />
                  Archive
                </button>
                <button
                  onClick={() => {
                    handleDelete(project.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
