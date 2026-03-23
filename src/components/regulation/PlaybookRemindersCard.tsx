import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPlaybooks } from '../../lib/regulation/playbookService';
import type { RegulationPlaybook } from '../../lib/regulation/playbookTypes';

const SIGNAL_NAMES: Record<string, string> = {
  context_switching: 'Rapid Context Switching',
  scope_expansion: 'Runaway Scope Expansion',
  task_hopping: 'Fragmented Focus Session',
  deadline_pressure: 'Time Pressure',
  cognitive_overload: 'Mental Overwhelm',
};

export function PlaybookRemindersCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState<RegulationPlaybook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlaybooks();
    }
  }, [user]);

  async function loadPlaybooks() {
    if (!user) return;

    try {
      const data = await getUserPlaybooks(user.id);
      setPlaybooks(data.slice(0, 3));
    } catch (error) {
      console.error('[PlaybookRemindersCard] Error loading playbooks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || playbooks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-gray-400" />
        <h3 className="font-medium text-gray-900">Past Notes</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Past-you noticed these patterns before and left some notes.
      </p>

      <div className="space-y-3">
        {playbooks.map(playbook => (
          <div key={playbook.id} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {SIGNAL_NAMES[playbook.signal_key] || playbook.signal_key}
            </p>
            {playbook.notes && (
              <p className="text-sm text-gray-600 line-clamp-2">{playbook.notes}</p>
            )}
            {playbook.helps && playbook.helps.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {playbook.helps.slice(0, 2).map(help => (
                  <span key={help} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {help}
                  </span>
                ))}
                {playbook.helps.length > 2 && (
                  <span className="text-xs text-gray-500">+{playbook.helps.length - 2} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/regulation/playbooks')}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        View all playbooks
      </button>
    </div>
  );
}
