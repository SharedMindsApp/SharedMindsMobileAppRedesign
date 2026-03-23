/**
 * WorkspaceResearch Component
 * 
 * Phase 3.4: Research Micro-App (Workspace)
 * 
 * Research and thinking surface for Track & Subtrack Workspaces.
 * Research notes are workspace-owned domain data.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Display research notes list (via service layer)
 * - ✅ Create notes (via service layer)
 * - ✅ Edit notes (via service layer)
 * - ✅ Delete notes (via service layer)
 * - ✅ Manage tags and source URLs (via service layer)
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
 * Phase 3.4 Scope:
 * - Read/Write: track_research_notes (via service layer)
 * - Research notes belong to Workspaces, not Roadmap
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Trash2, Edit2, X, Save, Tag as TagIcon, Link as LinkIcon, Loader2 } from 'lucide-react';
import {
  getTrackResearchNotes,
  createResearchNote,
  updateResearchNote,
  deleteResearchNote,
  type TrackResearchNote,
} from '../../../../lib/guardrails/workspace/researchService';
import { useAuth } from '../../../../contexts/AuthContext';

export interface WorkspaceResearchProps {
  // Context data
  projectId: string;
  trackId: string; // Parent track ID (for subtracks, this is the parent; for tracks, this is the track)
  subtrackId?: string | null; // Subtrack ID (null for main tracks)
}

export function WorkspaceResearch({
  projectId,
  trackId,
  subtrackId = null,
}: WorkspaceResearchProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<TrackResearchNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state for editing/creating
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState<string>('');
  const [formSourceUrls, setFormSourceUrls] = useState<string>('');

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [trackId, subtrackId]);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedNotes = await getTrackResearchNotes(trackId, subtrackId);
      setNotes(loadedNotes);
    } catch (err) {
      console.error('[WorkspaceResearch] Error loading notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load research notes');
    } finally {
      setLoading(false);
    }
  }, [trackId, subtrackId]);

  // Handle create
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormSourceUrls('');
    setError(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormSourceUrls('');
  }, []);

  const handleSaveCreate = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!formTitle.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setError(null);

      const tags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const sourceUrls = formSourceUrls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      await createResearchNote(
        {
          trackId,
          subtrackId: subtrackId || null,
          title: formTitle.trim(),
          content: formContent.trim() || null,
          tags,
          sourceUrls,
        },
        user.id
      );

      await loadNotes();
      setIsCreating(false);
      setFormTitle('');
      setFormContent('');
      setFormTags('');
      setFormSourceUrls('');
    } catch (err) {
      console.error('[WorkspaceResearch] Error creating note:', err);
      setError(err instanceof Error ? err.message : 'Failed to create research note');
    }
  }, [formTitle, formContent, formTags, formSourceUrls, trackId, subtrackId, user?.id, loadNotes]);

  // Handle edit
  const handleStartEdit = useCallback((note: TrackResearchNote) => {
    setEditingId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content || '');
    setFormTags(note.tags.join(', '));
    setFormSourceUrls(note.source_urls.join('\n'));
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormSourceUrls('');
  }, []);

  const handleSaveEdit = useCallback(
    async (noteId: string) => {
      if (!formTitle.trim()) {
        setError('Title is required');
        return;
      }

      try {
        setError(null);

        const tags = formTags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        const sourceUrls = formSourceUrls
          .split('\n')
          .map((u) => u.trim())
          .filter((u) => u.length > 0);

        await updateResearchNote(noteId, {
          title: formTitle.trim(),
          content: formContent.trim() || null,
          tags,
          sourceUrls,
        });

        await loadNotes();
        setEditingId(null);
        setFormTitle('');
        setFormContent('');
        setFormTags('');
        setFormSourceUrls('');
      } catch (err) {
        console.error('[WorkspaceResearch] Error updating note:', err);
        setError(err instanceof Error ? err.message : 'Failed to update research note');
      }
    },
    [formTitle, formContent, formTags, formSourceUrls, loadNotes]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (noteId: string) => {
      if (!window.confirm('Are you sure you want to delete this research note?')) {
        return;
      }

      try {
        setDeletingId(noteId);
        setError(null);

        await deleteResearchNote(noteId);
        await loadNotes();
      } catch (err) {
        console.error('[WorkspaceResearch] Error deleting note:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete research note');
      } finally {
        setDeletingId(null);
      }
    },
    [loadNotes]
  );

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get excerpt (first ~2 lines)
  const getExcerpt = (content: string | null, maxLength: number = 150): string => {
    if (!content) return '';
    const lines = content.split('\n').slice(0, 2);
    const excerpt = lines.join(' ').trim();
    return excerpt.length > maxLength ? excerpt.substring(0, maxLength) + '...' : excerpt;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading research notes...</p>
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
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Header with create button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Research</h2>
            {!isCreating && (
              <button
                onClick={handleStartCreate}
                disabled={!!editingId || !user}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                <span>New Note</span>
              </button>
            )}
          </div>

          {/* Create form */}
          {isCreating && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Research note title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Capture thoughts, ideas, and findings..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source URLs (one per line)
                  </label>
                  <textarea
                    value={formSourceUrls}
                    onChange={(e) => setFormSourceUrls(e.target.value)}
                    placeholder="https://example.com&#10;https://another-source.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelCreate}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X size={16} className="inline-block mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCreate}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes list */}
          {!isCreating && notes.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No research yet</h3>
              <p className="text-gray-600 mb-4">
                Capture thoughts, ideas, and findings related to this track.
              </p>
              <button
                onClick={handleStartCreate}
                disabled={!user}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                <span>Create your first research note</span>
              </button>
            </div>
          )}

          {!isCreating && notes.length > 0 && (
            <div className="space-y-4">
              {notes.map((note) => {
                const isEditing = editingId === note.id;
                const isDeleting = deletingId === note.id;

                return (
                  <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                          <textarea
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={formTags}
                            onChange={(e) => setFormTags(e.target.value)}
                            placeholder="tag1, tag2, tag3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Source URLs (one per line)
                          </label>
                          <textarea
                            value={formSourceUrls}
                            onChange={(e) => setFormSourceUrls(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <X size={16} className="inline-block mr-2" />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Save size={16} />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{note.title}</h3>
                            {note.content && (
                              <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
                                {getExcerpt(note.content)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleStartEdit(note)}
                              disabled={isDeleting || !!editingId}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              disabled={isDeleting || !!editingId}
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
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                          {note.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <TagIcon size={14} />
                              <span>{note.tags.length} tag{note.tags.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {note.source_urls.length > 0 && (
                            <div className="flex items-center gap-1">
                              <LinkIcon size={14} />
                              <span>{note.source_urls.length} source{note.source_urls.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          <div className="ml-auto">
                            Updated {formatDate(note.updated_at)}
                          </div>
                        </div>
                      </div>
                    )}
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
