import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Save, Share2, CheckCircle2 } from 'lucide-react';
import type { RoadmapItem, RoadmapItemStatus, Track } from '../../../lib/guardrails';
import { updateRoadmapItem, deleteRoadmapItem } from '../../../lib/guardrails';
import { formatDateRange } from '../../../lib/ganttUtils';
import { TrackDropdown } from '../tracks/TrackDropdown';
import { syncToPersonalSpace, removeFromPersonalSpace } from '../../../lib/spacesSync';
import { ShareToSpaceModal } from '../../shared/ShareToSpaceModal';
import { getTaskFlowTaskForRoadmapItem, isRoadmapItemTaskFlowEligible } from '../../../lib/guardrails/taskFlowSyncService';
import type { TaskFlowTask } from '../../../lib/guardrails/taskFlowTypes';
import { BottomSheet } from '../../shared/BottomSheet';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';
import { showToast } from '../../Toast';
import { EventCalendarSyncControls } from '../settings/EventCalendarSyncControls';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { getSubTracksForTrack } from '../../../lib/guardrails/subtracks';
import type { SubTrack } from '../../../lib/guardrails/subtracksTypes';

interface ItemDrawerProps {
  item: RoadmapItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  tracks?: Track[];
}

const statusOptions: Array<{ value: RoadmapItemStatus; label: string; color: string }> = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
];

export function ItemDrawer({ item, isOpen, onClose, onUpdate, tracks = [] }: ItemDrawerProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [startDate, setStartDate] = useState(item.startDate || '');
  const [endDate, setEndDate] = useState(item.endDate || '');
  const [status, setStatus] = useState<RoadmapItemStatus>(item.status);
  const [trackId, setTrackId] = useState<string>(item.trackId);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [taskFlowTask, setTaskFlowTask] = useState<TaskFlowTask | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { activeProjectId, activeProject } = useActiveProject();
  const [trackName, setTrackName] = useState<string | undefined>();
  const [subtrackName, setSubtrackName] = useState<string | undefined>();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(item.title);
      setDescription(item.description || '');
      setStartDate(item.startDate || '');
      setEndDate(item.endDate || '');
      setStatus(item.status);
      setTrackId(item.trackId);

      const fetchTaskFlowTask = async () => {
        const linkedTask = await getTaskFlowTaskForRoadmapItem(item.id);
        setTaskFlowTask(linkedTask);
      };

      if (isRoadmapItemTaskFlowEligible(item)) {
        fetchTaskFlowTask();
      } else {
        setTaskFlowTask(null);
      }

      // Load track and subtrack names for calendar sync
      const loadTrackAndSubtrackNames = async () => {
        if (item.trackId) {
          const track = tracks.find(t => t.id === item.trackId);
          setTrackName(track?.name);
          
          if (item.subtrackId) {
            try {
              const subtracks = await getSubTracksForTrack(item.trackId);
              const subtrack = subtracks.find(st => st.id === item.subtrackId);
              setSubtrackName(subtrack?.name);
            } catch (error) {
              console.error('Failed to load subtrack name:', error);
            }
          } else {
            setSubtrackName(undefined);
          }
        } else {
          setTrackName(undefined);
          setSubtrackName(undefined);
        }
      };

      loadTrackAndSubtrackNames();
    }
  }, [item, isOpen, tracks]);

  const handleSave = async () => {
    if (!title.trim() || loading) return;

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      showToast('error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await updateRoadmapItem(item.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || null,
        status,
        trackId,
      });

      await syncToPersonalSpace('roadmap_item', item.id, {
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
        trackId,
      });

      onUpdate();
      onClose();
      showToast('success', 'Item updated successfully');
    } catch (error) {
      console.error('Failed to update item:', error);
      showToast('error', 'Failed to update item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      await deleteRoadmapItem(item.id);
      await removeFromPersonalSpace('roadmap_item', item.id);
      onUpdate();
      onClose();
      showToast('success', 'Item deleted successfully');
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = useCallback(() => (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">Edit Roadmap Item</h2>
    </div>
  ), []);

  const renderContent = useCallback(() => (
    <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {taskFlowTask && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Linked to Task Flow</p>
                  <p className="text-xs text-blue-700">
                    This item is synced to Task Flow for execution tracking
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-blue-700">Status:</span>
                <span className="text-xs font-medium text-blue-900 capitalize">
                  {taskFlowTask.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Calendar Sync Controls */}
          {activeProjectId && activeProject && (
            <EventCalendarSyncControls
              eventId={item.id}
              eventName={item.title}
              entityType="roadmap_event"
              projectId={activeProjectId}
              projectName={activeProject.name}
              trackId={item.trackId || null}
              trackName={trackName}
              subtrackId={item.subtrackId || null}
              subtrackName={subtrackName}
            />
          )}

          {tracks.length > 0 && (
            <TrackDropdown
              tracks={tracks}
              selectedTrackId={trackId}
              onChange={setTrackId}
              allowUnassigned={true}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    status === option.value
                      ? option.color + ' ring-2 ring-offset-2 ring-blue-500'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  disabled={loading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 text-xs text-gray-500">
            <p>Duration: {formatDateRange(startDate, endDate)}</p>
          </div>
    </div>
  ), [title, description, startDate, endDate, status, trackId, loading, tracks, taskFlowTask, setTitle, setDescription, setStartDate, setEndDate, setStatus, setTrackId]);

  const renderFooter = useCallback(() => (
    <div className="space-y-2">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading || !title.trim()}
          >
            <Save size={18} />
            Save Changes
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Share2 size={18} />
            Share to Shared Space
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Trash2 size={18} />
            Delete Item
          </button>
        </div>
  ), [handleSave, handleDelete, loading, title, setShowShareModal]);

  if (!isOpen) return null;

  return (
    <>
      <ConfirmDialogInline
        isOpen={showDeleteConfirm}
        message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={onClose}
          header={renderHeader()}
          footer={renderFooter()}
          maxHeight="90vh"
          showCloseButton={true}
          closeOnBackdrop={!loading}
          preventClose={loading}
        >
          {renderContent()}
        </BottomSheet>
      ) : (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={onClose}
          />
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {renderHeader()}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {renderContent()}
            </div>
            <div className="p-4 border-t border-gray-200">
              {renderFooter()}
            </div>
          </div>
        </>
      )}

      <ShareToSpaceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itemType="roadmap_item"
        itemId={item.id}
        itemTitle={item.title}
      />
    </>
  );
}
