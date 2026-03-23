import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Search, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

export function WorkNotes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[]
  });

  const noteTypes = [
    'meeting',
    'decision',
    'idea',
    'summary',
    'one-on-one',
    'retrospective',
    'planning'
  ];

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%work-note%')
      .order('created_at', { ascending: false });

    if (data) {
      setNotes(data.map(n => {
        const metadata = n.metadata as any || {};
        return {
          id: n.id,
          title: n.title || 'Untitled Note',
          content: n.content || '',
          tags: metadata.tags || [],
          created_at: n.created_at
        };
      }));
    }

    setLoading(false);
  };

  const addNote = async () => {
    if (!user || !newNote.title.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newNote.title,
        content: newNote.content,
        tags: 'work-note',
        metadata: {
          tags: newNote.tags
        }
      });

    setNewNote({ title: '', content: '', tags: [] });
    setShowForm(false);
    loadNotes();
  };

  const toggleTag = (tag: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      searchTerm === '' ||
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = filterTag === 'all' || note.tags.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/work')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Work & Career</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Work Notes & Reflections</h1>
              <p className="text-slate-600 mt-1">Meeting notes, decisions, and reflections</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Note
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Q1 Planning Meeting, Decision on Tech Stack"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={6}
                    placeholder="Write your notes here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {noteTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleTag(type)}
                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                          newNote.tags.includes(type)
                            ? 'bg-teal-100 text-teal-700 border-teal-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addNote}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewNote({ title: '', content: '', tags: [] });
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-600" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Tags</option>
                {noteTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No notes found</h3>
            <p className="text-slate-600">
              {searchTerm || filterTag !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first work note'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800 flex-1">{note.title}</h3>
                  <span className="text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-teal-100 text-teal-700 border border-teal-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
