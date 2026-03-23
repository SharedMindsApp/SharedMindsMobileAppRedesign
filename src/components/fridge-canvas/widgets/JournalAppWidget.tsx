/**
 * Journal App Widget
 * 
 * Standalone journaling application for Spaces. Supports both personal journal
 * and gratitude journal entries in a unified interface.
 */

import { useState, useEffect } from 'react';
import { BookOpen, Heart, Plus, Search, Calendar, Tag, Edit2, Trash2, X, Filter } from 'lucide-react';
import type { JournalEntry, JournalEntryType } from '../../../lib/journalService';
import {
  getAllJournalEntries,
  getPersonalJournalEntries,
  getGratitudeEntries,
  createPersonalJournalEntry,
  createGratitudeEntry,
  updatePersonalJournalEntry,
  updateGratitudeEntry,
  deletePersonalJournalEntry,
  deleteGratitudeEntry,
  searchJournalEntries,
} from '../../../lib/journalService';
import { showToast } from '../../Toast';

interface JournalAppWidgetProps {
  householdId: string;
  viewMode?: 'icon' | 'mini' | 'large' | 'xlarge';
}

export function JournalAppWidget({ householdId, viewMode = 'large' }: JournalAppWidgetProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<JournalEntryType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formType, setFormType] = useState<JournalEntryType>('personal');
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    tags: [] as string[],
    format: 'free_write' as 'free_write' | 'bullets',
  });

  useEffect(() => {
    loadEntries();
  }, [householdId, selectedType]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      let data: JournalEntry[];
      
      if (selectedType === 'all') {
        data = await getAllJournalEntries(householdId);
      } else if (selectedType === 'personal') {
        const personalEntries = await getPersonalJournalEntries(householdId);
        data = personalEntries.map(entry => ({
          id: entry.id,
          type: 'personal' as JournalEntryType,
          entry_date: entry.entry_date,
          title: entry.title,
          content: entry.content,
          tags: entry.tags,
          is_private: entry.is_private,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        }));
      } else {
        const gratitudeEntries = await getGratitudeEntries(householdId);
        data = gratitudeEntries.map(entry => ({
          id: entry.id,
          type: 'gratitude' as JournalEntryType,
          entry_date: entry.entry_date,
          content: entry.content,
          format: entry.format,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        }));
      }

      // Apply search filter
      if (searchQuery || selectedTags.length > 0) {
        data = await searchJournalEntries(householdId, searchQuery, selectedType === 'all' ? undefined : selectedType, selectedTags);
      }

      setEntries(data);
    } catch (error) {
      console.error('Failed to load entries:', error);
      showToast('error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery || selectedTags.length > 0) {
      const timeoutId = setTimeout(() => {
        loadEntries();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      loadEntries();
    }
  }, [searchQuery, selectedTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEntry) {
        // Update existing entry
        if (editingEntry.type === 'personal') {
          await updatePersonalJournalEntry(editingEntry.id, {
            entry_date: formData.entry_date,
            title: formData.title,
            content: formData.content,
            tags: formData.tags,
          });
        } else {
          await updateGratitudeEntry(editingEntry.id, {
            entry_date: formData.entry_date,
            content: formData.content,
            format: formData.format,
          });
        }
        showToast('success', 'Entry updated');
      } else {
        // Create new entry
        if (formType === 'personal') {
          await createPersonalJournalEntry({
            space_id: householdId,
            entry_date: formData.entry_date,
            title: formData.title,
            content: formData.content,
            tags: formData.tags,
            is_private: true,
          });
        } else {
          await createGratitudeEntry({
            space_id: householdId,
            entry_date: formData.entry_date,
            content: formData.content,
            format: formData.format,
          });
        }
        showToast('success', 'Entry created');
      }
      
      resetForm();
      await loadEntries();
    } catch (error) {
      console.error('Failed to save entry:', error);
      showToast('error', 'Failed to save entry');
    }
  };

  const handleDelete = async (entry: JournalEntry) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      if (entry.type === 'personal') {
        await deletePersonalJournalEntry(entry.id);
      } else {
        await deleteGratitudeEntry(entry.id);
      }
      showToast('success', 'Entry deleted');
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      showToast('error', 'Failed to delete entry');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setFormData({
      entry_date: entry.entry_date,
      title: entry.title || '',
      content: entry.content,
      tags: entry.tags || [],
      format: entry.format || 'free_write',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      tags: [],
      format: 'free_write',
    });
    setShowForm(false);
  };

  // Get all unique tags from entries
  const allTags = Array.from(
    new Set(entries.flatMap(entry => entry.tags || []))
  ).sort();

  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
        <BookOpen size={32} className="text-amber-600" />
      </div>
    );
  }

  if (viewMode === 'mini') {
    const recentEntry = entries[0];
    return (
      <div className="w-full h-full p-4 flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={18} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">Journal</span>
        </div>
        {recentEntry ? (
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-amber-800 font-medium mb-1 line-clamp-1">
              {recentEntry.title || new Date(recentEntry.entry_date).toLocaleDateString()}
            </p>
            <p className="text-xs text-amber-700 line-clamp-3">
              {recentEntry.content}
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-600 italic">No entries yet</p>
        )}
        <div className="mt-2 text-xs text-amber-700">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BookOpen size={24} className="text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Journal</h1>
                <p className="text-sm text-gray-600">Your thoughts, reflections, and gratitude</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Entry</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('personal')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedType === 'personal'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpen size={14} />
              Personal
            </button>
            <button
              onClick={() => setSelectedType('gratitude')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedType === 'gratitude'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart size={14} />
              Gratitude
            </button>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 safe-top safe-bottom">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEntry ? 'Edit Entry' : 'New Entry'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Entry Type Selector (only when creating new) */}
              {!editingEntry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('personal')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                        formType === 'personal'
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <BookOpen size={18} />
                      Personal Journal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('gratitude')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                        formType === 'gratitude'
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Heart size={18} />
                      Gratitude
                    </button>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Title (Personal Journal only) */}
              {formType === 'personal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Entry title..."
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formType === 'gratitude' ? 'What are you grateful for?' : 'Content'}
                </label>
                {formType === 'gratitude' && (
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'free_write' })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        formData.format === 'free_write'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Free Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, format: 'bullets' })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        formData.format === 'bullets'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bullets
                    </button>
                  </div>
                )}
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={formType === 'gratitude' ? "Write what you're grateful for..." : 'Write your thoughts...'}
                  required
                  rows={(formType === 'gratitude' && formData.format === 'bullets') ? 8 : 12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                {formType === 'gratitude' && formData.format === 'bullets' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Tip: Use bullet points, one per line
                  </p>
                )}
              </div>

              {/* Tags (Personal Journal only) */}
              {formType === 'personal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (optional)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              tags: formData.tags.filter((_, i) => i !== idx),
                            });
                          }}
                          className="hover:text-amber-900"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add a tag and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !formData.tags.includes(value)) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, value],
                          });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">No entries yet</p>
            <p className="text-sm text-gray-500 mb-4">Start journaling to capture your thoughts and reflections</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create First Entry
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {entry.type === 'gratitude' ? (
                      <Heart size={18} className="text-rose-500" />
                    ) : (
                      <BookOpen size={18} className="text-amber-600" />
                    )}
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {entry.type === 'gratitude' ? 'Gratitude' : 'Personal'}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.entry_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {entry.title && (
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{entry.title}</h3>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                {entry.format === 'bullets' ? (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {entry.content.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <li key={idx}>{line.trim()}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                )}
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {entry.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      <Tag size={12} className="inline mr-1" />
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
