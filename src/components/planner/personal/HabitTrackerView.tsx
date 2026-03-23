/**
 * Habit Tracker View for Planner
 * 
 * Uses Tracker Studio to display habit tracking. Finds or creates
 * a Habit Tracker instance from the Habit Tracker template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker, TrackerTemplate } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function HabitTrackerView() {
  const navigate = useNavigate();
  const [habitTracker, setHabitTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHabitTracker();
  }, []);

  const loadHabitTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all trackers
      const trackers = await listTrackers(false);
      
      // Find Habit Tracker template
      const templates = await listTemplates(false);
      const habitTemplate = templates.find(t => t.name === 'Habit Tracker' && t.scope === 'global');
      
      if (!habitTemplate) {
        setError('Habit Tracker template not found. Please contact support.');
        return;
      }

      // Find existing habit tracker created from this template
      const existingTracker = trackers.find(
        t => t.template_id === habitTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setHabitTracker(existingTracker);
      } else {
        // No tracker exists yet - user will need to create one
        setHabitTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load habit tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      // Get Habit Tracker template
      const templates = await listTemplates(false);
      const habitTemplate = templates.find(t => t.name === 'Habit Tracker' && t.scope === 'global');
      
      if (!habitTemplate) {
        setError('Habit Tracker template not found');
        return;
      }

      // Create tracker from template
      const tracker = await createTrackerFromTemplate({
        template_id: habitTemplate.id,
        name: 'Habit Tracker',
        description: 'Track your daily habits',
      });

      setHabitTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create habit tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Repeat className="w-8 h-8 text-emerald-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Habit Tracker</h2>
            <p className="text-slate-600 mt-1">Support habits without streak pressure</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading habit tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Repeat className="w-8 h-8 text-emerald-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Habit Tracker</h2>
            <p className="text-slate-600 mt-1">Support habits without streak pressure</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadHabitTracker}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
          <Repeat className="w-8 h-8 text-emerald-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Habit Tracker</h2>
            <p className="text-slate-600 mt-1">Support habits without streak pressure</p>
          </div>
        </div>
        {habitTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${habitTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {habitTracker ? (
        <PlannerTrackerBlock trackerId={habitTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Repeat size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Habit Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a habit tracker to start tracking your daily habits
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Habit Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
