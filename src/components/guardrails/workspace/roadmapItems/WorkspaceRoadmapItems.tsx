/**
 * WorkspaceRoadmapItems Component
 * 
 * Phase 3.7: Roadmap Items Micro-App (Workspace)
 * 
 * Roadmap items management for Track & Subtrack Workspaces.
 * This is the workspace mutation surface for roadmap items.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display roadmap items list (via service layer)
 * - ✅ Create roadmap items (via service layer)
 * - ✅ Edit roadmap items (via service layer)
 * - ✅ Delete roadmap items (via service layer)
 * - ✅ Filter items by type/status
 * - ✅ Navigate to Roadmap with focus
 * - ✅ Manage local draft state
 * - ✅ Warn about unsaved changes
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Mutate roadmap UI state in DB
 * 
 * Phase 3.7 Scope:
 * - Read/Write: roadmap_items (via roadmapService)
 * - Roadmap Items belong to Workspaces (mutation surface)
 * - Roadmap UI remains read-only
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, X, Save, Loader2, AlertCircle, Calendar, Target, CheckCircle2, Flag } from 'lucide-react';
import {
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  type RoadmapItem,
  type CreateRoadmapItemInput,
  type UpdateRoadmapItemInput,
} from '../../../../lib/guardrails/roadmapService';
import {
  getRoadmapItemsForWorkspace,
  formatRoadmapItemDate,
  formatRoadmapItemDateRange,
  getRoadmapItemTypeLabel,
  getRoadmapItemStatusLabel,
  getRoadmapItemTypeColor,
  getRoadmapItemStatusColor,
  focusRoadmapOnTrack,
} from '../../../../lib/guardrails/workspace/roadmapItemsHelpers';
import { BottomSheet } from '../../../shared/BottomSheet';

export interface WorkspaceRoadmapItemsProps {
  // Context data
  projectId: string;
  trackId: string; // Parent track ID (for subtracks, this is the parent; for tracks, this is the track)
  subtrackId?: string | null; // Subtrack ID (null for main tracks)
  
  // Callback to notify about unsaved changes (for tab switching guard)
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

type ItemType = 'task' | 'event' | 'milestone' | 'goal';
type ItemStatus = 'pending' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';
type TypeFilter = 'all' | ItemType;
type StatusFilter = 'all' | ItemStatus;

export function WorkspaceRoadmapItems({
  projectId,
  trackId,
  subtrackId = null,
  onUnsavedChangesChange,
}: WorkspaceRoadmapItemsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Form state
  const [formType, setFormType] = useState<ItemType>('task');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<ItemStatus>('pending');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [projectId, trackId, subtrackId]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const workspaceItems = await getRoadmapItemsForWorkspace(projectId, trackId, subtrackId);
      setItems(workspaceItems);
    } catch (err) {
      console.error('[WorkspaceRoadmapItems] Error loading items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load roadmap items');
    } finally {
      setLoading(false);
    }
  }, [projectId, trackId, subtrackId]);

  // Detect unsaved changes
  useEffect(() => {
    const dirty = sheetOpen && (
      formTitle.trim() !== '' ||
      formDescription.trim() !== '' ||
      formStartDate !== '' ||
      formEndDate !== '' ||
      formDueDate !== '' ||
      formDate !== ''
    );
    setHasUnsavedChanges(dirty);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(dirty);
    }
  }, [sheetOpen, formTitle, formDescription, formStartDate, formEndDate, formDueDate, formDate, onUnsavedChangesChange]);

  // Handle start create
  const handleStartCreate = useCallback(() => {
    setEditingItemId(null);
    setFormType('task');
    setFormTitle('');
    setFormDescription('');
    setFormStatus('pending');
    setFormStartDate('');
    setFormEndDate('');
    setFormDueDate('');
    setFormDate('');
    setError(null);
    setSheetOpen(true);
  }, []);

  // Handle start edit
  const handleStartEdit = useCallback((item: RoadmapItem) => {
    setEditingItemId(item.id);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormStatus(item.status);
    setFormStartDate(item.startDate ? item.startDate.split('T')[0] : '');
    setFormEndDate(item.endDate ? item.endDate.split('T')[0] : '');
    setFormDueDate(item.endDate ? item.endDate.split('T')[0] : ''); // Tasks use endDate as due
    setFormDate(item.startDate ? item.startDate.split('T')[0] : item.endDate ? item.endDate.split('T')[0] : '');
    setError(null);
    setSheetOpen(true);
  }, []);

  // Handle close sheet
  const handleCloseSheet = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Discard changes?')) {
        return;
      }
    }
    setSheetOpen(false);
    setEditingItemId(null);
    setFormTitle('');
    setFormDescription('');
    setFormStartDate('');
    setFormEndDate('');
    setFormDueDate('');
    setFormDate('');
    setError(null);
  }, [hasUnsavedChanges]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!formTitle.trim()) {
      setError('Title is required');
      return;
    }

    // Validate dates based on type
    if (formType === 'event' && !formStartDate) {
      setError('Start date is required for events');
      return;
    }
    if (formType === 'event' && formStartDate && formEndDate && formEndDate < formStartDate) {
      setError('End date must be after start date');
      return;
    }
    if (formType === 'milestone' && !formDate) {
      setError('Date is required for milestones');
      return;
    }
    if (formType === 'goal' && !formEndDate) {
      setError('Target date is required for goals');
      return;
    }

    try {
      setError(null);

      const baseInput: any = {
        masterProjectId: projectId,
        trackId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        status: formStatus,
      };

      // Set dates based on type
      if (formType === 'event') {
        baseInput.startDate = formStartDate ? `${formStartDate}T00:00:00.000Z` : null;
        baseInput.endDate = formEndDate ? `${formEndDate}T23:59:59.999Z` : null;
      } else if (formType === 'task') {
        baseInput.endDate = formDueDate ? `${formDueDate}T23:59:59.999Z` : null;
      } else if (formType === 'milestone') {
        baseInput.startDate = formDate ? `${formDate}T00:00:00.000Z` : null;
      } else if (formType === 'goal') {
        baseInput.endDate = formEndDate ? `${formEndDate}T23:59:59.999Z` : null;
      }

      if (editingItemId) {
        // Update existing item
        const updateInput: UpdateRoadmapItemInput = {
          title: baseInput.title,
          description: baseInput.description,
          status: baseInput.status,
          startDate: baseInput.startDate,
          endDate: baseInput.endDate,
        };
        await updateRoadmapItem(editingItemId, updateInput);
      } else {
        // Create new item
        if (subtrackId) {
          baseInput.subtrackId = subtrackId;
        }
        const createInput: CreateRoadmapItemInput = {
          ...baseInput,
          type: formType,
        };
        await createRoadmapItem(createInput);
      }

      await loadItems();
      setSheetOpen(false);
      setEditingItemId(null);
      setFormTitle('');
      setFormDescription('');
      setFormStartDate('');
      setFormEndDate('');
      setFormDueDate('');
      setFormDate('');
    } catch (err) {
      console.error('[WorkspaceRoadmapItems] Error saving item:', err);
      setError(err instanceof Error ? err.message : 'Failed to save roadmap item');
    }
  }, [
    formTitle,
    formDescription,
    formType,
    formStatus,
    formStartDate,
    formEndDate,
    formDueDate,
    formDate,
    projectId,
    trackId,
    subtrackId,
    editingItemId,
    loadItems,
  ]);

  // Handle delete
  const handleDelete = useCallback(
    async (itemId: string) => {
      if (!window.confirm('Are you sure you want to delete this roadmap item?')) {
        return;
      }

      try {
        setDeletingItemId(itemId);
        setError(null);

        await deleteRoadmapItem(itemId);
        await loadItems();
      } catch (err) {
        console.error('[WorkspaceRoadmapItems] Error deleting item:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete roadmap item');
      } finally {
        setDeletingItemId(null);
      }
    },
    [loadItems]
  );

  // Handle view in roadmap
  const handleViewInRoadmap = useCallback(() => {
    focusRoadmapOnTrack(projectId, trackId, subtrackId);
    navigate(`/guardrails/projects/${projectId}/roadmap`);
  }, [projectId, trackId, subtrackId, navigate]);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  // Get date summary for item
  const getItemDateSummary = (item: RoadmapItem): string => {
    switch (item.type) {
      case 'event':
        return formatRoadmapItemDateRange(item.startDate, item.endDate);
      case 'task':
        return item.endDate ? `Due: ${formatRoadmapItemDate(item.endDate)}` : 'No date';
      case 'milestone':
        return formatRoadmapItemDate(item.startDate || item.endDate);
      case 'goal':
        return item.endDate ? `Target: ${formatRoadmapItemDate(item.endDate)}` : 'No date';
      default:
        return 'No date';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading roadmap items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Roadmap Items</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={handleStartCreate}
              disabled={sheetOpen}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <div className="flex gap-1">
                  {(['all', 'task', 'event', 'milestone', 'goal'] as TypeFilter[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        typeFilter === type
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'all' ? 'All' : getRoadmapItemTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex gap-1">
                  {(['all', 'pending', 'in-progress', 'blocked', 'completed'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        statusFilter === status
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : getRoadmapItemStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No roadmap items yet</h3>
              <p className="text-gray-600 mb-4">
                {typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No items match the selected filters.'
                  : 'Create roadmap items to track tasks, events, milestones, and goals.'}
              </p>
              {typeFilter === 'all' && statusFilter === 'all' && (
                <button
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Create your first roadmap item</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isDeleting = deletingItemId === item.id;

                return (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getRoadmapItemTypeColor(item.type)}`}>
                            {getRoadmapItemTypeLabel(item.type)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getRoadmapItemStatusColor(item.status)}`}>
                            {getRoadmapItemStatusLabel(item.status)}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-xs text-gray-500">{getItemDateSummary(item)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleStartEdit(item)}
                          disabled={isDeleting || sheetOpen}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting || sheetOpen}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Delete"
                        >
                          {isDeleting ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                        <button
                          onClick={handleViewInRoadmap}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="View in Roadmap"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={handleCloseSheet}
        title={editingItemId ? 'Edit Roadmap Item' : 'Create Roadmap Item'}
        maxHeight="90vh"
        closeOnBackdrop={true}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCloseSheet}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              <span>{editingItemId ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          {/* Type */}
          <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['task', 'event', 'milestone', 'goal'] as ItemType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormType(type);
                        // Clear dates when switching types
                        setFormStartDate('');
                        setFormEndDate('');
                        setFormDueDate('');
                        setFormDate('');
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        formType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {getRoadmapItemTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Roadmap item title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Status (not for events) */}
              {formType !== 'event' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ItemStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {/* Dates based on type */}
              {formType === 'event' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date (optional)</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      min={formStartDate || undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {formType === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (optional)</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {formType === 'milestone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {formType === 'goal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
        </div>
      </BottomSheet>
    </div>
  );
}
