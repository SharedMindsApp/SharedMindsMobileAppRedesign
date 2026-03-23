import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getAllTagsAdmin, createTag, updateTag, deleteTag, getTagUsage, type CreateTagInput } from '../../../lib/admin/tagsAdmin';
import type { TemplateTag } from '../../../lib/guardrails/projectTypes';
import { ConfirmDialog } from '../../ConfirmDialog';

export function AdminTagsPage() {
  const [tags, setTags] = useState<TemplateTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState<CreateTagInput>({ name: '' });

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const data = await getAllTagsAdmin();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      await createTag(formData);
      await loadTags();
      setIsCreating(false);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag');
    }
  }

  async function handleUpdate(id: string, name: string) {
    try {
      await updateTag(id, { name });
      await loadTags();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update tag:', error);
      alert('Failed to update tag');
    }
  }

  async function handleDelete(id: string) {
    try {
      const usage = await getTagUsage(id);
      if (usage.project_type_count > 0 || usage.template_count > 0) {
        const message = `This tag is used by ${usage.project_type_count} project type(s) and ${usage.template_count} template(s). Delete anyway?`;
        if (!confirm(message)) return;
      }
      await deleteTag(id);
      await loadTags();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    }
  }

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
        <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tag</span>
        </button>
      </div>

      {isCreating && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="e.g., design, coding, marketing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ name: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {tags.map((tag) => {
          const isEditing = editingId === tag.id;

          return (
            <div key={tag.id} className="px-6 py-4">
              {isEditing ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    defaultValue={tag.name}
                    id={`tag-name-${tag.id}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const name = (document.getElementById(`tag-name-${tag.id}`) as HTMLInputElement).value;
                      handleUpdate(tag.id, name);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{tag.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingId(tag.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: tag.id, name: tag.name })}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Tag"
          message={`Are you sure you want to delete "${deleteConfirm.name}"?`}
          confirmText="Delete"
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
