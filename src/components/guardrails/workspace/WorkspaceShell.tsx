/**
 * WorkspaceShell Component
 * 
 * Phase 3.0: Track & Subtrack Workspace Foundation
 * 
 * Reusable shell component for Track and Subtrack Workspaces.
 * Provides header, breadcrumbs, tab navigation, and content outlet.
 * 
 * ARCHITECTURAL RULES (Phase 3.0):
 * 
 * What this component CAN do:
 * - ✅ Render workspace shell layout
 * - ✅ Handle navigation (back button, breadcrumbs)
 * - ✅ Manage tab state and switching
 * - ✅ Render placeholder tab content
 * 
 * What this component MUST NOT do:
 * - ❌ Fetch domain data (done by parent components)
 * - ❌ Mutate domain data (Phase 3.0 is read-only)
 * - ❌ Implement micro-app logic (deferred to Phase 3.x)
 * - ❌ Query Supabase directly
 * 
 * Phase 3.0: Tabs are placeholders only. No domain logic yet.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderTree, Target, FileText, BookOpen, Calendar, DollarSign, List, MoreVertical, Edit2, Trash2, Loader2, Shield } from 'lucide-react';
import { WorkspaceOverview } from './overview/WorkspaceOverview';
import { WorkspaceObjectives } from './objectives/WorkspaceObjectives';
import { WorkspaceDocuments } from './documents/WorkspaceDocuments';
import { WorkspaceResearch } from './research/WorkspaceResearch';
import { WorkspaceTimePlanning } from './time/WorkspaceTimePlanning';
import { WorkspaceFinancials } from './financials/WorkspaceFinancials';
import { WorkspaceRoadmapItems } from './roadmapItems/WorkspaceRoadmapItems';
import { EditTrackModal } from './EditTrackModal';
import { ConfirmDialog } from '../../ConfirmDialog';
import { softDeleteTrack } from '../../../lib/guardrails/trackSoftDeleteService';
import { updateTrack } from '../../../lib/guardrails/tracksHierarchy';
import type { TrackV2 } from '../../../lib/guardrails/tracksHierarchy';
import { ENABLE_ENTITY_GRANTS } from '../../../lib/featureFlags';
import { useCanEditTrack } from '../../../hooks/permissions/useCanEditTrack';

export type WorkspaceTab = 'overview' | 'objectives' | 'documents' | 'research' | 'time-planning' | 'financials' | 'roadmap-items';

export interface WorkspaceShellProps {
  // Context data
  projectId: string;
  projectName: string;
  trackId: string;
  trackName: string;
  trackDescription?: string | null;
  trackColor?: string | null;
  parentTrackId?: string | null;
  parentTrackName?: string | null;
  isSubtrack?: boolean;
  
  // Navigation
  backUrl: string; // URL to navigate back to (typically Roadmap)
  
  // Optional: Default tab
  defaultTab?: WorkspaceTab;
  
  // Optional: Callbacks
  onTrackMetadataChange?: () => void;
  onObjectivesChange?: () => void;
}

export function WorkspaceShell({
  projectId,
  projectName,
  trackId,
  trackName,
  trackDescription,
  trackColor,
  parentTrackId,
  parentTrackName,
  isSubtrack = false,
  backUrl,
  defaultTab = 'overview',
  onTrackMetadataChange,
  onObjectivesChange,
}: WorkspaceShellProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(defaultTab);
  const [isMobile, setIsMobile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Phase 5.1: Check edit permission for Permissions menu item
  const { canEdit: canEditTrack, loading: permissionLoading } = useCanEditTrack(trackId);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  const handleBack = () => {
    navigate(backUrl);
  };

  // Handle edit action
  const handleEditClick = () => {
    setMenuOpen(false);
    setEditModalOpen(true);
  };

  // Handle delete action
  const handleDeleteClick = () => {
    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await softDeleteTrack(trackId);
      // After soft delete, navigate back to roadmap
      navigate(backUrl);
    } catch (error) {
      console.error('[WorkspaceShell] Failed to soft delete track:', error);
      alert('Failed to delete track. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Handle save from EditTrackModal
  const handleEditModalSave = async (name: string, description: string | null, color: string | null) => {
    try {
      await updateTrack(trackId, {
        name,
        description,
        color,
      });
      // Call the parent's onTrackMetadataChange to update the UI
      if (onTrackMetadataChange) {
        onTrackMetadataChange();
      }
      setEditModalOpen(false);
    } catch (error) {
      console.error('[WorkspaceShell] Failed to update track:', error);
      throw error; // Let EditTrackModal handle the error display
    }
  };

  // Handle tab change with unsaved changes guard
  const handleTabChange = (newTab: WorkspaceTab) => {
    if (hasUnsavedChanges) {
      const tabNames: Record<WorkspaceTab, string> = {
        'overview': 'overview',
        'objectives': 'objectives',
        'documents': 'documents',
        'research': 'research',
        'time-planning': 'time planning',
        'financials': 'financials',
        'roadmap-items': 'roadmap items',
      };
      const tabName = tabNames[activeTab] || activeTab;
      const confirmed = window.confirm(
        `You have unsaved changes to your ${tabName}. Are you sure you want to switch tabs? Your changes will be lost.`
      );
      if (!confirmed) {
        return;
      }
    }
    setActiveTab(newTab);
    setHasUnsavedChanges(false);
  };

  // Tab definitions (placeholders for Phase 3.0)
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FolderTree }> = [
    { id: 'overview', label: 'Overview', icon: FolderTree },
    { id: 'objectives', label: 'Objectives', icon: Target },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'research', label: 'Research', icon: BookOpen },
    { id: 'time-planning', label: 'Time Planning', icon: Calendar },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'roadmap-items', label: 'Roadmap Items', icon: List },
  ];

  // Render tab content
  const renderTabContent = () => {
    // Phase 3.1: Overview tab is implemented
    if (activeTab === 'overview') {
      return (
        <WorkspaceOverview
          projectId={projectId}
          trackId={trackId}
          trackName={trackName}
          trackDescription={trackDescription || null}
          trackColor={trackColor || null}
          isSubtrack={isSubtrack}
          onTrackMetadataChange={onTrackMetadataChange}
        />
      );
    }

    // Phase 3.2: Objectives tab is implemented
    if (activeTab === 'objectives') {
      return (
        <WorkspaceObjectives
          projectId={projectId}
          trackId={trackId}
          onObjectivesChange={onObjectivesChange || onTrackMetadataChange}
          onUnsavedChangesChange={setHasUnsavedChanges}
        />
      );
    }

    // Phase 3.3: Documents tab is implemented
    if (activeTab === 'documents') {
      return (
        <WorkspaceDocuments
          projectId={projectId}
          trackId={isSubtrack ? (parentTrackId || trackId) : trackId}
          subtrackId={isSubtrack ? trackId : null}
        />
      );
    }

    // Phase 3.4: Research tab is implemented
    if (activeTab === 'research') {
      return (
        <WorkspaceResearch
          projectId={projectId}
          trackId={isSubtrack ? (parentTrackId || trackId) : trackId}
          subtrackId={isSubtrack ? trackId : null}
        />
      );
    }

    // Phase 3.5: Time Planning tab is implemented
    if (activeTab === 'time-planning') {
      return (
        <WorkspaceTimePlanning
          projectId={projectId}
          trackId={isSubtrack ? (parentTrackId || trackId) : trackId}
          subtrackId={isSubtrack ? trackId : null}
          onTimePlanningChange={onTrackMetadataChange}
          onUnsavedChangesChange={setHasUnsavedChanges}
        />
      );
    }

    // Phase 3.6: Financials tab is implemented
    if (activeTab === 'financials') {
      return (
        <WorkspaceFinancials
          projectId={projectId}
          trackId={isSubtrack ? (parentTrackId || trackId) : trackId}
          subtrackId={isSubtrack ? trackId : null}
          onUnsavedChangesChange={setHasUnsavedChanges}
        />
      );
    }

    // Phase 3.7: Roadmap Items tab is implemented
    if (activeTab === 'roadmap-items') {
      return (
        <WorkspaceRoadmapItems
          projectId={projectId}
          trackId={isSubtrack ? (parentTrackId || trackId) : trackId}
          subtrackId={isSubtrack ? trackId : null}
          onUnsavedChangesChange={setHasUnsavedChanges}
        />
      );
    }

    // Other tabs are placeholders (Phase 3.x)
    const activeTabDef = tabs.find(t => t.id === activeTab);
    const Icon = activeTabDef?.icon || FolderTree;
    
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Icon size={32} />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {activeTabDef?.label || 'Overview'}
          </h3>
          <p className="text-gray-600">
            This section will be implemented in Phase 3.x
          </p>
        </div>
      </div>
    );
  };

  // Build breadcrumbs
  const breadcrumbs = [
    { label: projectName, href: `/guardrails/projects/${projectId}/roadmap` },
    ...(isSubtrack && parentTrackId && parentTrackName
      ? [{ label: parentTrackName, href: `/guardrails/projects/${projectId}/workspace/track/${parentTrackId}` }]
      : []),
    { label: trackName, href: null }, // Current page, no link
  ];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        {/* Back button and title */}
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Back to Roadmap"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {trackName}
            </h1>
            {trackDescription && (
              <p className="text-sm text-gray-600 truncate mt-0.5">
                {trackDescription}
              </p>
            )}
          </div>

          {trackColor && (
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: trackColor }}
              aria-label="Track color"
            />
          )}

          {/* Edit/Delete Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Track options"
            >
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleEditClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={16} /> Edit {isSubtrack ? 'Subtrack' : 'Track'}
                </button>
                {/* Phase 5.1: Permissions link (visible only when feature enabled and user has edit permission) */}
                {ENABLE_ENTITY_GRANTS && !permissionLoading && canEditTrack && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`/projects/${projectId}/tracks/${trackId}/permissions`);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Shield size={16} /> Permissions
                  </button>
                )}
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete {isSubtrack ? 'Subtrack' : 'Track'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="px-4 pb-3">
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-gray-400">/</span>}
                {crumb.href ? (
                  <button
                    onClick={() => navigate(crumb.href!)}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      {/* Content area with tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Side tabs */}
        {!isMobile && (
          <aside className="w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            <nav className="p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-300'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderTabContent()}
        </main>
      </div>

      {/* Mobile: Bottom tabs */}
      {isMobile && (
        <nav className="flex-shrink-0 border-t border-gray-200 bg-white safe-bottom">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 min-w-[80px] transition-colors ${
                    isActive
                      ? 'text-blue-600 border-t-2 border-blue-600'
                      : 'text-gray-600'
                  }`}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Edit Track/Subtrack Modal */}
      {editModalOpen && (
        <EditTrackModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          trackId={trackId}
          initialName={trackName}
          initialDescription={trackDescription || null}
          initialColor={trackColor || null}
          onSave={handleEditModalSave}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${isSubtrack ? 'Subtrack' : 'Track'}`}
          message={`Are you sure you want to move "${trackName}" to the Recycle Bin? It will be hidden from the roadmap and workspaces. You can restore it for up to 7 days.`}
          confirmText="Move to Recycle Bin"
          variant="warning"
        />
      )}
    </div>
  );
}
