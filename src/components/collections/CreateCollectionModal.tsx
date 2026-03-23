import { useState } from 'react';
import { X, Folder } from 'lucide-react';
import { createCollection } from '../../lib/collectionsService';
import type { SpaceType } from '../../lib/collectionsTypes';
import { COLLECTION_COLORS } from '../../lib/collectionsTypes';

interface CreateCollectionModalProps {
  spaceId: string | null;
  spaceType: SpaceType;
  parentId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCollectionModal({
  spaceId,
  spaceType,
  parentId = null,
  onClose,
  onSuccess,
}: CreateCollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [icon, setIcon] = useState('folder');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      await createCollection({
        space_id: spaceId,
        space_type: spaceType,
        parent_id: parentId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create collection:', error);
      alert('Failed to create collection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">New Collection</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Collection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this collection for?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(COLLECTION_COLORS).map(([colorKey, colorStyles]) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    color === colorKey
                      ? `${colorStyles.border} ${colorStyles.bg}`
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Folder
                    size={24}
                    className={color === colorKey ? colorStyles.icon : 'text-gray-400'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
