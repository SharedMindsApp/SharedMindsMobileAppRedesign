import { useState, useEffect, useRef } from 'react';
import { Save, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface NotesEditorProps {
  sessionId: string;
}

export function NotesEditor({ sessionId }: NotesEditorProps) {
  const [notes, setNotes] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotes();
  }, [sessionId]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (notes.trim()) {
        saveNotes();
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes]);

  async function loadNotes() {
    try {
      const { data, error } = await supabase
        .from('focus_session_notes')
        .select('content')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setNotes(data.content || '');
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  async function saveNotes() {
    if (!notes.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const { data: existing } = await supabase
        .from('focus_session_notes')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('focus_session_notes')
          .update({ content: notes, updated_at: new Date().toISOString() })
          .eq('session_id', sessionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('focus_session_notes')
          .insert({ session_id: sessionId, content: notes });

        if (error) throw error;
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save notes:', error);
      setSaveError('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  }

  function getLastSavedText() {
    if (!lastSaved) return 'Not saved';

    const secondsAgo = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (secondsAgo < 5) return 'Saved just now';
    if (secondsAgo < 60) return `Saved ${secondsAgo}s ago`;

    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo === 1) return 'Saved 1 minute ago';
    if (minutesAgo < 60) return `Saved ${minutesAgo} minutes ago`;

    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Session Notes</h3>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {isSaving ? (
            <>
              <Save size={12} className="animate-pulse text-blue-600" />
              <span>Saving...</span>
            </>
          ) : saveError ? (
            <span className="text-red-600">{saveError}</span>
          ) : lastSaved ? (
            <>
              <Check size={12} className="text-green-600" />
              <span>{getLastSavedText()}</span>
            </>
          ) : null}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about your focus session...&#10;&#10;Capture ideas, insights, or progress updates as you work."
        className="flex-1 w-full p-4 border-0 focus:ring-0 resize-none text-sm text-gray-900 placeholder:text-gray-400"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      />

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          {notes.length} characters • Auto-saves every 2 seconds
        </p>
      </div>
    </div>
  );
}
