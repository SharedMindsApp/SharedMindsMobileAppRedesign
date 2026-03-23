import React, { useEffect, useState } from 'react';
import { BookOpen, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPlaybooks, deletePlaybook } from '../../lib/regulation/playbookService';
import type { RegulationPlaybook } from '../../lib/regulation/playbookTypes';
import { PlaybookEntryModal } from './PlaybookEntryModal';

const SIGNAL_NAMES: Record<string, string> = {
  context_switching: 'Rapid Context Switching',
  scope_expansion: 'Runaway Scope Expansion',
  task_hopping: 'Fragmented Focus Session',
  deadline_pressure: 'Time Pressure',
  cognitive_overload: 'Mental Overwhelm',
};

export function MyPlaybooksPage() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<RegulationPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlaybook, setEditingPlaybook] = useState<RegulationPlaybook | null>(null);

  useEffect(() => {
    if (user) {
      loadPlaybooks();
    }
  }, [user]);

  async function loadPlaybooks() {
    if (!user) return;

    try {
      const data = await getUserPlaybooks(user.id);
      setPlaybooks(data);
    } catch (error) {
      console.error('[MyPlaybooksPage] Error loading playbooks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(signalKey: string) {
    if (!user) return;

    if (confirm('Delete this playbook entry? This cannot be undone.')) {
      try {
        await deletePlaybook(user.id, signalKey);
        await loadPlaybooks();
      } catch (error) {
        console.error('[MyPlaybooksPage] Error deleting playbook:', error);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Loading your playbooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Playbooks</h1>
              <p className="text-sm text-gray-600">
                Your personal notes about what works when certain regulation signals appear.
                These are for you - nothing here is binding or tracked.
              </p>
            </div>
          </div>

          {playbooks.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-2">No playbook entries yet</p>
              <p className="text-sm text-gray-500">
                When a regulation signal appears, you can add a quick note or playbook entry
                to remember what helps in that situation.
              </p>
            </div>
          )}
        </div>

        {playbooks.map(playbook => (
          <div key={playbook.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {SIGNAL_NAMES[playbook.signal_key] || playbook.signal_key}
                </h3>
                <p className="text-sm text-gray-500">
                  Last updated {new Date(playbook.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingPlaybook(playbook)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(playbook.signal_key)}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {playbook.notes && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Your notes:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {playbook.notes}
                </p>
              </div>
            )}

            {playbook.helps && playbook.helps.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">What usually helps:</p>
                <div className="flex flex-wrap gap-2">
                  {playbook.helps.map(help => (
                    <span
                      key={help}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                    >
                      {help}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {playbook.doesnt_help && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">What doesn't help:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {playbook.doesnt_help}
                </p>
              </div>
            )}
          </div>
        ))}

        {editingPlaybook && (
          <PlaybookEntryModal
            signalKey={editingPlaybook.signal_key}
            signalName={SIGNAL_NAMES[editingPlaybook.signal_key] || editingPlaybook.signal_key}
            onClose={() => setEditingPlaybook(null)}
            onSaved={() => {
              setEditingPlaybook(null);
              loadPlaybooks();
            }}
          />
        )}
      </div>
    </div>
  );
}
