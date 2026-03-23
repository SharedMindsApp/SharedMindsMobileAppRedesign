/**
 * Growth Tracking View for Planner
 * 
 * Uses Tracker Studio to display growth tracking. Finds or creates
 * a Growth Tracking instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function GrowthTrackingView() {
  const navigate = useNavigate();
  const [growthTracker, setGrowthTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrowthTracker();
  }, []);

  const loadGrowthTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const growthTemplate = templates.find(t => t.name === 'Growth Tracking' && t.scope === 'global');
      
      if (!growthTemplate) {
        setError('Growth Tracking template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === growthTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setGrowthTracker(existingTracker);
      } else {
        setGrowthTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load growth tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const growthTemplate = templates.find(t => t.name === 'Growth Tracking' && t.scope === 'global');
      
      if (!growthTemplate) {
        setError('Growth Tracking template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: growthTemplate.id,
        name: 'Growth Tracking',
        description: 'Track your personal development journey',
      });

      setGrowthTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create growth tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Growth Tracking</h2>
            <p className="text-slate-600 mt-1">Track your personal development journey</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading growth tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Growth Tracking</h2>
            <p className="text-slate-600 mt-1">Track your personal development journey</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadGrowthTracker}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
          <TrendingUp className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Growth Tracking</h2>
            <p className="text-slate-600 mt-1">Track your personal development journey</p>
          </div>
        </div>
        {growthTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${growthTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {growthTracker ? (
        <PlannerTrackerBlock trackerId={growthTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Growth Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a growth tracker to start tracking your personal development
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Growth Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
