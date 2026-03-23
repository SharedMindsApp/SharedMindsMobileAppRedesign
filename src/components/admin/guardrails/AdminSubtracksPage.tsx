import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';
import {
  getAllTrackTemplatesAdmin,
  getAllSubTrackTemplatesAdmin,
  createSubTrackTemplate,
  updateSubTrackTemplate,
  deleteSubTrackTemplate,
} from '../../../lib/admin/templatesAdmin';
import type { SystemTrackTemplate, SystemSubTrackTemplate } from '../../../lib/guardrails/templateTypes';

interface SubTrackFormData {
  track_template_id: string;
  name: string;
  description: string;
  is_default: boolean;
  ordering_index: number;
}

interface SubTrackWithTemplate extends SystemSubTrackTemplate {
  track_template: SystemTrackTemplate;
}

export function AdminSubtracksPage() {
  const [trackTemplates, setTrackTemplates] = useState<SystemTrackTemplate[]>([]);
  const [subtracks, setSubtracks] = useState<SubTrackWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<SubTrackFormData>({
    track_template_id: '',
    name: '',
    description: '',
    is_default: false,
    ordering_index: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesData, subtracksData] = await Promise.all([
        getAllTrackTemplatesAdmin(),
        getAllSubTrackTemplatesAdmin(),
      ]);

      setTrackTemplates(templatesData);

      const subtracksWithTemplates = subtracksData.map(subtrack => {
        const template = templatesData.find(t => t.id === subtrack.track_template_id);
        return {
          ...subtrack,
          track_template: template!,
        };
      }).filter(s => s.track_template);

      setSubtracks(subtracksWithTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setCreating(true);
    setEditingId(null);
    setFormData({
      track_template_id: trackTemplates[0]?.id || '',
      name: '',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const startEditing = (subtrack: SubTrackWithTemplate) => {
    setEditingId(subtrack.id);
    setCreating(false);
    setFormData({
      track_template_id: subtrack.track_template_id,
      name: subtrack.name,
      description: subtrack.description || '',
      is_default: subtrack.is_default,
      ordering_index: subtrack.ordering_index,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setCreating(false);
    setFormData({
      track_template_id: '',
      name: '',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Sub-track name is required');
      return;
    }
    if (!formData.track_template_id) {
      setError('Track template is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createSubTrackTemplate({
        track_template_id: formData.track_template_id,
        name: formData.name,
        description: formData.description || undefined,
        is_default: formData.is_default,
        ordering_index: formData.ordering_index,
      });
      await loadData();
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub-track');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      setError('Sub-track name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateSubTrackTemplate(id, {
        name: formData.name,
        description: formData.description || undefined,
        is_default: formData.is_default,
        ordering_index: formData.ordering_index,
      });
      await loadData();
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sub-track');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, subtrackName: string) => {
    if (!confirm(`Are you sure you want to delete the "${subtrackName}" sub-track? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteSubTrackTemplate(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sub-track');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading sub-track templates...</span>
        </div>
      </div>
    );
  }

  const groupedSubtracks = subtracks.reduce((acc, subtrack) => {
    const templateId = subtrack.track_template_id;
    if (!acc[templateId]) {
      acc[templateId] = {
        template: subtrack.track_template,
        subtracks: [],
      };
    }
    acc[templateId].subtracks.push(subtrack);
    return acc;
  }, {} as Record<string, { template: SystemTrackTemplate; subtracks: SubTrackWithTemplate[] }>);

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
            <h2 className="text-xl font-semibold text-gray-900">Sub-Track Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage sub-track templates that provide detailed project structure
            </p>
          </div>
          <button
            onClick={startCreating}
            disabled={creating || trackTemplates.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={18} />
            <span>Add Sub-Track</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {creating && (
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={18} className="text-purple-600" />
                Create New Sub-Track Template
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Track Template *
                  </label>
                  <select
                    value={formData.track_template_id}
                    onChange={(e) => setFormData({ ...formData, track_template_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select a track template...</option>
                    {trackTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.domain_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Backend Development"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Default Sub-Track</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Order:</label>
                    <input
                      type="number"
                      value={formData.ordering_index}
                      onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Sub-Track
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

          {Object.values(groupedSubtracks).map(({ template, subtracks: templateSubtracks }) => (
            <div key={template.id}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {template.name} <span className="text-sm font-normal text-gray-500">({template.domain_type})</span>
              </h3>

              <div className="space-y-3">
                {templateSubtracks.map((subtrack) => {
                  const isEditing = editingId === subtrack.id;

                  return (
                    <div
                      key={subtrack.id}
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Default Sub-Track</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">Order:</label>
                              <input
                                type="number"
                                value={formData.ordering_index}
                                onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdate(subtrack.id)}
                              disabled={saving}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
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
                              <h4 className="font-medium text-gray-900">{subtrack.name}</h4>
                              {subtrack.is_default && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Default
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Order: {subtrack.ordering_index}
                              </span>
                            </div>
                            {subtrack.description && (
                              <p className="text-sm text-gray-600">{subtrack.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditing(subtrack)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit sub-track"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(subtrack.id, subtrack.name)}
                              disabled={saving}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete sub-track"
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

          {subtracks.length === 0 && !creating && (
            <div className="text-center py-12 text-gray-500">
              <p>No sub-track templates found</p>
              <p className="text-sm mt-1">Click "Add Sub-Track" to create one</p>
            </div>
          )}

          {trackTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No track templates available</p>
              <p className="text-sm mt-1">Create track templates first before adding sub-tracks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
