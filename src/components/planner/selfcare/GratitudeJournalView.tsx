/**
 * Gratitude Journal View for Planner
 * 
 * Uses Tracker Studio to display gratitude journaling. Finds or creates
 * a Gratitude Journal instance from the Gratitude Journal template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookHeart, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function GratitudeJournalView() {
  const navigate = useNavigate();
  const [gratitudeTracker, setGratitudeTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGratitudeTracker();
  }, []);

  const loadGratitudeTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const gratitudeTemplate = templates.find(t => t.name === 'Gratitude Journal' && t.scope === 'global');
      
      if (!gratitudeTemplate) {
        setError('Gratitude Journal template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === gratitudeTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setGratitudeTracker(existingTracker);
      } else {
        setGratitudeTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gratitude journal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const gratitudeTemplate = templates.find(t => t.name === 'Gratitude Journal' && t.scope === 'global');
      
      if (!gratitudeTemplate) {
        setError('Gratitude Journal template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: gratitudeTemplate.id,
        name: 'Gratitude Journal',
        description: 'Cultivate positive awareness',
      });

      setGratitudeTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create gratitude journal');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <BookHeart className="w-8 h-8 text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gratitude Journal</h2>
            <p className="text-slate-600 mt-1">Cultivate positive awareness</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading gratitude journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <BookHeart className="w-8 h-8 text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gratitude Journal</h2>
            <p className="text-slate-600 mt-1">Cultivate positive awareness</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadGratitudeTracker}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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
          <BookHeart className="w-8 h-8 text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gratitude Journal</h2>
            <p className="text-slate-600 mt-1">Cultivate positive awareness</p>
          </div>
        </div>
        {gratitudeTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${gratitudeTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {gratitudeTracker ? (
        <PlannerTrackerBlock trackerId={gratitudeTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <BookHeart size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Gratitude Journal Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a gratitude journal to start tracking what you're thankful for
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Gratitude Journal
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
