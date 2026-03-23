import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { RoadmapItemStatus, RoadmapItemType, Track } from '../../../lib/guardrails';
import { createRoadmapItem } from '../../../lib/guardrails';
import { TrackDropdown } from '../tracks/TrackDropdown';

interface AddItemModalProps {
  masterProjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tracks?: Track[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialTrackId?: string;
}

const TYPE_OPTIONS: Array<{ value: RoadmapItemType; label: string; requiresDates: boolean }> = [
  { value: 'task', label: 'Task', requiresDates: false },
  { value: 'event', label: 'Event', requiresDates: true },
  { value: 'milestone', label: 'Milestone', requiresDates: true },
  { value: 'goal', label: 'Goal', requiresDates: false },
  { value: 'note', label: 'Note', requiresDates: false },
  { value: 'document', label: 'Document', requiresDates: false },
  { value: 'photo', label: 'Photo', requiresDates: false },
  { value: 'grocery_list', label: 'Grocery List', requiresDates: false },
  { value: 'habit', label: 'Habit', requiresDates: false },
  { value: 'review', label: 'Review', requiresDates: false },
];

const statusOptions: Array<{ value: RoadmapItemStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

export function AddItemModal({
  masterProjectId,
  isOpen,
  onClose,
  onSuccess,
  tracks = [],
  initialStartDate,
  initialEndDate,
  initialTrackId,
}: AddItemModalProps) {
  const [type, setType] = useState<RoadmapItemType>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => {
    if (initialStartDate) return initialStartDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    if (initialEndDate) return initialEndDate;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<RoadmapItemStatus>('not_started');
  const [trackId, setTrackId] = useState<string | null>(initialTrackId || null);
  const [loading, setLoading] = useState(false);

  const selectedTypeOption = TYPE_OPTIONS.find(opt => opt.value === type);
  const requiresDates = selectedTypeOption?.requiresDates || false;

  const resetForm = () => {
    setType('task');
    setTitle('');
    setDescription('');
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setEndDate(nextWeek.toISOString().split('T')[0]);
    setStatus('not_started');
    setTrackId(initialTrackId || null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    if (!trackId) {
      alert('Please select a track for this roadmap item.');
      return;
    }

    if (requiresDates && !startDate) {
      alert(`Item type '${type}' requires a start date`);
      return;
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await createRoadmapItem({
        masterProjectId,
        trackId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create item:', error);
      alert(error.message || 'Failed to create item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Add Roadmap Item
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RoadmapItemType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {tracks.length > 0 && (
              <TrackDropdown
                tracks={tracks}
                selectedTrackId={trackId}
                onChange={setTrackId}
                allowUnassigned={false}
                label="Track *"
              />
            )}

            {tracks.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  No tracks available. Please create a track first.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter item title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date {requiresDates && '*'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  required={requiresDates}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoadmapItemStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading || !title.trim() || !trackId}
              >
                <Plus size={18} />
                Add Item
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
