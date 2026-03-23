import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock, Map, Kanban, Network, Activity, MoreVertical, Edit, Archive, Trash2, ArrowUp } from 'lucide-react';
import {
  getSideProject,
  getSideProjectItems,
  archiveSideProject,
  deleteSideProject,
  convertSideProjectToMasterProject,
  updateSideProject,
} from '../../../lib/guardrails/sideProjects';
import type { SideProject } from '../../../lib/guardrails/sideProjects';

export function SideProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<SideProject | null>(null);
  const [items, setItems] = useState<{ roadmapItems: any[]; nodes: any[] }>({ roadmapItems: [], nodes: [] });
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (id) {
      loadProjectDetails();
    }
  }, [id]);

  async function loadProjectDetails() {
    if (!id) return;

    try {
      setLoading(true);
      const [projectData, itemsData] = await Promise.all([
        getSideProject(id),
        getSideProjectItems(id),
      ]);
      setProject(projectData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load side project details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!id) return;
    if (!confirm('Archive this side project? All items will remain but be unassigned.')) return;

    try {
      await archiveSideProject(id);
      navigate('/guardrails/side-projects');
    } catch (error) {
      console.error('Failed to archive:', error);
      alert('Failed to archive side project');
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('Delete this side project? All items will be unassigned. This cannot be undone.')) return;

    try {
      await deleteSideProject(id);
      navigate('/guardrails/side-projects');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete side project');
    }
  }

  async function handleConvertToMaster() {
    if (!id) return;
    if (!confirm('Convert this side project to a full Master Project?')) return;

    try {
      await convertSideProjectToMasterProject(id);
      alert('Converted to Master Project successfully!');
      navigate('/guardrails/side-projects');
    } catch (error) {
      console.error('Failed to convert:', error);
      alert('Failed to convert to Master Project');
    }
  }

  async function handleEdit() {
    if (!project) return;
    const newTitle = prompt('Enter new title:', project.title);
    if (!newTitle || newTitle === project.title) return;

    try {
      await updateSideProject(project.id, { title: newTitle });
      await loadProjectDetails();
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update side project');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-900 font-medium">Side project not found</p>
          <button
            onClick={() => navigate('/guardrails/side-projects')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Side Projects
          </button>
        </div>
      </div>
    );
  }

  const totalItems = items.roadmapItems.length + items.nodes.length;

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/guardrails/side-projects')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Side Projects
      </button>

      <div className="bg-white border-2 border-purple-200 rounded-lg p-6 mb-6"
        style={{
          borderLeftWidth: '6px',
          borderLeftColor: project.color || '#A855F7',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles size={28} className="text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            </div>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <MoreVertical size={20} className="text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    handleEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit size={14} />
                  Edit Details
                </button>
                <button
                  onClick={() => {
                    handleConvertToMaster();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ArrowUp size={14} />
                  Convert to Master Project
                </button>
                <button
                  onClick={() => {
                    handleArchive();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-amber-600"
                >
                  <Archive size={14} />
                  Archive
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
          <div>
            Updated {new Date(project.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-purple-900 mb-1">{totalItems}</div>
          <div className="text-sm text-purple-700">Total Items</div>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-purple-900 mb-1">{items.roadmapItems.length}</div>
          <div className="text-sm text-purple-700">Roadmap Items</div>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-purple-900 mb-1">{items.nodes.length}</div>
          <div className="text-sm text-purple-700">Mind Mesh Nodes</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/guardrails/roadmap')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          <Map size={20} />
          Open in Roadmap
        </button>
        <button
          onClick={() => navigate('/guardrails/taskflow')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          <Kanban size={20} />
          Open in TaskFlow
        </button>
        <button
          onClick={() => navigate('/guardrails/mindmesh')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          <Network size={20} />
          Open in Mind Mesh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Map size={20} className="text-purple-600" />
            Roadmap Items ({items.roadmapItems.length})
          </h2>
          {items.roadmapItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No roadmap items assigned yet</p>
          ) : (
            <div className="space-y-2">
              {items.roadmapItems.map((item) => (
                <div key={item.id} className="bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Network size={20} className="text-purple-600" />
            Mind Mesh Nodes ({items.nodes.length})
          </h2>
          {items.nodes.length === 0 ? (
            <p className="text-gray-500 text-sm">No nodes assigned yet</p>
          ) : (
            <div className="space-y-2">
              {items.nodes.map((node) => (
                <div key={node.id} className="bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="font-medium text-gray-900">{node.title}</p>
                  {node.content && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{node.content}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded">
                      {node.node_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <Activity size={18} />
          Activity Timeline
        </h3>
        <div className="space-y-2 text-sm text-purple-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span>Created on {new Date(project.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span>Last updated {new Date(project.updated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span>{totalItems} items currently assigned</span>
          </div>
        </div>
      </div>
    </div>
  );
}
