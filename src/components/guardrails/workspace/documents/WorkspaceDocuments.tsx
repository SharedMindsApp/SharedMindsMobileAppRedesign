/**
 * WorkspaceDocuments Component
 * 
 * Phase 3.3: Documents Micro-App (Workspace)
 * 
 * Document storage and management inside Track & Subtrack Workspaces.
 * Documents are workspace-owned domain data.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display document list (via service layer)
 * - ✅ Upload documents (via service layer)
 * - ✅ Delete documents (via service layer)
 * - ✅ Edit document metadata (via service layer)
 * - ✅ Manage local UI state
 * 
 * What this component MUST NOT do:
 * - ❌ Query Supabase directly (use service layer only)
 * - ❌ Render roadmap logic
 * - ❌ Render timeline/bucket logic
 * - ❌ Shape projection data
 * - ❌ Navigate to roadmap
 * - ❌ Create roadmap items
 * 
 * Phase 3.3 Scope:
 * - Read/Write: track_documents (via service layer)
 * - Read/Write: Supabase Storage (via service layer)
 * - Documents belong to Workspaces, not Roadmap
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, File, Trash2, Edit2, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { getTrackDocuments, uploadTrackDocument, deleteTrackDocument, updateTrackDocumentMetadata, getDocumentDownloadUrl, type TrackDocument } from '../../../../lib/guardrails/workspace/documentService';
import { useAuth } from '../../../../contexts/AuthContext';
import { useActiveProject } from '../../../../contexts/ActiveProjectContext';

export interface WorkspaceDocumentsProps {
  // Context data
  projectId: string;
  trackId: string; // Parent track ID (for subtracks, this is the parent; for tracks, this is the track)
  subtrackId?: string | null; // Subtrack ID (null for main tracks)
}

export function WorkspaceDocuments({
  projectId,
  trackId,
  subtrackId = null,
}: WorkspaceDocumentsProps) {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<TrackDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents function
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const docs = await getTrackDocuments(trackId, subtrackId);
      setDocuments(docs);
    } catch (err) {
      console.error('[WorkspaceDocuments] Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [trackId, subtrackId]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle file upload
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const title = file.name;
      const newDocument = await uploadTrackDocument(
        {
          trackId,
          subtrackId: subtrackId || null,
          title,
          file,
        },
        user.id,
        projectId
      );

      // Reload documents list
      await loadDocuments();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[WorkspaceDocuments] Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }, [trackId, subtrackId, user?.id, projectId, loadDocuments]);

  // Handle delete
  const handleDelete = useCallback(async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingId(documentId);
      setError(null);

      await deleteTrackDocument(documentId);

      // Reload documents list
      await loadDocuments();
    } catch (err) {
      console.error('[WorkspaceDocuments] Error deleting document:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }, [loadDocuments]);

  // Handle edit start
  const handleStartEdit = useCallback((document: TrackDocument) => {
    setEditingId(document.id);
    setEditTitle(document.title);
  }, []);

  // Handle edit cancel
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
  }, []);

  // Handle edit save
  const handleSaveEdit = useCallback(async (documentId: string) => {
    try {
      setError(null);

      await updateTrackDocumentMetadata(documentId, {
        title: editTitle.trim(),
      });

      // Reload documents list
      await loadDocuments();
      setEditingId(null);
      setEditTitle('');
    } catch (err) {
      console.error('[WorkspaceDocuments] Error updating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to update document');
    }
  }, [editTitle, loadDocuments]);

  // Handle download
  const handleDownload = useCallback(async (document: TrackDocument) => {
    try {
      const url = await getDocumentDownloadUrl(document.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[WorkspaceDocuments] Error downloading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  }, []);

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get file type icon
  const getFileTypeIcon = (fileType: string | null): string => {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('document')) return '📄';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📄';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Header with upload button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading || !user}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !user}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Documents list */}
          {documents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <File size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-4">
                Upload files to keep important material with this track.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !user}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                <span>Upload your first document</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {documents.map((document) => {
                const isEditing = editingId === document.id;
                const isDeleting = deletingId === document.id;

                return (
                  <div
                    key={document.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* File icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getFileTypeIcon(document.file_type)}
                      </div>

                      {/* Document info */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(document.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(document.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              aria-label="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              aria-label="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <button
                              onClick={() => handleDownload(document)}
                              className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block w-full"
                            >
                              {document.title}
                            </button>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>{formatFileSize(document.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(document.uploaded_at)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(document)}
                            disabled={isDeleting}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Edit title"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(document.id)}
                            disabled={isDeleting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete"
                          >
                            {isDeleting ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
