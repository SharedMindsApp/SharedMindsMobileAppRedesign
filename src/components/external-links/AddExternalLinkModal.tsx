import { useState, useEffect, useRef } from 'react';
import { X, Link2, Loader2, ExternalLink as ExternalLinkIcon, AlertCircle, CheckCircle, Play } from 'lucide-react';
import {
  createExternalLink,
  extractDomain,
  addLinkToCollection,
  fetchLinkMetadata,
} from '../../lib/externalLinksService';
import type { ExternalLinkContentType, LinkMetadata } from '../../lib/externalLinksTypes';

interface AddExternalLinkModalProps {
  spaceId: string | null;
  spaceType: 'personal' | 'shared';
  collectionId?: string;
  onClose: () => void;
  onSuccess?: (linkId: string) => void;
}

export function AddExternalLinkModal({
  spaceId,
  spaceType,
  collectionId,
  onClose,
  onSuccess,
}: AddExternalLinkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [contentType, setContentType] = useState<ExternalLinkContentType | ''>('');
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);
    setError(null);

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (!newUrl.trim()) {
      setMetadata(null);
      return;
    }

    // Validate URL format
    try {
      new URL(newUrl);
    } catch {
      return;
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      setFetchingMetadata(true);
      try {
        const fetchedMetadata = await fetchLinkMetadata(newUrl);
        setMetadata(fetchedMetadata);

        if (fetchedMetadata.is_valid) {
          // Only auto-fill if metadata was successfully fetched
          if (!titleManuallyEdited && fetchedMetadata.title && fetchedMetadata.title !== newUrl) {
            setTitle(fetchedMetadata.title);
          }
          if (fetchedMetadata.description) {
            setDescription(fetchedMetadata.description);
          }
          if (fetchedMetadata.thumbnail_url) {
            setThumbnailUrl(fetchedMetadata.thumbnail_url);
          }
          if (fetchedMetadata.author) {
            setAuthor(fetchedMetadata.author);
          }
          if (fetchedMetadata.content_type) {
            setContentType(fetchedMetadata.content_type);
          }
        } else {
          // Metadata fetch failed, but user can still save manually
          if (!titleManuallyEdited && !title) {
            // Set URL as default title if no title yet
            setTitle(extractDomain(newUrl));
          }
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        // Set a default title if none exists
        if (!titleManuallyEdited && !title) {
          setTitle(extractDomain(newUrl));
        }
      } finally {
        setFetchingMetadata(false);
      }
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Validate URL
      new URL(url);

      const domain = extractDomain(url);

      const link = await createExternalLink({
        space_id: spaceId,
        space_type: spaceType,
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || null,
        domain,
        thumbnail_url: thumbnailUrl.trim() || null,
        author: author.trim() || null,
        content_type: contentType || null,
      });

      if (!link) {
        throw new Error('Failed to create link');
      }

      // If collectionId provided, add link to collection
      if (collectionId) {
        await addLinkToCollection(collectionId, link.id);
      }

      onSuccess?.(link.id);
      onClose();
    } catch (err: any) {
      console.error('Error adding external link:', err);
      if (err.message?.includes('invalid URL')) {
        setError('Please enter a valid URL');
      } else if (err.code === '23505') {
        setError('This link already exists in this space');
      } else {
        setError(err.message || 'Failed to add link');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Link2 size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Add External Link</h3>
              <p className="text-xs text-gray-500">Save a reference to external content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          )}

          {metadata && metadata.is_valid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-green-700 text-sm">Link verified and metadata loaded</div>
            </div>
          )}

          {metadata && !metadata.is_valid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-700 text-sm">
                Couldn't fetch preview. You can still save this link by entering the details manually.
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ExternalLinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                required
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {fetchingMetadata && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Paste a URL to automatically fetch metadata</p>
          </div>

          {metadata && thumbnailUrl && (
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={thumbnailUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setThumbnailUrl('')}
              />
              {contentType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <Play size={24} className="text-gray-900 ml-1" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleManuallyEdited(true);
              }}
              placeholder="My Article Title"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {author && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Author / Channel
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or notes about this link..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ExternalLinkContentType)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select type (optional)</option>
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="social">Social Media Post</option>
              <option value="documentation">Documentation</option>
              <option value="recipe">Recipe</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim() || !title.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
