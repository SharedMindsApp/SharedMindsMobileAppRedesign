/**
 * Personal Journal View for Planner
 * 
 * Uses Tracker Studio to display personal journaling. Finds or creates
 * a Personal Journal instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function PersonalJournalView() {
  const navigate = useNavigate();
  const [journalTracker, setJournalTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJournalTracker();
  }, []);

  const loadJournalTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const journalTemplate = templates.find(t => t.name === 'Personal Journal' && t.scope === 'global');
      
      if (!journalTemplate) {
        setError('Personal Journal template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === journalTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setJournalTracker(existingTracker);
      } else {
        setJournalTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personal journal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const journalTemplate = templates.find(t => t.name === 'Personal Journal' && t.scope === 'global');
      
      if (!journalTemplate) {
        setError('Personal Journal template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: journalTemplate.id,
        name: 'Personal Journal',
        description: 'Record your thoughts and reflections',
      });

      setJournalTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create personal journal');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Personal Journal</h2>
            <p className="text-slate-600 mt-1">Record your thoughts and reflections</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading personal journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Personal Journal</h2>
            <p className="text-slate-600 mt-1">Record your thoughts and reflections</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadJournalTracker}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Personal Journal</h2>
            <p className="text-slate-600 mt-1">Record your thoughts and reflections</p>
          </div>
        </div>
        {journalTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${journalTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {journalTracker ? (
        <PlannerTrackerBlock trackerId={journalTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <BookOpen size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Personal Journal Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a personal journal to start recording your thoughts
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Personal Journal
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
