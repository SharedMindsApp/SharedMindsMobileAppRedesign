import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RoadmapItemType } from '../../../lib/guardrails/coreTypes';

interface RoadmapItemModalProps {
  open: boolean;
  trackId: string;
  trackName: string;
  onClose: () => void;
  onSubmit: (trackId: string, data: {
    type: RoadmapItemType;
    title: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => Promise<void>;
  // Phase 5: Optional preselect type when opened from Quick Actions
  preselectType?: RoadmapItemType;
}

const TYPE_OPTIONS: Array<{ value: RoadmapItemType; label: string; requiresDates: boolean }> = [
  { value: 'event', label: 'Event', requiresDates: true },
  { value: 'milestone', label: 'Milestone', requiresDates: true },
  { value: 'goal', label: 'Goal', requiresDates: false },
  { value: 'task', label: 'Task', requiresDates: false },
  { value: 'note', label: 'Note', requiresDates: false },
  { value: 'document', label: 'Document', requiresDates: false },
  { value: 'photo', label: 'Photo', requiresDates: false },
  { value: 'grocery_list', label: 'Grocery List', requiresDates: false },
  { value: 'habit', label: 'Habit', requiresDates: false },
  { value: 'review', label: 'Review', requiresDates: false },
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export function RoadmapItemModal({ open, trackId, trackName, onClose, onSubmit, preselectType }: RoadmapItemModalProps) {
  const [type, setType] = useState<RoadmapItemType>(preselectType || 'event');
  
  // Phase 5: Reset type when preselectType changes (when modal opens with new type)
  useEffect(() => {
    if (preselectType) {
      setType(preselectType);
    }
  }, [preselectType]);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('not_started');
  const [loading, setLoading] = useState(false);

  const selectedTypeOption = TYPE_OPTIONS.find(opt => opt.value === type);
  const requiresDates = selectedTypeOption?.requiresDates || false;

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;

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
      await onSubmit(trackId, {
        type,
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
      });
      setType('event');
      setTitle('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setStatus('not_started');
    } catch (error: any) {
      console.error('Failed to create item:', error);
      alert(error.message || 'Failed to create roadmap item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Roadmap Item</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Track:</span> {trackName}
            </p>
          </div>

          {/* Phase 5: Hide type selector if type is preselected from Quick Actions */}
          {!preselectType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RoadmapItemType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {opt.requiresDates ? '(requires dates)' : ''}
                  </option>
                ))}
              </select>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter item title"
              required
              disabled={loading}
            />
          </div>

          {/* Phase 5: Show date fields only when required or if dates are already set */}
          {(requiresDates || startDate || endDate) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date {requiresDates ? '*' : ''}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={requiresDates}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !title.trim()}
            >
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
