import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Tag } from 'lucide-react';
import { getAllProjectTypesAdmin, createProjectType, updateProjectType, deleteProjectType, getProjectTypeTagsAdmin, setProjectTypeTags, setProjectTypeDomains, type CreateProjectTypeInput, type UpdateProjectTypeInput, type ProjectTypeExampleText } from '../../../lib/admin/projectTypesAdmin';
import { getAllTagsAdmin } from '../../../lib/admin/tagsAdmin';
import type { ProjectTypeWithDomains, TemplateTag } from '../../../lib/guardrails/projectTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import { ConfirmDialog } from '../../ConfirmDialog';

const DOMAIN_TYPES: { value: DomainType; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'passion', label: 'Passion' },
  { value: 'startup', label: 'Startup' },
];

export function AdminProjectTypesPage() {
  const [projectTypes, setProjectTypes] = useState<ProjectTypeWithDomains[]>([]);
  const [allTags, setAllTags] = useState<TemplateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState<{ projectTypeId: string; name: string } | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState<{ projectTypeId: string; name: string; currentDomains: DomainType[] } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<DomainType[]>([]);

  const [formData, setFormData] = useState<CreateProjectTypeInput>({
    name: '',
    domains: [],
    description: '',
    example_text: {
      idea: '',
      startingPoint: '',
      expectations: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [types, tags] = await Promise.all([
        getAllProjectTypesAdmin(),
        getAllTagsAdmin(),
      ]);
      setProjectTypes(types);
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      alert('Project type name is required');
      return;
    }

    if (formData.domains.length === 0) {
      alert('At least one domain is required');
      return;
    }

    try {
      await createProjectType(formData);
      await loadData();
      setIsCreating(false);
      setFormData({ 
        name: '', 
        domains: [], 
        description: '',
        example_text: {
          idea: '',
          startingPoint: '',
          expectations: '',
        },
      });
    } catch (error) {
      console.error('Failed to create project type:', error);
      alert('Failed to create project type');
    }
  }

  async function handleUpdate(id: string, updates: UpdateProjectTypeInput) {
    try {
      await updateProjectType(id, updates);
      await loadData();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update project type:', error);
      alert('Failed to update project type');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProjectType(id);
      await loadData();
      setDeleteConfirm(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete project type';
      alert(message);
    }
  }

  async function openTagModal(projectTypeId: string, name: string) {
    try {
      const tags = await getProjectTypeTagsAdmin(projectTypeId);
      setSelectedTags(tags.map(t => t.id));
      setTagModalOpen({ projectTypeId, name });
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  async function handleSaveTags() {
    if (!tagModalOpen) return;

    try {
      await setProjectTypeTags(tagModalOpen.projectTypeId, selectedTags);
      setTagModalOpen(null);
    } catch (error) {
      console.error('Failed to save tags:', error);
      alert('Failed to save tags');
    }
  }

  function openDomainModal(projectTypeId: string, name: string, currentDomains: DomainType[]) {
    setSelectedDomains(currentDomains);
    setDomainModalOpen({ projectTypeId, name, currentDomains });
  }

  async function handleSaveDomains() {
    if (!domainModalOpen) return;

    if (selectedDomains.length === 0) {
      alert('At least one domain is required');
      return;
    }

    try {
      await setProjectTypeDomains(domainModalOpen.projectTypeId, selectedDomains);
      await loadData();
      setDomainModalOpen(null);
    } catch (error) {
      console.error('Failed to save domains:', error);
      alert('Failed to save domains');
    }
  }

  const toggleDomain = (domain: DomainType) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const toggleCreateDomain = (domain: DomainType) => {
    if (formData.domains.includes(domain)) {
      setFormData({ ...formData, domains: formData.domains.filter(d => d !== domain) });
    } else {
      setFormData({ ...formData, domains: [...formData.domains, domain] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Types</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define project types that appear across multiple domains
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project Type</span>
        </button>
      </div>

      {isCreating && (
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50 border-l-4 border-l-blue-600">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Music Production"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domains * (Select all that apply)
              </label>
              <div className="space-y-2">
                {DOMAIN_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-100 cursor-pointer border border-gray-200 bg-white">
                    <input
                      type="checkbox"
                      checked={formData.domains.includes(value)}
                      onChange={() => toggleCreateDomain(value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>

            {/* Wizard Example Text Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Wizard Example Text (Idea Step)</h3>
              <p className="text-xs text-gray-500 mb-4">
                These examples help users describe their project during setup. Leave blank to use the domain default.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Idea Example
                  </label>
                  <textarea
                    value={formData.example_text?.idea || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      example_text: { 
                        ...formData.example_text,
                        idea: e.target.value,
                        startingPoint: formData.example_text?.startingPoint || '',
                        expectations: formData.example_text?.expectations || '',
                      } 
                    })}
                    rows={2}
                    maxLength={250}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., This project is about improving my physical fitness..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {(formData.example_text?.idea || '').length}/250 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Point Example
                  </label>
                  <textarea
                    value={formData.example_text?.startingPoint || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      example_text: { 
                        ...formData.example_text,
                        idea: formData.example_text?.idea || '',
                        startingPoint: e.target.value,
                        expectations: formData.example_text?.expectations || '',
                      } 
                    })}
                    rows={2}
                    maxLength={250}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., I don't exercise regularly at the moment..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {(formData.example_text?.startingPoint || '').length}/250 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expectations Example
                  </label>
                  <textarea
                    value={formData.example_text?.expectations || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      example_text: { 
                        ...formData.example_text,
                        idea: formData.example_text?.idea || '',
                        startingPoint: formData.example_text?.startingPoint || '',
                        expectations: e.target.value,
                      } 
                    })}
                    rows={2}
                    maxLength={250}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., I expect this will involve regular workouts..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {(formData.example_text?.expectations || '').length}/250 characters
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ 
                    name: '', 
                    domains: [], 
                    description: '',
                    example_text: {
                      idea: '',
                      startingPoint: '',
                      expectations: '',
                    },
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {projectTypes.map((projectType) => {
          const isEditing = editingId === projectType.id;

          return (
            <div key={projectType.id} className="px-6 py-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      defaultValue={projectType.name}
                      id={`name-${projectType.id}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      defaultValue={projectType.description || ''}
                      id={`desc-${projectType.id}`}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Wizard Example Text Section for Edit */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Wizard Example Text (Idea Step)</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      These examples help users describe their project during setup. Leave blank to use the domain default.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Project Idea Example
                        </label>
                        <textarea
                          defaultValue={projectType.example_text?.idea || ''}
                          id={`example-idea-${projectType.id}`}
                          rows={2}
                          maxLength={250}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="e.g., This project is about improving my physical fitness..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Starting Point Example
                        </label>
                        <textarea
                          defaultValue={projectType.example_text?.startingPoint || ''}
                          id={`example-starting-${projectType.id}`}
                          rows={2}
                          maxLength={250}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="e.g., I don't exercise regularly at the moment..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expectations Example
                        </label>
                        <textarea
                          defaultValue={projectType.example_text?.expectations || ''}
                          id={`example-expectations-${projectType.id}`}
                          rows={2}
                          maxLength={250}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="e.g., I expect this will involve regular workouts..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const name = (document.getElementById(`name-${projectType.id}`) as HTMLInputElement).value;
                        const description = (document.getElementById(`desc-${projectType.id}`) as HTMLTextAreaElement).value;
                        const ideaExample = (document.getElementById(`example-idea-${projectType.id}`) as HTMLTextAreaElement).value.trim();
                        const startingExample = (document.getElementById(`example-starting-${projectType.id}`) as HTMLTextAreaElement).value.trim();
                        const expectationsExample = (document.getElementById(`example-expectations-${projectType.id}`) as HTMLTextAreaElement).value.trim();
                        
                        const example_text = (ideaExample || startingExample || expectationsExample) ? {
                          idea: ideaExample || undefined,
                          startingPoint: startingExample || undefined,
                          expectations: expectationsExample || undefined,
                        } : null;

                        handleUpdate(projectType.id, { name, description, example_text });
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{projectType.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {projectType.domains.map(domain => (
                        <span
                          key={domain}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize"
                        >
                          {domain}
                        </span>
                      ))}
                      {projectType.domains.length === 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          No domains assigned
                        </span>
                      )}
                    </div>
                    {projectType.description && (
                      <p className="text-sm text-gray-600 mb-2">{projectType.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openDomainModal(projectType.id, projectType.name, projectType.domains)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Manage Domains
                      </button>
                      <button
                        onClick={() => openTagModal(projectType.id, projectType.name)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Manage Tags
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingId(projectType.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit project type"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: projectType.id, name: projectType.name })}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete project type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {projectTypes.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>No project types defined yet</p>
            <p className="text-sm mt-1">Click "Add Project Type" to create one</p>
          </div>
        )}
      </div>

      {domainModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Domains: {domainModalOpen.name}
              </h3>
              <button
                onClick={() => setDomainModalOpen(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Select which domains this project type should appear in
              </p>
              <div className="space-y-2">
                {DOMAIN_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(value)}
                      onChange={() => toggleDomain(value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setDomainModalOpen(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDomains}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                <span>Save Domains</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Tags: {tagModalOpen.name}
              </h3>
              <button
                onClick={() => setTagModalOpen(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {allTags.map(tag => (
                  <label key={tag.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setTagModalOpen(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                <span>Save Tags</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Project Type"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
