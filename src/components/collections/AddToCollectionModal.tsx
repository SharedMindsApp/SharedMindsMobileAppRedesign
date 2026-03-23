import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, FileText, ExternalLink as ExternalLinkIcon, Plus } from 'lucide-react';
import { addReferenceToCollection } from '../../lib/collectionsService';
import { getFilesForSpace } from '../../lib/filesService';
import { getExternalLinks, addLinkToCollection } from '../../lib/externalLinksService';
import type { SpaceType } from '../../lib/collectionsTypes';
import type { FileWithTags } from '../../lib/filesTypes';
import type { ExternalLinkWithTags } from '../../lib/externalLinksTypes';
import { formatFileSize } from '../../lib/filesService';
import { AddExternalLinkModal } from '../external-links/AddExternalLinkModal';

interface AddToCollectionModalProps {
  collectionId: string;
  spaceId: string | null;
  spaceType: SpaceType;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'quick-link' | 'external-link' | 'file';

export function AddToCollectionModal({
  collectionId,
  spaceId,
  spaceType,
  onClose,
  onSuccess,
}: AddToCollectionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('external-link');
  const [saving, setSaving] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');

  const [files, setFiles] = useState<FileWithTags[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [externalLinks, setExternalLinks] = useState<ExternalLinkWithTags[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    if (activeTab === 'file') {
      loadFiles();
    } else if (activeTab === 'external-link') {
      loadExternalLinks();
    }
  }, [activeTab]);

  async function loadFiles() {
    try {
      setLoadingFiles(true);
      const data = await getFilesForSpace(spaceId, spaceType);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function loadExternalLinks() {
    try {
      setLoadingLinks(true);
      const data = await getExternalLinks(spaceId, spaceType);
      setExternalLinks(data);
    } catch (error) {
      console.error('Failed to load external links:', error);
    } finally {
      setLoadingLinks(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      if (activeTab === 'quick-link') {
        if (!linkUrl.trim() || !linkTitle.trim()) {
          alert('Please provide both URL and title.');
          setSaving(false);
          return;
        }

        await addReferenceToCollection({
          collection_id: collectionId,
          entity_type: 'link',
          link_url: linkUrl.trim(),
          link_title: linkTitle.trim(),
          link_description: linkDescription.trim() || undefined,
        });
      } else if (activeTab === 'external-link') {
        if (!selectedLinkId) {
          alert('Please select an external link.');
          setSaving(false);
          return;
        }

        const success = await addLinkToCollection(collectionId, selectedLinkId);
        if (!success) {
          alert('Failed to add link to collection.');
          setSaving(false);
          return;
        }
      } else if (activeTab === 'file') {
        if (!selectedFileId) {
          alert('Please select a file.');
          setSaving(false);
          return;
        }

        await addReferenceToCollection({
          collection_id: collectionId,
          entity_type: 'file',
          entity_id: selectedFileId,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add reference:', error);
      alert('Failed to add item to collection.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Add to Collection</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('external-link')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'external-link'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ExternalLinkIcon size={16} />
              External Link
            </div>
          </button>
          <button
            onClick={() => setActiveTab('quick-link')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'quick-link'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LinkIcon size={16} />
              Quick Link
            </div>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'file'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} />
              File
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {activeTab === 'external-link' && (
            <div>
              {loadingLinks ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                </div>
              ) : externalLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <ExternalLinkIcon size={48} className="mb-3 opacity-50" />
                  <p className="font-medium">No external links yet</p>
                  <p className="text-sm mb-4">Create external links to reuse them in collections</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateLinkModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create External Link
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">Select an external link</p>
                    <button
                      type="button"
                      onClick={() => setShowCreateLinkModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={14} />
                      New Link
                    </button>
                  </div>
                  <div className="space-y-2">
                    {externalLinks.map(link => (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => setSelectedLinkId(link.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selectedLinkId === link.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <ExternalLinkIcon size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {link.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{link.domain}</p>
                          {link.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{link.description}</p>
                          )}
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {link.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedLinkId === link.id
                              ? 'border-gray-900 bg-gray-900'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedLinkId === link.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quick-link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Link title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  placeholder="What is this link about?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                />
              </div>

              {linkUrl && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium mb-1">Preview</p>
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {linkTitle || linkUrl}
                    <ExternalLinkIcon size={12} />
                  </a>
                  {linkDescription && (
                    <p className="text-sm text-gray-600 mt-1">{linkDescription}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'file' && (
            <div>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <FileText size={48} className="mb-3 opacity-50" />
                  <p className="font-medium">No files available</p>
                  <p className="text-sm">Upload files first to add them to collections</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelectedFileId(file.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedFileId === file.id
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <FileText size={20} className="text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.display_filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.file_size)}
                        </p>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedFileId === file.id
                            ? 'border-gray-900 bg-gray-900'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedFileId === file.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

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
            disabled={
              saving ||
              (activeTab === 'quick-link' && (!linkUrl.trim() || !linkTitle.trim())) ||
              (activeTab === 'external-link' && !selectedLinkId) ||
              (activeTab === 'file' && !selectedFileId)
            }
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Adding...' : 'Add to Collection'}
          </button>
        </div>
      </div>

      {/* Create External Link Modal */}
      {showCreateLinkModal && (
        <AddExternalLinkModal
          spaceId={spaceId}
          spaceType={spaceType}
          collectionId={collectionId}
          onClose={() => setShowCreateLinkModal(false)}
          onSuccess={() => {
            setShowCreateLinkModal(false);
            loadExternalLinks();
            onSuccess();
          }}
        />
      )}
    </div>
  );
}
