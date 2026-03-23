/**
 * SideProjectsMobileList - Mobile-first side projects review and decision surface
 * 
 * Features:
 * - Single-column vertical list
 * - Swipe actions for promote/archive
 * - Long-press action menu
 * - Create/edit via bottom sheet
 * - Empty states with clear guidance
 */

import { useState, useEffect, useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { MasterProject } from '../../../lib/guardrailsTypes';
import type { TrackWithStats as TrackWithStatsType } from '../../../lib/guardrails/trackService';
import { SideProjectMobileCard } from './SideProjectMobileCard';
import { CreateEditSideProjectBottomSheet } from './CreateEditSideProjectBottomSheet';
import { promoteSideProjectToMaster, archiveTrack, deleteTrack, updateTrack, createTrack } from '../../../lib/guardrails/trackService';
import { showToast } from '../../Toast';

interface SideProjectsMobileListProps {
  projects: TrackWithStatsType[];
  activeProject: MasterProject;
  onRefresh: () => void;
}

export function SideProjectsMobileList({
  projects,
  activeProject,
  onRefresh,
}: SideProjectsMobileListProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [editingProject, setEditingProject] = useState<TrackWithStatsType | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'items'>('recent');

  // Get domain ID from active project
  const domainId = (activeProject as any).domain_id || null;

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'items':
          return b.totalItemsCount - a.totalItemsCount;
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [projects, sortBy]);

  const handlePromoteToMaster = async (id: string) => {
    if (!confirm('Convert this side project to a full Master Project? This will create a new independent project.')) return;

    if (!domainId) {
      showToast('error', 'Domain ID is required for promotion');
      return;
    }

    try {
      await promoteSideProjectToMaster(id, domainId);
      showToast('success', 'Side project promoted to Master Project');
      onRefresh();
    } catch (error) {
      console.error('Failed to promote side project:', error);
      showToast('error', 'Failed to promote side project');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this side project? All items will remain but be unassigned.')) return;

    try {
      await archiveTrack(id);
      showToast('success', 'Side project archived');
      onRefresh();
    } catch (error) {
      console.error('Failed to archive side project:', error);
      showToast('error', 'Failed to archive side project');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this side project? All items will be unassigned. This cannot be undone.')) return;

    try {
      await deleteTrack(id);
      showToast('success', 'Side project deleted');
      onRefresh();
    } catch (error) {
      console.error('Failed to delete side project:', error);
      showToast('error', 'Failed to delete side project');
    }
  };

  const handleEdit = (project: TrackWithStatsType) => {
    setEditingProject(project);
  };

  const handleCreate = async (data: { title: string; description: string; color: string }) => {
    await createTrack({
      masterProjectId: activeProject.id,
      name: data.title,
      description: data.description,
      color: data.color,
      category: 'side_project',
      includeInRoadmap: false,
    });
    showToast('success', 'Side project created');
    onRefresh();
  };

  const handleUpdate = async (data: { title: string; description: string; color: string }) => {
    if (!editingProject) return;
    await updateTrack(editingProject.id, {
      name: data.title,
      description: data.description,
      color: data.color,
    });
    showToast('success', 'Side project updated');
    setEditingProject(null);
    onRefresh();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Sort Control - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name (A-Z)</option>
            <option value="items">Most Items</option>
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {sortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Side Projects Yet
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Side projects are ideas that have earned more attention, but aren't yet core work.
              </p>
              <button
                onClick={() => setShowCreateSheet(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus size={16} />
                <span>Create Side Project</span>
              </button>
            </div>
          </div>
        ) : (
          sortedProjects.map((project) => (
            <SideProjectMobileCard
              key={project.id}
              project={project}
              onPromoteToMaster={handlePromoteToMaster}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {/* Create FAB */}
      <button
        onClick={() => setShowCreateSheet(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Create side project"
      >
        <Plus size={24} />
      </button>

      {/* Create/Edit Bottom Sheet */}
      <CreateEditSideProjectBottomSheet
        masterProjectId={activeProject.id}
        isOpen={showCreateSheet || !!editingProject}
        onClose={() => {
          setShowCreateSheet(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdate : handleCreate}
        project={editingProject}
      />
    </div>
  );
}

