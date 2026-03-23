import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { createTrackerFromTemplate } from '../../lib/trackerStudio/trackerService';
import type { TrackerTemplate } from '../../lib/trackerStudio/types';

type CreateTrackerFromTemplateModalProps = {
  template: TrackerTemplate;
  isOpen: boolean;
  onClose: () => void;
  onTrackerCreated: (trackerId: string) => void;
};

export function CreateTrackerFromTemplateModal({
  template,
  isOpen,
  onClose,
  onTrackerCreated,
}: CreateTrackerFromTemplateModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if this is the Fitness Tracker template
  const isFitnessTracker = template.name === 'Fitness Tracker';

  // Auto-populate tracker name from template when modal opens
  useEffect(() => {
    if (isOpen && template) {
      setName(template.name);
      setDescription(template.description || '');
      setError(null);
    } else if (!isOpen) {
      // Reset form when modal closes
      setName('');
      setDescription('');
      setError(null);
    }
  }, [isOpen, template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If Fitness Tracker, redirect to discovery flow
    if (isFitnessTracker) {
      onClose();
      navigate('/fitness-tracker/discovery');
      return;
    }
    
    if (!name.trim()) {
      setError('Tracker name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const tracker = await createTrackerFromTemplate({
        template_id: template.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onTrackerCreated(tracker.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tracker');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Tracker</h2>
            <p className="text-sm text-gray-600 mt-1">From template: {template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="tracker-name" className="block text-sm font-medium text-gray-700 mb-1">
              Tracker Name *
            </label>
            <input
              id="tracker-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="e.g., My Sleep Tracker"
            />
          </div>

          <div>
            <label htmlFor="tracker-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="tracker-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
              placeholder="Optional description for this tracker"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
