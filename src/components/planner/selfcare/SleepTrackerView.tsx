/**
 * Sleep Tracker View for Planner
 * 
 * Uses Tracker Studio to display sleep tracking. Finds or creates
 * a Sleep Tracker instance from the Sleep Tracker template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker, TrackerTemplate } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function SleepTrackerView() {
  const navigate = useNavigate();
  const [sleepTracker, setSleepTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSleepTracker();
  }, []);

  const loadSleepTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all trackers
      const trackers = await listTrackers(false);
      
      // Find Sleep Tracker template
      const templates = await listTemplates(false);
      const sleepTemplate = templates.find(t => t.name === 'Sleep Tracker' && t.scope === 'global');
      
      if (!sleepTemplate) {
        setError('Sleep Tracker template not found. Please contact support.');
        return;
      }

      // Find existing sleep tracker created from this template
      const existingTracker = trackers.find(
        t => t.template_id === sleepTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setSleepTracker(existingTracker);
      } else {
        // No tracker exists yet - user will need to create one
        setSleepTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sleep tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      // Get Sleep Tracker template
      const templates = await listTemplates(false);
      const sleepTemplate = templates.find(t => t.name === 'Sleep Tracker' && t.scope === 'global');
      
      if (!sleepTemplate) {
        setError('Sleep Tracker template not found');
        return;
      }

      // Create tracker from template
      const tracker = await createTrackerFromTemplate({
        template_id: sleepTemplate.id,
        name: 'Sleep Tracker',
        description: 'Track your sleep quality and duration',
      });

      setSleepTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sleep tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-8 h-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sleep Tracker</h2>
            <p className="text-slate-600 mt-1">Track rest gently</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading sleep tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-8 h-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sleep Tracker</h2>
            <p className="text-slate-600 mt-1">Track rest gently</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadSleepTracker}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <Moon className="w-8 h-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sleep Tracker</h2>
            <p className="text-slate-600 mt-1">Track rest gently</p>
          </div>
        </div>
        {sleepTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${sleepTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {sleepTracker ? (
        <PlannerTrackerBlock trackerId={sleepTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Moon size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sleep Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a sleep tracker to start tracking your rest patterns
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Sleep Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
