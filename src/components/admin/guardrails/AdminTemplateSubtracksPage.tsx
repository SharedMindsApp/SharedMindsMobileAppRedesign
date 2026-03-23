import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, Save } from 'lucide-react';
import {
  getAllTrackTemplatesAdmin,
  getSubTrackTemplatesByTrackId,
  createSubTrackTemplate,
  updateSubTrackTemplate,
  deleteSubTrackTemplate,
} from '../../../lib/admin/templatesAdmin';
import type { SystemTrackTemplate, SystemSubTrackTemplate } from '../../../lib/guardrails/templateTypes';

interface TrackWithSubtracks {
  template: SystemTrackTemplate;
  subtracks: SystemSubTrackTemplate[];
}

interface SubTrackFormData {
  name: string;
  description: string;
  is_default: boolean;
  ordering_index: number;
}

export function AdminTemplateSubtracksPage() {
  const [tracks, setTracks] = useState<TrackWithSubtracks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [editingSubtrackId, setEditingSubtrackId] = useState<string | null>(null);
  const [creatingForTrackId, setCreatingForTrackId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubTrackFormData>({
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

      const templatesData = await getAllTrackTemplatesAdmin();

      const tracksWithSubtracks = await Promise.all(
        templatesData.map(async (template) => {
          const subtracks = await getSubTrackTemplatesByTrackId(template.id);
          return { template, subtracks };
        })
      );

      setTracks(tracksWithSubtracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startCreating = (trackId: string) => {
    setCreatingForTrackId(trackId);
    setEditingSubtrackId(null);
    setFormData({
      name: '',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const startEditing = (subtrack: SystemSubTrackTemplate) => {
    setEditingSubtrackId(subtrack.id);
    setCreatingForTrackId(null);
    setFormData({
      name: subtrack.name,
      description: subtrack.description || '',
      is_default: subtrack.is_default,
      ordering_index: subtrack.ordering_index,
    });
  };

  const cancelEditing = () => {
    setEditingSubtrackId(null);
    setCreatingForTrackId(null);
    setFormData({
      name: '',
      description: '',
      is_default: false,
      ordering_index: 0,
    });
  };

  const handleCreate = async (trackId: string) => {
    if (!formData.name.trim()) {
      setError('Sub-track name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createSubTrackTemplate({
        track_template_id: trackId,
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

  const handleUpdate = async (subtrackId: string) => {
    if (!formData.name.trim()) {
      setError('Sub-track name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateSubTrackTemplate(subtrackId, {
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

  const handleDelete = async (subtrackId: string) => {
    if (!confirm('Are you sure you want to delete this sub-track? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteSubTrackTemplate(subtrackId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sub-track');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (trackId: string) => {
    setExpandedTrackId(expandedTrackId === trackId ? null : trackId);
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

  const groupedTracks = tracks.reduce((acc, item) => {
    if (!acc[item.template.domain_type]) {
      acc[item.template.domain_type] = [];
    }
    acc[item.template.domain_type].push(item);
    return acc;
  }, {} as Record<string, TrackWithSubtracks[]>);

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
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Track Template → Sub-Tracks Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage sub-tracks for each track template to provide detailed project structure
          </p>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(groupedTracks).map(([domainType, items]) => (
            <div key={domainType} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {domainType.replace('_', ' ')}
              </h3>

              <div className="space-y-3">
                {items.map(({ template, subtracks }) => {
                  const isExpanded = expandedTrackId === template.id;
                  const isCreating = creatingForTrackId === template.id;

                  return (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleExpand(template.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              {template.is_default && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Default
                                </span>
                              )}
                              <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                {subtracks.length} sub-track{subtracks.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCreating(template.id);
                              setExpandedTrackId(template.id);
                            }}
                            className="ml-4 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add Sub-Track
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 space-y-3 bg-white">
                          {subtracks.length === 0 && !isCreating && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No sub-tracks defined. Click "Add Sub-Track" to create one.
                            </p>
                          )}

                          {subtracks.map((subtrack) => {
                            const isEditing = editingSubtrackId === subtrack.id;

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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Sub-track name"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                      </label>
                                      <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Default Sub-Track</span>
                                      </label>

                                      <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700">Order:</label>
                                        <input
                                          type="number"
                                          value={formData.ordering_index}
                                          onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleUpdate(subtrack.id)}
                                        disabled={saving}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
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
                                        <h5 className="font-medium text-gray-900">{subtrack.name}</h5>
                                        {subtrack.is_default && (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
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
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit sub-track"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(subtrack.id)}
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

                          {isCreating && (
                            <div className="border-2 border-dashed border-emerald-300 rounded-lg p-4 bg-emerald-50">
                              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Plus size={18} className="text-emerald-600" />
                                Create New Sub-Track
                              </h5>

                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Sub-track name"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Default Sub-Track</span>
                                  </label>

                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Order:</label>
                                    <input
                                      type="number"
                                      value={formData.ordering_index}
                                      onChange={(e) => setFormData({ ...formData, ordering_index: parseInt(e.target.value) || 0 })}
                                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleCreate(template.id)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {tracks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No track templates found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
