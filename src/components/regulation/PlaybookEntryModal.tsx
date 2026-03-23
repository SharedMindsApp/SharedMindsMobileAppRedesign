import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createPlaybook,
  updatePlaybook,
  getPlaybookBySignalKey,
} from '../../lib/regulation/playbookService';
import { HELPS_OPTIONS } from '../../lib/regulation/playbookTypes';
import type { RegulationPlaybook } from '../../lib/regulation/playbookTypes';

interface PlaybookEntryModalProps {
  signalKey: string;
  signalName: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function PlaybookEntryModal({
  signalKey,
  signalName,
  onClose,
  onSaved,
}: PlaybookEntryModalProps) {
  const { user } = useAuth();
  const [existingPlaybook, setExistingPlaybook] = useState<RegulationPlaybook | null>(null);
  const [notes, setNotes] = useState('');
  const [helps, setHelps] = useState<string[]>([]);
  const [doesntHelp, setDoesntHelp] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadExistingPlaybook();
    }
  }, [user, signalKey]);

  async function loadExistingPlaybook() {
    if (!user) return;

    try {
      const playbook = await getPlaybookBySignalKey(user.id, signalKey);
      if (playbook) {
        setExistingPlaybook(playbook);
        setNotes(playbook.notes || '');
        setHelps(playbook.helps || []);
        setDoesntHelp(playbook.doesnt_help || '');
      }
    } catch (error) {
      console.error('[PlaybookEntryModal] Error loading playbook:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleHelp = (help: string) => {
    setHelps(prev => (prev.includes(help) ? prev.filter(h => h !== help) : [...prev, help]));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (existingPlaybook) {
        await updatePlaybook(user.id, signalKey, {
          notes: notes.trim() || undefined,
          helps,
          doesnt_help: doesntHelp.trim() || undefined,
        });
      } else {
        await createPlaybook(user.id, {
          signal_key: signalKey,
          notes: notes.trim() || undefined,
          helps,
          doesnt_help: doesntHelp.trim() || undefined,
        });
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('[PlaybookEntryModal] Error saving playbook:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Your personal note for this situation
            </h2>
            <p className="text-sm text-gray-600">{signalName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When this happens (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Free text — no AI rewriting, no prompts"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What usually helps (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {HELPS_OPTIONS.map(help => (
                <button
                  key={help}
                  onClick={() => toggleHelp(help)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    helps.includes(help)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {helps.includes(help) && <span className="mr-1">✓</span>}
                  {help}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What doesn't help (optional)
            </label>
            <textarea
              value={doesntHelp}
              onChange={e => setDoesntHelp(e.target.value)}
              placeholder="Free text"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This is for you. Nothing here is binding.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
