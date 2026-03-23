import { useEffect, useState } from 'react';
import { Plus, X, Tag as TagIcon, AlertCircle, Loader2 } from 'lucide-react';
import {
  getAllProjectTypesAdmin,
  getProjectTypeTagsAdmin,
  setProjectTypeTags,
} from '../../../lib/admin/projectTypesAdmin';
import { getAllTagsAdmin } from '../../../lib/admin/tagsAdmin';
import type { ProjectType, TemplateTag } from '../../../lib/guardrails/projectTypes';

interface ProjectTypeWithTags {
  projectType: ProjectType;
  tags: TemplateTag[];
}

export function AdminProjectTypeTagsPage() {
  const [projectTypes, setProjectTypes] = useState<ProjectTypeWithTags[]>([]);
  const [allTags, setAllTags] = useState<TemplateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProjectTypeId, setEditingProjectTypeId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectTypesData, tagsData] = await Promise.all([
        getAllProjectTypesAdmin(),
        getAllTagsAdmin(),
      ]);

      const projectTypesWithTags = await Promise.all(
        projectTypesData.map(async (projectType) => {
          const tags = await getProjectTypeTagsAdmin(projectType.id);
          return { projectType, tags };
        })
      );

      setProjectTypes(projectTypesWithTags);
      setAllTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (projectTypeId: string, currentTags: TemplateTag[]) => {
    setEditingProjectTypeId(projectTypeId);
    setSelectedTags(currentTags.map(t => t.id));
  };

  const cancelEditing = () => {
    setEditingProjectTypeId(null);
    setSelectedTags([]);
  };

  const saveTags = async (projectTypeId: string) => {
    try {
      setSaving(true);
      await setProjectTypeTags(projectTypeId, selectedTags);
      await loadData();
      setEditingProjectTypeId(null);
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
          <span>Loading project type mappings...</span>
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

  const groupedProjectTypes = projectTypes.reduce((acc, { projectType, tags }) => {
    if (!acc[projectType.domain_type]) {
      acc[projectType.domain_type] = [];
    }
    acc[projectType.domain_type].push({ projectType, tags });
    return acc;
  }, {} as Record<string, ProjectTypeWithTags[]>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Project Type → Tag Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">
            Assign tags to project types for categorization and filtering
          </p>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(groupedProjectTypes).map(([domainType, items]) => (
            <div key={domainType} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {domainType.replace('_', ' ')}
              </h3>

              <div className="space-y-2">
                {items.map(({ projectType, tags }) => (
                  <div
                    key={projectType.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{projectType.name}</h4>
                        </div>
                        {projectType.description && (
                          <p className="text-sm text-gray-600 mb-3">{projectType.description}</p>
                        )}

                        {editingProjectTypeId === projectType.id ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {allTags.map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => toggleTag(tag.id)}
                                  className={`
                                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                                    ${selectedTags.includes(tag.id)
                                      ? 'bg-teal-600 text-white'
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
                                onClick={() => saveTags(projectType.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
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
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium"
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

                      {editingProjectTypeId !== projectType.id && (
                        <button
                          onClick={() => startEditing(projectType.id, tags)}
                          className="px-3 py-1 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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

          {projectTypes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <TagIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>No project types found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
