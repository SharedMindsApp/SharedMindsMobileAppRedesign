import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { createGlobalTemplate } from '../../lib/trackerStudio/trackerTemplateService';
import { isCurrentUserAdminOrDeveloper } from '../../lib/admin/adminUtils';
import type { TrackerFieldSchema, TrackerFieldType, TrackerEntryGranularity } from '../../lib/trackerStudio/types';
import { showToast } from '../Toast';

export function CreateGlobalTemplatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entryGranularity, setEntryGranularity] = useState<TrackerEntryGranularity>('daily');
  const [fields, setFields] = useState<TrackerFieldSchema[]>([
    { id: 'field-1', label: 'Value', type: 'text' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check admin status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAdmin = await isCurrentUserAdminOrDeveloper();
      if (!isAdmin) {
        showToast('error', 'Only admins can create global templates');
        navigate('/tracker-studio/templates');
        return;
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const fieldTypes: { value: TrackerFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'date', label: 'Date' },
  ];

  const addField = () => {
    const newId = `field-${Date.now()}`;
    setFields([...fields, { id: newId, label: 'New Field', type: 'text' }]);
  };

  const removeField = (fieldId: string) => {
    if (fields.length === 1) {
      setError('Template must have at least one field');
      return;
    }
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const updateField = (fieldId: string, updates: Partial<TrackerFieldSchema>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (fields.length === 0) {
      setError('Template must have at least one field');
      return;
    }

    // Validate field IDs are unique
    const fieldIds = fields.map(f => f.id);
    if (new Set(fieldIds).size !== fieldIds.length) {
      setError('Field IDs must be unique');
      return;
    }

    setLoading(true);
    try {
      const template = await createGlobalTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        field_schema: fields,
        entry_granularity: entryGranularity,
        published_at: new Date().toISOString(),
      });

      showToast('success', 'Global template created successfully');
      navigate('/tracker-studio/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create global template');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/tracker-studio/templates')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Templates
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Global Template</h1>
            <p className="text-gray-600">
              Create a template that will be visible to all users. This template will be locked and can only be edited by admins.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Sleep Tracker"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Describe what this template is for..."
                disabled={loading}
              />
            </div>

            {/* Entry Granularity */}
            <div>
              <label htmlFor="granularity" className="block text-sm font-medium text-gray-700 mb-2">
                Entry Granularity *
              </label>
              <select
                id="granularity"
                value={entryGranularity}
                onChange={(e) => setEntryGranularity(e.target.value as TrackerEntryGranularity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="daily">Daily</option>
                <option value="session">Session</option>
                <option value="event">Event</option>
                <option value="range">Range</option>
              </select>
            </div>

            {/* Fields */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Fields *
                </label>
                <button
                  type="button"
                  onClick={addField}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                  disabled={loading}
                >
                  <Plus size={16} />
                  Add Field
                </button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        disabled={loading || fields.length === 1}
                        title="Remove field"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Field label"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Type *
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as TrackerFieldType })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                          disabled={loading}
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Validation options for number/rating */}
                    {(field.type === 'number' || field.type === 'rating') && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Min Value
                          </label>
                          <input
                            type="number"
                            value={field.validation?.min ?? ''}
                            onChange={(e) => updateField(field.id, {
                              validation: {
                                ...field.validation,
                                min: e.target.value ? Number(e.target.value) : undefined,
                              },
                            })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max Value
                          </label>
                          <input
                            type="number"
                            value={field.validation?.max ?? ''}
                            onChange={(e) => updateField(field.id, {
                              validation: {
                                ...field.validation,
                                max: e.target.value ? Number(e.target.value) : undefined,
                              },
                            })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/tracker-studio/templates')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Global Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
