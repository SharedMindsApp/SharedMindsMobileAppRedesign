import { useState } from 'react';
import { X, Link as LinkIcon, Loader, Plus } from 'lucide-react';
import { fetchRecipeMetadata, COMMON_RECIPE_TAGS } from '../../lib/recipeLinks';

interface AddRecipeFromURLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    url: string;
    title: string;
    imageUrl: string | null;
    sourcePlatform: string | null;
    tags: string[];
    notes: string | null;
  }) => Promise<void>;
}

export function AddRecipeFromURLModal({ isOpen, onClose, onSave }: AddRecipeFromURLModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [metadataFetched, setMetadataFetched] = useState(false);

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setFetchError('');

    try {
      const metadata = await fetchRecipeMetadata(url.trim());
      setTitle(metadata.title);
      setImageUrl(metadata.image || '');
      setSourcePlatform(metadata.siteName || '');
      setMetadataFetched(true);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      setFetchError('Could not fetch recipe details. Please fill in manually.');
      setMetadataFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setSaving(true);
    try {
      await onSave({
        url: url.trim(),
        title: title.trim(),
        imageUrl: imageUrl.trim() || null,
        sourcePlatform: sourcePlatform.trim() || null,
        tags: selectedTags,
        notes: notes.trim() || null
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setTitle('');
    setImageUrl('');
    setSourcePlatform('');
    setSelectedTags([]);
    setNotes('');
    setMetadataFetched(false);
    setFetchError('');
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Add Recipe from URL</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Recipe URL *
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={metadataFetched}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
                    placeholder="Paste TikTok, Instagram, YouTube, or recipe website link"
                  />
                </div>
                {!metadataFetched && (
                  <button
                    type="button"
                    onClick={handleFetchMetadata}
                    disabled={!url.trim() || loading}
                    className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Details'
                    )}
                  </button>
                )}
              </div>
              {fetchError && (
                <p className="text-sm text-amber-600 mt-1">{fetchError}</p>
              )}
            </div>

            {metadataFetched && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Recipe Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="Recipe name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="https://..."
                  />
                  {imageUrl && (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt="Recipe preview"
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Source Platform
                  </label>
                  <input
                    type="text"
                    value={sourcePlatform}
                    onChange={(e) => setSourcePlatform(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="TikTok, Instagram, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_RECIPE_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="Add any personal notes, modifications, or cooking tips..."
                  />
                </div>
              </>
            )}
          </div>

          {metadataFetched && (
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Recipe
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
