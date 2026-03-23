import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, Save } from 'lucide-react';
import {
  getAllTrackTemplatesAdmin,
  createTrackTemplate,
  updateTrackTemplate,
  deleteTrackTemplate,
} from '../../../lib/admin/templatesAdmin';
import type { SystemTrackTemplate, DomainType } from '../../../lib/guardrails/templateTypes';

interface TrackTemplateFormData {
  name: string;
  domain_type: DomainType;
  description: string;
  is_default: boolean;
  ordering_index: number;
}

export function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<SystemTrackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<TrackTemplateFormData>({
    name: '',
    domain_type: 'work',
    description: '',
    is_default: false,
    ordering_index: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTrackTemplatesAdmin();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      domain_type: 'work',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const startEditing = (template: SystemTrackTemplate) => {
    setEditingId(template.id);
    setCreating(false);
    setFormData({
      name: template.name,
      domain_type: template.domain_type,
      description: template.description || '',
      is_default: template.is_default,
      ordering_index: template.ordering_index,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setCreating(false);
    setFormData({
      name: '',
      domain_type: 'work',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createTrackTemplate({
        name: formData.name,
        domain_type: formData.domain_type,
        description: formData.description || undefined,
        is_default: formData.is_default,
        ordering_index: formData.ordering_index,
      });
      await loadTemplates();
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateTrackTemplate(id, {
        name: formData.name,
        domain_type: formData.domain_type,
        description: formData.description || undefined,
        is_default: formData.is_default,
        ordering_index: formData.ordering_index,
      });
      await loadTemplates();
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the "${templateName}" template? This will also delete all associated sub-tracks. This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteTrackTemplate(id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading track templates...</span>
        </div>
      </div>
    );
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.domain_type]) {
      acc[template.domain_type] = [];
    }
    acc[template.domain_type].push(template);
    return acc;
  }, {} as Record<DomainType, SystemTrackTemplate[]>);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Track Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage track templates that define project structure
            </p>
          </div>
          <button
            onClick={startCreating}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={18} />
            <span>Add Template</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {creating && (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                Create New Track Template
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Development Track"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Type *
                  </label>
                  <select
                    value={formData.domain_type}
                    onChange={(e) => setFormData({ ...formData, domain_type: e.target.value as DomainType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Default Template</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Order:</label>
                    <input
                      type="number"
                      value={formData.ordering_index}
                      onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Template
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {Object.entries(groupedTemplates).map(([domainType, domainTemplates]) => (
            <div key={domainType}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                {domainType.replace('_', ' ')}
              </h3>

              <div className="space-y-3">
                {domainTemplates.map((template) => {
                  const isEditing = editingId === template.id;

                  return (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Domain Type *
                            </label>
                            <select
                              value={formData.domain_type}
                              onChange={(e) => setFormData({ ...formData, domain_type: e.target.value as DomainType })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="work">Work</option>
                              <option value="personal">Personal</option>
                              <option value="creative">Creative</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Default Template</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">Order:</label>
                              <input
                                type="number"
                                value={formData.ordering_index}
                                onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdate(template.id)}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                            >
                              {saving ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  Save Changes
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              {template.is_default && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Default
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Order: {template.ordering_index}
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600">{template.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditing(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit template"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id, template.name)}
                              disabled={saving}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete template"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {templates.length === 0 && !creating && (
            <div className="text-center py-12 text-gray-500">
              <p>No track templates found</p>
              <p className="text-sm mt-1">Click "Add Template" to create one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
