/**
 * Mindfulness & Meditation View for Planner
 * 
 * Uses Tracker Studio to display mindfulness tracking. Finds or creates
 * a Mindfulness & Meditation instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function MindfulnessMeditationView() {
  const navigate = useNavigate();
  const [mindfulnessTracker, setMindfulnessTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMindfulnessTracker();
  }, []);

  const loadMindfulnessTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const mindfulnessTemplate = templates.find(t => t.name === 'Mindfulness & Meditation' && t.scope === 'global');
      
      if (!mindfulnessTemplate) {
        setError('Mindfulness & Meditation template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === mindfulnessTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setMindfulnessTracker(existingTracker);
      } else {
        setMindfulnessTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mindfulness tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const mindfulnessTemplate = templates.find(t => t.name === 'Mindfulness & Meditation' && t.scope === 'global');
      
      if (!mindfulnessTemplate) {
        setError('Mindfulness & Meditation template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: mindfulnessTemplate.id,
        name: 'Mindfulness & Meditation',
        description: 'Presence, not performance',
      });

      setMindfulnessTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mindfulness tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-teal-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mindfulness & Meditation</h2>
            <p className="text-slate-600 mt-1">Presence, not performance</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading mindfulness tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-teal-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mindfulness & Meditation</h2>
            <p className="text-slate-600 mt-1">Presence, not performance</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadMindfulnessTracker}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
          <Sparkles className="w-8 h-8 text-teal-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mindfulness & Meditation</h2>
            <p className="text-slate-600 mt-1">Presence, not performance</p>
          </div>
        </div>
        {mindfulnessTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${mindfulnessTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {mindfulnessTracker ? (
        <PlannerTrackerBlock trackerId={mindfulnessTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Sparkles size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mindfulness Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a mindfulness tracker to start tracking your meditation practice
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Mindfulness Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
