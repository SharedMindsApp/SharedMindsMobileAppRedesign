/**
 * Reflection Panel - User-Owned Meaning-Making Space
 *
 * Allows users to write reflections on insights or standalone.
 *
 * CRITICAL:
 * - System NEVER interprets reflection content
 * - NO analysis, NO NLP, NO AI
 * - Optional (never required)
 * - Gentle, non-performative framing
 * - No word counts, no streaks, no daily prompts
 */

import { useState } from 'react';
import { FileText, Tag, X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createReflection,
  updateReflection,
  deleteReflection,
  type ReflectionEntry,
} from '../../lib/behavioral-sandbox';

interface ReflectionPanelProps {
  linkedSignalId?: string;
  linkedProjectId?: string;
  linkedSpaceId?: string;
  existingReflection?: ReflectionEntry;
  onSaved?: (reflection: ReflectionEntry) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

export function ReflectionPanel({
  linkedSignalId,
  linkedProjectId,
  linkedSpaceId,
  existingReflection,
  onSaved,
  onDeleted,
  onCancel,
}: ReflectionPanelProps) {
  const { user } = useAuth();
  const [content, setContent] = useState(existingReflection?.content ?? '');
  const [userTags, setUserTags] = useState<string[]>(
    existingReflection?.user_tags ?? []
  );
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existingReflection;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !userTags.includes(trimmed)) {
      setUserTags([...userTags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setUserTags(userTags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!user || !content.trim()) {
      setError('Reflection content cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && existingReflection) {
        const updated = await updateReflection(user.id, existingReflection.id, {
          content: content.trim(),
          userTags,
        });
        onSaved?.(updated);
      } else {
        const created = await createReflection(user.id, {
          content: content.trim(),
          linkedSignalId,
          linkedProjectId,
          linkedSpaceId,
          userTags,
        });
        onSaved?.(created);
        setContent('');
        setUserTags([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existingReflection) return;

    if (!confirm('Delete this reflection? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteReflection(user.id, existingReflection.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reflection');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Your space for reflection</p>
            <p className="text-blue-800">
              If you want, you can note what this brings up for you. This is for you. The
              system does not analyse this.
            </p>
          </div>
        </div>
      </div>

      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write what this means to you, if anything..."
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          disabled={saving || deleting}
        />
        <div className="text-xs text-gray-500 mt-1">
          No word counts. No analysis. Just your thoughts.
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optional)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add tag..."
            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={saving || deleting}
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim() || saving || deleting}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Tag className="w-4 h-4" />
          </button>
        </div>

        {userTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {userTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={saving || deleting}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Reflections are private. You can edit or delete anytime.
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}

          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!content.trim() || saving || deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
