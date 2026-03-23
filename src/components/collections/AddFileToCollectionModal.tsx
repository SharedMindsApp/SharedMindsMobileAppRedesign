import { useState, useEffect } from 'react';
import { X, Folder, Check } from 'lucide-react';
import { getCollectionsForSpace, addReferenceToCollection } from '../../lib/collectionsService';
import type { Collection, SpaceType } from '../../lib/collectionsTypes';
import { COLLECTION_COLORS } from '../../lib/collectionsTypes';

interface AddFileToCollectionModalProps {
  fileId: string;
  fileName: string;
  spaceId: string | null;
  spaceType: SpaceType;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFileToCollectionModal({
  fileId,
  fileName,
  spaceId,
  spaceType,
  onClose,
  onSuccess,
}: AddFileToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    try {
      setLoading(true);
      const data = await getCollectionsForSpace(spaceId, spaceType);
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleCollection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (saving) return;

    if (selectedIds.size === 0) {
      alert('Please select at least one collection.');
      return;
    }

    try {
      setSaving(true);

      await Promise.all(
        Array.from(selectedIds).map(collectionId =>
          addReferenceToCollection({
            collection_id: collectionId,
            entity_type: 'file',
            entity_id: fileId,
          })
        )
      );

      onSuccess();
    } catch (error) {
      console.error('Failed to add file to collections:', error);
      alert('Failed to add file to collections.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Add to Collection</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-600">
            File: <span className="font-medium text-gray-900">{fileName}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Folder size={48} className="mb-3 opacity-50" />
              <p className="font-medium">No collections yet</p>
              <p className="text-sm text-center">Create a collection first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map(collection => {
                const isSelected = selectedIds.has(collection.id);
                const colors = COLLECTION_COLORS[collection.color as keyof typeof COLLECTION_COLORS] || COLLECTION_COLORS.blue;

                return (
                  <button
                    key={collection.id}
                    onClick={() => toggleCollection(collection.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${colors.border} ${colors.bg}`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Folder size={18} className={isSelected ? colors.icon : 'text-gray-400'} />
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? colors.text : 'text-gray-900'}`}>
                        {collection.name}
                      </p>
                      {collection.description && (
                        <p className="text-xs text-gray-500 truncate">{collection.description}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={18} className={colors.icon} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || selectedIds.size === 0}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Adding...' : `Add to ${selectedIds.size} collection${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
