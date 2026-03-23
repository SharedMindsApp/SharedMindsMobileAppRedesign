/**
 * Monthly Vision Check-in View for Planner
 * 
 * Uses Tracker Studio to display monthly vision check-ins. Finds or creates
 * a Monthly Vision Check-in instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function MonthlyVisionCheckinView() {
  const navigate = useNavigate();
  const [checkinTracker, setCheckinTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCheckinTracker();
  }, []);

  const loadCheckinTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const checkinTemplate = templates.find(t => t.name === 'Monthly Vision Check-in' && t.scope === 'global');
      
      if (!checkinTemplate) {
        setError('Monthly Vision Check-in template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === checkinTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setCheckinTracker(existingTracker);
      } else {
        setCheckinTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly check-in tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const checkinTemplate = templates.find(t => t.name === 'Monthly Vision Check-in' && t.scope === 'global');
      
      if (!checkinTemplate) {
        setError('Monthly Vision Check-in template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: checkinTemplate.id,
        name: 'Monthly Vision Check-in',
        description: 'Lightweight alignment tracking',
      });

      setCheckinTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create monthly check-in tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-slate-700" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Monthly Check-In</h2>
            <p className="text-slate-600 mt-1">Lightweight alignment tracking</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading monthly check-in tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-slate-700" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Monthly Check-In</h2>
            <p className="text-slate-600 mt-1">Lightweight alignment tracking</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadCheckinTracker}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
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
          <CheckCircle className="w-8 h-8 text-slate-700" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Monthly Check-In</h2>
            <p className="text-slate-600 mt-1">Lightweight alignment tracking</p>
          </div>
        </div>
        {checkinTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${checkinTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {checkinTracker ? (
        <PlannerTrackerBlock trackerId={checkinTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <CheckCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Monthly Check-In Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a monthly check-in tracker to start tracking your alignment
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Monthly Check-In Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
