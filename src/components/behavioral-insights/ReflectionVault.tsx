/**
 * Reflection Vault - Chronological Archive
 *
 * Private, chronological archive of user reflections.
 *
 * CRITICAL:
 * - NO analytics or summaries
 * - NO search suggestions
 * - Simple chronological list
 * - Manual search only (string match)
 * - Framed as "record, not report"
 */

import { useState, useEffect } from 'react';
import { FileText, Calendar, Tag, Search, Edit2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ReflectionPanel } from './ReflectionPanel';
import {
  getReflections,
  getReflectionStats,
  getUserTags,
  type ReflectionEntry,
  type ReflectionStats,
} from '../../lib/behavioral-sandbox';

export function ReflectionVault() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingReflection, setEditingReflection] = useState<ReflectionEntry | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [reflectionsData, statsData, tagsData] = await Promise.all([
        getReflections(user.id),
        getReflectionStats(user.id),
        getUserTags(user.id),
      ]);

      setReflections(reflectionsData);
      setStats(statsData);
      setAllTags(tagsData);
    } catch (error) {
      console.error('Failed to load reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReflectionSaved = () => {
    setEditingReflection(null);
    loadData();
  };

  const handleReflectionDeleted = () => {
    setEditingReflection(null);
    loadData();
  };

  const filteredReflections = reflections.filter((reflection) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!reflection.content.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (selectedTag) {
      if (!reflection.user_tags.includes(selectedTag)) {
        return false;
      }
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading reflections...</div>
      </div>
    );
  }

  if (editingReflection) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Reflection</h2>
        </div>
        <ReflectionPanel
          existingReflection={editingReflection}
          onSaved={handleReflectionSaved}
          onDeleted={handleReflectionDeleted}
          onCancel={() => setEditingReflection(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reflection Archive</h2>
        <p className="text-gray-600">
          This is a record, not a report. Your reflections are for you.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Reflections are not analysed</p>
            <p className="text-blue-800">
              The system does not extract themes, detect sentiment, or use these in any
              way. This space is yours alone.
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total_count}</div>
            <div className="text-sm text-gray-600">Total reflections</div>
          </div>
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.has_linked}</div>
            <div className="text-sm text-gray-600">Linked to insights</div>
          </div>
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.has_unlinked}</div>
            <div className="text-sm text-gray-600">Standalone</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections (manual, string match only)..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {allTags.length > 0 && (
          <select
            value={selectedTag ?? ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {filteredReflections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            {reflections.length === 0
              ? 'No reflections yet'
              : 'No reflections match your search'}
          </p>
          {reflections.length === 0 && (
            <p className="text-gray-500 text-sm">
              Reflections appear here when you write them. They are optional.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReflections.map((reflection) => (
            <div
              key={reflection.id}
              className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(reflection.created_at)}</span>
                  {reflection.updated_at !== reflection.created_at && (
                    <span className="text-xs">(edited)</span>
                  )}
                </div>

                <button
                  onClick={() => setEditingReflection(reflection)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <p className="text-gray-900 whitespace-pre-wrap mb-3">
                {reflection.content}
              </p>

              {reflection.user_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {reflection.user_tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              )}

              {(reflection.linked_signal_id ||
                reflection.linked_project_id ||
                reflection.linked_space_id) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {reflection.linked_signal_id && <span>Linked to insight</span>}
                    {reflection.linked_project_id && <span>Linked to project</span>}
                    {reflection.linked_space_id && <span>Linked to space</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredReflections.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredReflections.length} of {reflections.length} reflection
          {reflections.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
