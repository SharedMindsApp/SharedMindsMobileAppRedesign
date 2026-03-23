import { useEffect, useState } from 'react';
import { Plus, X, Tag as TagIcon, AlertCircle, Loader2 } from 'lucide-react';
import {
  getAllTrackTemplatesAdmin,
  getTrackTemplateTagsAdmin,
  setTrackTemplateTags,
} from '../../../lib/admin/templatesAdmin';
import { getAllTagsAdmin } from '../../../lib/admin/tagsAdmin';
import type { SystemTrackTemplate } from '../../../lib/guardrails/templateTypes';
import type { TemplateTag } from '../../../lib/guardrails/projectTypes';

interface TemplateWithTags {
  template: SystemTrackTemplate;
  tags: TemplateTag[];
}

export function AdminTemplateTagsPage() {
  const [templates, setTemplates] = useState<TemplateWithTags[]>([]);
  const [allTags, setAllTags] = useState<TemplateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesData, tagsData] = await Promise.all([
        getAllTrackTemplatesAdmin(),
        getAllTagsAdmin(),
      ]);

      const templatesWithTags = await Promise.all(
        templatesData.map(async (template) => {
          const tags = await getTrackTemplateTagsAdmin(template.id);
          return { template, tags };
        })
      );

      setTemplates(templatesWithTags);
      setAllTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (templateId: string, currentTags: TemplateTag[]) => {
    setEditingTemplateId(templateId);
    setSelectedTags(currentTags.map(t => t.id));
  };

  const cancelEditing = () => {
    setEditingTemplateId(null);
    setSelectedTags([]);
  };

  const saveTags = async (templateId: string) => {
    try {
      setSaving(true);
      await setTrackTemplateTags(templateId, selectedTags);
      await loadData();
      setEditingTemplateId(null);
      setSelectedTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading template mappings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-semibold">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const groupedTemplates = templates.reduce((acc, { template, tags }) => {
    if (!acc[template.domain_type]) {
      acc[template.domain_type] = [];
    }
    acc[template.domain_type].push({ template, tags });
    return acc;
  }, {} as Record<string, TemplateWithTags[]>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Template → Tag Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">
            Assign tags to track templates to help users find relevant templates
          </p>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(groupedTemplates).map(([domainType, items]) => (
            <div key={domainType} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {domainType.replace('_', ' ')}
              </h3>

              <div className="space-y-2">
                {items.map(({ template, tags }) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          {template.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        )}

                        {editingTemplateId === template.id ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {allTags.map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => toggleTag(tag.id)}
                                  className={`
                                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                                    ${selectedTags.includes(tag.id)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }
                                  `}
                                >
                                  {tag.name}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveTags(template.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  'Save Tags'
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
                          <div className="flex items-center gap-2">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                                  >
                                    <TagIcon size={14} />
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No tags assigned</span>
                            )}
                          </div>
                        )}
                      </div>

                      {editingTemplateId !== template.id && (
                        <button
                          onClick={() => startEditing(template.id, tags)}
                          className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Edit Tags
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <TagIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>No templates found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
