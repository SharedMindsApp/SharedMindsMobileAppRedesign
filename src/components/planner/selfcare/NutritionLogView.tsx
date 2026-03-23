/**
 * Nutrition Log View for Planner
 * 
 * Uses Tracker Studio to display nutrition tracking. Finds or creates
 * a Nutrition Log instance from the Nutrition Log template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function NutritionLogView() {
  const navigate = useNavigate();
  const [nutritionTracker, setNutritionTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNutritionTracker();
  }, []);

  const loadNutritionTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const nutritionTemplate = templates.find(t => t.name === 'Nutrition Log' && t.scope === 'global');
      
      if (!nutritionTemplate) {
        setError('Nutrition Log template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === nutritionTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setNutritionTracker(existingTracker);
      } else {
        setNutritionTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nutrition log');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const nutritionTemplate = templates.find(t => t.name === 'Nutrition Log' && t.scope === 'global');
      
      if (!nutritionTemplate) {
        setError('Nutrition Log template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: nutritionTemplate.id,
        name: 'Nutrition Log',
        description: 'Encourage awareness, not restriction',
      });

      setNutritionTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nutrition log');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Utensils className="w-8 h-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Nutrition Log</h2>
            <p className="text-slate-600 mt-1">Encourage awareness, not restriction</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading nutrition log...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Utensils className="w-8 h-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Nutrition Log</h2>
            <p className="text-slate-600 mt-1">Encourage awareness, not restriction</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadNutritionTracker}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
          <Utensils className="w-8 h-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Nutrition Log</h2>
            <p className="text-slate-600 mt-1">Encourage awareness, not restriction</p>
          </div>
        </div>
        {nutritionTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${nutritionTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {nutritionTracker ? (
        <PlannerTrackerBlock trackerId={nutritionTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Utensils size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Nutrition Log Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a nutrition log to start tracking your meals
            </p>
            <button
              onClick={handleCreateTracker}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Nutrition Log
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
