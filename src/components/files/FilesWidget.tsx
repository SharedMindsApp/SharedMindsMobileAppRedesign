import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Search,
  Grid3x3,
  List,
  X,
  Download,
  Trash2,
  Edit3,
  Tag,
  File as FileIcon,
  FolderPlus,
  Image,
} from 'lucide-react';
import {
  getFilesForSpace,
  searchFiles,
  uploadFile,
  deleteFile,
  downloadFile,
  renameFile,
  getUserTags,
  createTag,
  assignTagToFile,
  removeTagFromFile,
  formatFileSize,
  getFileIcon,
  isFileTypeSupported,
  getSupportedFileTypesMessage,
} from '../../lib/filesService';
import type { FileWithTags, FileTag, ViewMode, SpaceType } from '../../lib/filesTypes';
import { AddFileToCollectionModal } from '../collections/AddFileToCollectionModal';
import { createCanvasSVG } from '../../lib/canvasSVGService';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface FilesWidgetProps {
  spaceId: string | null;
  spaceType: SpaceType;
  onAddToCanvas?: () => void;
}

export function FilesWidget({ spaceId, spaceType, onAddToCanvas }: FilesWidgetProps) {
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';

  const [files, setFiles] = useState<FileWithTags[]>([]);
  const [allTags, setAllTags] = useState<FileTag[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [managingTagsFileId, setManagingTagsFileId] = useState<string | null>(null);
  const [addingToCollectionFile, setAddingToCollectionFile] = useState<FileWithTags | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [spaceId, spaceType]);

  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    } else {
      loadFiles();
    }
  }, [searchTerm]);

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([loadFiles(), loadTags()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    try {
      const data = await getFilesForSpace(spaceId, spaceType);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  async function loadTags() {
    try {
      const tags = await getUserTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  async function handleSearch() {
    try {
      const results = await searchFiles(spaceId, spaceType, searchTerm);
      setFiles(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isFileTypeSupported(file.type)) {
      const fileExt = file.name.split('.').pop() || '';
      setErrorMessage(
        `File type not supported: ${fileExt ? `.${fileExt}` : file.type}\n\n${getSupportedFileTypesMessage()}`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setUploading(true);
      setErrorMessage(null);
      await uploadFile({
        file,
        space_id: spaceId,
        space_type: spaceType,
      });
      await loadFiles();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage(error?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRename(fileId: string) {
    if (!editFilename.trim()) return;

    try {
      await renameFile(fileId, editFilename.trim());
      setEditingFileId(null);
      setEditFilename('');
      await loadFiles();
    } catch (error) {
      console.error('Rename failed:', error);
      alert('Failed to rename file.');
    }
  }

  async function handleDelete(file: FileWithTags) {
    if (!confirm(`Delete "${file.display_filename}"?`)) return;

    try {
      await deleteFile(file.id);
      await loadFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file.');
    }
  }

  async function handleDownload(file: FileWithTags) {
    try {
      await downloadFile(file);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file.');
    }
  }

  async function handleAddToCanvas(file: FileWithTags) {
    if (!spaceId) {
      alert('Cannot add to canvas: No space ID');
      return;
    }

    try {
      await createCanvasSVG({
        space_id: spaceId,
        source_file_id: file.id,
        x_position: 200,
        y_position: 200,
        scale: 1.0,
      });

      if (onAddToCanvas) {
        onAddToCanvas();
      }

      alert(`"${file.display_filename}" added to canvas!`);
    } catch (error) {
      console.error('Failed to add to canvas:', error);
      alert('Failed to add to canvas.');
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;

    try {
      await createTag(newTagName.trim());
      setNewTagName('');
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag.');
    }
  }

  async function handleToggleTag(fileId: string, tagId: string, isAssigned: boolean) {
    try {
      if (isAssigned) {
        await removeTagFromFile(fileId, tagId);
      } else {
        await assignTagToFile(fileId, tagId);
      }
      await loadFiles();
    } catch (error) {
      console.error('Failed to toggle tag:', error);
    }
  }

  function startEditing(file: FileWithTags) {
    setEditingFileId(file.id);
    setEditFilename(file.display_filename);
  }

  function cancelEditing() {
    setEditingFileId(null);
    setEditFilename('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  const managingFile = files.find(f => f.id === managingTagsFileId);

  return (
    <div className={`flex flex-col h-full ${
      isNeonMode
        ? 'neon-dark-widget'
        : 'bg-white dark:bg-slate-700 rounded-xl'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${
        isNeonMode
          ? 'border-b border-[rgba(255,255,255,0.08)]'
          : 'border-b border-gray-100 dark:border-slate-500'
      }`}>
        <div className="flex items-center gap-3">
          <FileIcon size={18} className={isNeonMode ? 'text-cyan-300' : 'text-gray-600 dark:text-slate-200'} />
          <h3 className={`font-semibold ${isNeonMode ? 'text-cyan-50' : 'text-gray-900 dark:text-slate-50'}`}>Files</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isNeonMode
              ? 'text-cyan-200 bg-[rgba(6,182,212,0.15)]'
              : 'text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-600'
          }`}>
            {files.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className={`p-2 rounded-lg transition-all duration-150 ${
              isNeonMode
                ? 'hover:bg-[rgba(6,182,212,0.1)] hover:shadow-[0_0_6px_rgba(6,182,212,0.2)]'
                : 'hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
            title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
          >
            {viewMode === 'list' ? (
              <Grid3x3 size={16} className={isNeonMode ? 'text-cyan-300' : 'text-gray-600 dark:text-slate-200'} />
            ) : (
              <List size={16} className={isNeonMode ? 'text-cyan-300' : 'text-gray-600 dark:text-slate-200'} />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium mb-1">Upload Failed</p>
              <p className="text-xs text-red-700 whitespace-pre-line">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
            >
              <X size={16} className="text-red-600" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Upload */}
      <div className={`px-4 py-3 space-y-2 ${
        isNeonMode
          ? 'border-b border-[rgba(255,255,255,0.08)]'
          : 'border-b border-gray-100 dark:border-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isNeonMode ? 'text-cyan-400' : 'text-gray-400 dark:text-slate-400'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files and tags..."
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all duration-150 ${
                isNeonMode
                  ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-cyan-50 placeholder-cyan-400/50 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-[rgba(255,255,255,0.08)]'
                  : 'border border-gray-200 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100 dark:placeholder-slate-400 focus:ring-gray-400 dark:focus:ring-blue-500'
              }`}
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-all duration-150 font-medium disabled:opacity-50 ${
              isNeonMode
                ? 'bg-[rgba(6,182,212,0.2)] border border-cyan-500/50 hover:bg-[rgba(6,182,212,0.3)] hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700'
            }`}
          >
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Files List/Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${
            isNeonMode ? 'text-cyan-400/60' : 'text-gray-400 dark:text-slate-400'
          }`}>
            <FileIcon size={48} className="mb-3" />
            <p className="font-medium">No files yet</p>
            <p className="text-sm">Upload your first file to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group relative rounded-lg p-3 transition-all duration-150 ${
                  isNeonMode
                    ? 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-500'
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className="text-4xl mb-2">{getFileIcon(file.file_type)}</div>

                  {editingFileId === file.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRename(file.id)}
                          className="flex-1 px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-900 truncate mb-1" title={file.display_filename}>
                        {file.display_filename}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {formatFileSize(file.file_size)}
                      </p>

                      {file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {file.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                            >
                              {tag.name}
                            </span>
                          ))}
                          {file.tags.length > 2 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                              +{file.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Download"
                        >
                          <Download size={14} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => startEditing(file)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Rename"
                        >
                          <Edit3 size={14} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => setManagingTagsFileId(file.id)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Manage tags"
                        >
                          <Tag size={14} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => setAddingToCollectionFile(file)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Add to collection"
                        >
                          <FolderPlus size={14} className="text-gray-600" />
                        </button>
                        {file.file_type === 'image/svg+xml' && (
                          <button
                            onClick={() => handleAddToCanvas(file)}
                            className="p-1 hover:bg-green-50 rounded transition-colors"
                            title="Add to canvas as graphic"
                          >
                            <Image size={14} className="text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className="text-2xl">{getFileIcon(file.file_type)}</div>

                <div className="flex-1 min-w-0">
                  {editingFileId === file.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(file.id)}
                        className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.display_filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.file_size)}
                        </span>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.map((tag) => (
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
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => startEditing(file)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Rename"
                  >
                    <Edit3 size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => setManagingTagsFileId(file.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Manage tags"
                  >
                    <Tag size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => setAddingToCollectionFile(file)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Add to collection"
                  >
                    <FolderPlus size={16} className="text-gray-600" />
                  </button>
                  {file.file_type === 'image/svg+xml' && (
                    <button
                      onClick={() => handleAddToCanvas(file)}
                      className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                      title="Add to canvas as graphic"
                    >
                      <Image size={16} className="text-green-600" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add to Collection Modal */}
      {addingToCollectionFile && (
        <AddFileToCollectionModal
          fileId={addingToCollectionFile.id}
          fileName={addingToCollectionFile.display_filename}
          spaceId={spaceId}
          spaceType={spaceType}
          onClose={() => setAddingToCollectionFile(null)}
          onSuccess={() => {
            setAddingToCollectionFile(null);
          }}
        />
      )}

      {/* Tag Management Modal */}
      {managingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Manage Tags</h3>
              <button
                onClick={() => setManagingTagsFileId(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  File: <span className="font-medium text-gray-900">{managingFile.display_filename}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Create New Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                  <button
                    onClick={handleCreateTag}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Tags
                </label>
                {allTags.length === 0 ? (
                  <p className="text-sm text-gray-500">No tags yet. Create one above!</p>
                ) : (
                  <div className="space-y-1">
                    {allTags.map((tag) => {
                      const isAssigned = managingFile.tags.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(managingFile.id, tag.id, isAssigned)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            isAssigned
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setManagingTagsFileId(null)}
                className="w-full px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
