/**
 * Mental Health Check-Ins View for Planner
 * 
 * Uses Tracker Studio to display mental health tracking. Finds or creates
 * a Mental Health Check-in instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function MentalHealthCheckinsView() {
  const navigate = useNavigate();
  const [mentalHealthTracker, setMentalHealthTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMentalHealthTracker();
  }, []);

  const loadMentalHealthTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const mentalHealthTemplate = templates.find(t => t.name === 'Mental Health Check-in' && t.scope === 'global');
      
      if (!mentalHealthTemplate) {
        setError('Mental Health Check-in template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === mentalHealthTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setMentalHealthTracker(existingTracker);
      } else {
        setMentalHealthTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mental health tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const mentalHealthTemplate = templates.find(t => t.name === 'Mental Health Check-in' && t.scope === 'global');
      
      if (!mentalHealthTemplate) {
        setError('Mental Health Check-in template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: mentalHealthTemplate.id,
        name: 'Mental Health Check-Ins',
        description: 'Emotional awareness, not diagnosis',
      });

      setMentalHealthTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mental health tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-violet-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mental Health Check-Ins</h2>
            <p className="text-slate-600 mt-1">Emotional awareness, not diagnosis</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading mental health tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-violet-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mental Health Check-Ins</h2>
            <p className="text-slate-600 mt-1">Emotional awareness, not diagnosis</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadMentalHealthTracker}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
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
          <Brain className="w-8 h-8 text-violet-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mental Health Check-Ins</h2>
            <p className="text-slate-600 mt-1">Emotional awareness, not diagnosis</p>
          </div>
        </div>
        {mentalHealthTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${mentalHealthTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {mentalHealthTracker ? (
        <PlannerTrackerBlock trackerId={mentalHealthTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Brain size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mental Health Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a mental health tracker to start tracking your emotional well-being
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Mental Health Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
