/**
 * Exercise Tracker View for Planner
 * 
 * Uses Tracker Studio to display exercise tracking. Finds or creates
 * an Exercise Tracker instance from the Exercise Tracker template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker, TrackerTemplate } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function ExerciseTrackerView() {
  const navigate = useNavigate();
  const [exerciseTracker, setExerciseTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExerciseTracker();
  }, []);

  const loadExerciseTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all trackers
      const trackers = await listTrackers(false);
      
      // Find Exercise Tracker template
      const templates = await listTemplates(false);
      const exerciseTemplate = templates.find(t => t.name === 'Exercise Tracker' && t.scope === 'global');
      
      if (!exerciseTemplate) {
        setError('Exercise Tracker template not found. Please contact support.');
        return;
      }

      // Find existing exercise tracker created from this template
      const existingTracker = trackers.find(
        t => t.template_id === exerciseTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setExerciseTracker(existingTracker);
      } else {
        setExerciseTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const exerciseTemplate = templates.find(t => t.name === 'Exercise Tracker' && t.scope === 'global');
      
      if (!exerciseTemplate) {
        setError('Exercise Tracker template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: exerciseTemplate.id,
        name: 'Exercise Tracker',
        description: 'Support movement without obsession',
      });

      setExerciseTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Exercise Tracker</h2>
            <p className="text-slate-600 mt-1">Support movement without obsession</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading exercise tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Exercise Tracker</h2>
            <p className="text-slate-600 mt-1">Support movement without obsession</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadExerciseTracker}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
          <Activity className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Exercise Tracker</h2>
            <p className="text-slate-600 mt-1">Support movement without obsession</p>
          </div>
        </div>
        {exerciseTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${exerciseTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {exerciseTracker ? (
        <PlannerTrackerBlock trackerId={exerciseTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Activity size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exercise Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create an exercise tracker to start tracking your movement
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Exercise Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
