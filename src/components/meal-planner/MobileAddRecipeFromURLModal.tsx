import { useState } from 'react';
import { ChevronLeft, Link as LinkIcon, Loader } from 'lucide-react';
import { fetchRecipeMetadata, COMMON_RECIPE_TAGS } from '../../lib/recipeLinks';

interface MobileAddRecipeFromURLModalProps {
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

export function MobileAddRecipeFromURLModal({ isOpen, onClose, onSave }: MobileAddRecipeFromURLModalProps) {
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
    <div className="fixed inset-0 bg-white z-[120] flex flex-col">
      <div className="bg-orange-500 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">
          Add Recipe from URL
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Recipe URL *
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={metadataFetched}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
                  placeholder="Paste link here"
                />
              </div>
              {!metadataFetched && (
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  disabled={!url.trim() || loading}
                  className="w-full px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
              <p className="text-xs text-amber-600 mt-1">{fetchError}</p>
            )}
          </div>

          {metadataFetched && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="Recipe name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="https://..."
                />
                {imageUrl && (
                  <div className="mt-2">
                    <img
                      src={imageUrl}
                      alt="Recipe preview"
                      className="w-full h-40 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Source Platform
                </label>
                <input
                  type="text"
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="Add notes or cooking tips..."
                />
              </div>
            </>
          )}
        </div>
      </form>

      {metadataFetched && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Add Recipe'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
