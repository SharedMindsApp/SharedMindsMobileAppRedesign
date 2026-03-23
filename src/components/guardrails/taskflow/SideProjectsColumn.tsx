import { useState, useEffect } from 'react';
import { Sparkles, Plus, ChevronDown, ChevronRight, MoreVertical, ArrowUp, Archive, Trash2 } from 'lucide-react';
import {
  getSideProjectsWithStats,
  getSideProjectItems,
  createSideProject,
  archiveSideProject,
  deleteSideProject,
  convertSideProjectToMasterProject,
  removeItemFromSideProject,
} from '../../../lib/guardrails/sideProjects';
import type { SideProjectWithStats } from '../../../lib/guardrails/sideProjects';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Props {
  masterProjectId: string;
  onRefresh: () => void;
  onItemClick?: (item: any) => void;
}

export function SideProjectsColumn({ masterProjectId, onRefresh, onItemClick }: Props) {
  const [sideProjects, setSideProjects] = useState<SideProjectWithStats[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectItems, setProjectItems] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { setNodeRef } = useDroppable({
    id: 'side_projects_column',
  });

  useEffect(() => {
    loadSideProjects();
  }, [masterProjectId]);

  async function loadSideProjects() {
    try {
      setLoading(true);
      const data = await getSideProjectsWithStats(masterProjectId);
      setSideProjects(data);

      for (const project of data) {
        if (expandedProjects.has(project.id)) {
          await loadProjectItems(project.id);
        }
      }
    } catch (error) {
      console.error('Failed to load side projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectItems(projectId: string) {
    try {
      const items = await getSideProjectItems(projectId);
      const allItems = [...items.roadmapItems, ...items.nodes];
      setProjectItems(prev => new Map(prev).set(projectId, allItems));
    } catch (error) {
      console.error('Failed to load project items:', error);
    }
  }

  async function toggleExpanded(projectId: string) {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      await loadProjectItems(projectId);
    }
    setExpandedProjects(newExpanded);
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
    if (!confirm('Delete this side project? All items will be unassigned.')) return;

    try {
      await deleteSideProject(id);
      await loadSideProjects();
      onRefresh();
    } catch (error) {
      console.error('Failed to delete side project:', error);
    }
  }

  async function handleConvertToMaster(id: string) {
    if (!confirm('Convert this side project to a full Master Project?')) return;

    try {
      await convertSideProjectToMasterProject(id);
      await loadSideProjects();
      onRefresh();
      alert('Converted to Master Project successfully!');
    } catch (error) {
      console.error('Failed to convert:', error);
    }
  }

  async function handleRemoveItem(itemId: string, type: 'roadmap_item' | 'node') {
    try {
      await removeItemFromSideProject(itemId, type);
      await loadSideProjects();
      onRefresh();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }

  return (
    <div className="flex-shrink-0 w-80" ref={setNodeRef}>
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            <h3 className="font-semibold text-purple-900">Side Projects</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-medium rounded-full">
              {sideProjects.length}
            </span>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1 hover:bg-purple-100 rounded"
              title="New Side Project"
            >
              <Plus size={16} className="text-purple-700" />
            </button>
          </div>
        </div>

        <p className="text-xs text-purple-700 mb-4">
          Secondary mini-projects. Drag cards here to assign to a side project.
        </p>

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
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectTitle('');
                }}
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 min-h-[200px]">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-lg p-3 border-2 border-purple-300 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : sideProjects.length === 0 ? (
            <div className="text-center py-8 text-purple-600 text-sm">
              No side projects yet. Create one above.
            </div>
          ) : (
            sideProjects.map(project => (
              <div
                key={project.id}
                className="bg-white border-2 border-purple-300 rounded-lg overflow-hidden"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: project.color || '#A855F7',
                }}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => toggleExpanded(project.id)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {expandedProjects.has(project.id) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <Sparkles size={14} className="text-purple-600" />
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {project.title}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {project.total_items_count} items
                    </span>
                  </div>

                  {expandedProjects.has(project.id) && (
                    <div className="mt-3 space-y-2">
                      <SortableContext
                        items={(projectItems.get(project.id) || []).map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {(projectItems.get(project.id) || []).map(item => (
                          <div
                            key={item.id}
                            onClick={() => onItemClick?.(item)}
                            className="bg-purple-50 border border-purple-200 rounded p-2 text-xs cursor-pointer hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-900 line-clamp-2">
                                {item.title}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(
                                    item.id,
                                    'node_type' in item ? 'node' : 'roadmap_item'
                                  );
                                }}
                                className="text-gray-400 hover:text-red-600 flex-shrink-0"
                                title="Remove from side project"
                              >
                                <ArrowUp size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </SortableContext>

                      {(projectItems.get(project.id) || []).length === 0 && (
                        <div className="text-xs text-purple-600 text-center py-2">
                          No items yet. Drag cards here.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {openMenuId === project.id && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
                    <button
                      onClick={() => {
                        handleConvertToMaster(project.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
                    >
                      <ArrowUp size={12} />
                      Convert to Master Project
                    </button>
                    <button
                      onClick={() => {
                        handleArchive(project.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2 text-amber-600"
                    >
                      <Archive size={12} />
                      Archive
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(project.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
