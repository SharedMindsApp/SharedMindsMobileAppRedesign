import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createQuickPin } from '../../lib/regulation/playbookService';
import { REASON_TAG_OPTIONS } from '../../lib/regulation/playbookTypes';

interface QuickPinCardProps {
  signalKey: string;
  signalInstanceId?: string;
  onSaved?: () => void;
  onSkipped?: () => void;
}

export function QuickPinCard({
  signalKey,
  signalInstanceId,
  onSaved,
  onSkipped,
}: QuickPinCardProps) {
  const { user } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await createQuickPin(user.id, {
        signal_key: signalKey,
        signal_instance_id: signalInstanceId,
        reason_tags: selectedTags,
        note: note.trim() || undefined,
      });

      onSaved?.();
    } catch (error) {
      console.error('[QuickPinCard] Error saving quick pin:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onSkipped?.();
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-700">This showed up because... (optional)</p>
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Skip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {REASON_TAG_OPTIONS.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
            }`}
          >
            {selectedTags.includes(tag) && <span className="mr-1">✓</span>}
            {tag}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional one-line note to future-you"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
