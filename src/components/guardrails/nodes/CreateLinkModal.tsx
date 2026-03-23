import { useState } from 'react';
import { X, Link2 } from 'lucide-react';
import type { RoadmapLinkType } from '../../../lib/guardrailsTypes';
import { createRoadmapLink } from '../../../lib/guardrails';

interface CreateLinkModalProps {
  sourceItemId: string;
  targetItemId: string;
  sourceItemTitle: string;
  targetItemTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const linkTypeOptions: Array<{ value: RoadmapLinkType; label: string; description: string }> = [
  {
    value: 'dependency',
    label: 'Dependency',
    description: 'Target depends on source being completed',
  },
  {
    value: 'related',
    label: 'Related',
    description: 'Items are related but not blocking',
  },
  {
    value: 'blocks',
    label: 'Blocks',
    description: 'Source blocks the target from proceeding',
  },
  {
    value: 'influences',
    label: 'Influences',
    description: 'Source influences or informs the target',
  },
];

export function CreateLinkModal({
  sourceItemId,
  targetItemId,
  sourceItemTitle,
  targetItemTitle,
  isOpen,
  onClose,
  onSuccess,
}: CreateLinkModalProps) {
  const [linkType, setLinkType] = useState<RoadmapLinkType>('dependency');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await createRoadmapLink({
        source_item_id: sourceItemId,
        target_item_id: targetItemId,
        link_type: linkType,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Create Link</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreate} className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <p className="text-sm font-medium text-gray-900">{sourceItemTitle}</p>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <span className="text-gray-400">→</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <p className="text-sm font-medium text-gray-900">{targetItemTitle}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Type *
              </label>
              <div className="space-y-2">
                {linkTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      linkType === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="linkType"
                      value={option.value}
                      checked={linkType === option.value}
                      onChange={(e) => setLinkType(e.target.value as RoadmapLinkType)}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context or details about this relationship"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <Link2 size={18} />
                Create Link
              </button>
              <button
                type="button"
                onClick={onClose}
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
