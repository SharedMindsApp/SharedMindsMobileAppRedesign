import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, StickyNote, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { FridgeWidget, NoteContent } from '../../../lib/fridgeCanvasTypes';

interface MobileNotesAppProps {
  householdId?: string;
  onClose: () => void;
}

const colors = [
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', value: 'bg-yellow-100' },
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800', value: 'bg-pink-100' },
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800', value: 'bg-blue-100' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800', value: 'bg-green-100' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', value: 'bg-purple-100' },
];

export function MobileNotesApp({ householdId, onClose }: MobileNotesAppProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<FridgeWidget[]>([]);
  const [selectedNote, setSelectedNote] = useState<FridgeWidget | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (householdId) {
      loadNotes();
    }
  }, [householdId]);

  const loadNotes = async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fridge_widgets')
        .select('*')
        .eq('household_id', householdId)
        .eq('widget_type', 'note')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!householdId || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newNote: Partial<FridgeWidget> = {
        household_id: householdId,
        created_by: profile.id,
        widget_type: 'note',
        title: 'New Note',
        content: { text: '', color: randomColor.value },
        color: 'yellow',
        icon: 'StickyNote'
      };

      const { data, error } = await supabase
        .from('fridge_widgets')
        .insert(newNote)
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setSelectedNote(data);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const updateNote = async (noteId: string, content: NoteContent) => {
    try {
      const { error } = await supabase
        .from('fridge_widgets')
        .update({ content })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...selectedNote, content });
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('fridge_widgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const getColorScheme = (colorValue: string) => {
    return colors.find(c => c.value === colorValue) || colors[0];
  };

  if (loading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading notes...</div>
      </div>
    );
  }

  if (selectedNote) {
    const noteContent = selectedNote.content as NoteContent;
    const colorScheme = getColorScheme(noteContent.color || 'bg-yellow-100');

    return (
      <div className="h-full bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => setSelectedNote(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Edit Note</h1>
          <button
            onClick={() => deleteNote(selectedNote.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={20} className="text-red-500" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <div className={`w-full h-full ${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl p-6`}>
            <textarea
              className={`w-full h-full ${colorScheme.bg} resize-none border-none focus:outline-none text-gray-800 font-medium leading-relaxed`}
              placeholder="Write your note here..."
              value={noteContent.text || ''}
              onChange={(e) => updateNote(selectedNote.id, { ...noteContent, text: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Notes</h1>
        <button
          onClick={createNote}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <StickyNote size={64} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Notes Yet</h2>
            <p className="text-gray-500 mb-6">Create your first note to get started</p>
            <button
              onClick={createNote}
              className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-xl font-semibold hover:bg-yellow-500 transition-colors"
            >
              Create Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {notes.map((note) => {
              const noteContent = note.content as NoteContent;
              const colorScheme = getColorScheme(noteContent.color || 'bg-yellow-100');

              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl p-4 h-40 flex flex-col items-start text-left hover:shadow-lg transition-shadow`}
                >
                  <StickyNote size={20} className={`${colorScheme.text} mb-2`} />
                  <p className="text-sm text-gray-800 line-clamp-5 leading-snug">
                    {noteContent.text || 'Empty note...'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
