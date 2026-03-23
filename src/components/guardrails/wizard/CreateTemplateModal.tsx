import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createUserTrackTemplate, createUserSubTrackTemplate } from '../../../lib/guardrails/userTemplates';
import type { DomainType } from '../../../lib/guardrails/templateTypes';

interface SubTrackInput {
  id: string;
  name: string;
  description: string;
}

interface CreateTemplateModalProps {
  domainType: DomainType;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTemplateModal({ domainType, onClose, onSuccess }: CreateTemplateModalProps) {
  const [trackName, setTrackName] = useState('');
  const [trackDescription, setTrackDescription] = useState('');
  const [subtracks, setSubtracks] = useState<SubTrackInput[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSubtrack = () => {
    setSubtracks([
      ...subtracks,
      {
        id: Math.random().toString(36).substring(7),
        name: '',
        description: '',
      },
    ]);
  };

  const handleRemoveSubtrack = (id: string) => {
    setSubtracks(subtracks.filter(st => st.id !== id));
  };

  const handleSubtrackChange = (id: string, field: 'name' | 'description', value: string) => {
    setSubtracks(subtracks.map(st =>
      st.id === id ? { ...st, [field]: value } : st
    ));
  };

  const handleCreate = async () => {
    if (!trackName.trim()) {
      setError('Track name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const trackTemplate = await createUserTrackTemplate({
        domain_type: domainType,
        name: trackName.trim(),
        description: trackDescription.trim() || undefined,
        ordering_index: 999,
      });

      for (let i = 0; i < subtracks.length; i++) {
        const subtrack = subtracks[i];
        if (subtrack.name.trim()) {
          await createUserSubTrackTemplate({
            user_track_template_id: trackTemplate.id,
            name: subtrack.name.trim(),
            description: subtrack.description.trim() || undefined,
            ordering_index: i,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create template:', err);
      setError(err.message || 'Failed to create template');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create Custom Template</h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Track Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="e.g., Content Strategy, UI Design, Database Setup"
              disabled={isCreating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={trackDescription}
              onChange={(e) => setTrackDescription(e.target.value)}
              placeholder="Describe what this track encompasses..."
              rows={3}
              disabled={isCreating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Subtracks (optional)
              </label>
              <button
                onClick={handleAddSubtrack}
                disabled={isCreating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Subtrack
              </button>
            </div>

            {subtracks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                No subtracks added yet. Click "Add Subtrack" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {subtracks.map((subtrack, index) => (
                  <div key={subtrack.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Subtrack {index + 1} Name
                          </label>
                          <input
                            type="text"
                            value={subtrack.name}
                            onChange={(e) => handleSubtrackChange(subtrack.id, 'name', e.target.value)}
                            placeholder="e.g., Research, Planning, Implementation"
                            disabled={isCreating}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description (optional)
                          </label>
                          <input
                            type="text"
                            value={subtrack.description}
                            onChange={(e) => handleSubtrackChange(subtrack.id, 'description', e.target.value)}
                            placeholder="Brief description of this subtrack..."
                            disabled={isCreating}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSubtrack(subtrack.id)}
                        disabled={isCreating}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !trackName.trim()}
            className={`
              px-6 py-2 text-sm font-semibold rounded-lg transition-all
              ${
                trackName.trim() && !isCreating
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              'Create Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
