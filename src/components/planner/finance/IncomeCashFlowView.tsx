/**
 * Income & Cash Flow View for Planner
 * 
 * Uses Tracker Studio to display income tracking. Finds or creates
 * an Income & Cash Flow instance from the template.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { listTrackers, createTrackerFromTemplate } from '../../../lib/trackerStudio/trackerService';
import { listTemplates } from '../../../lib/trackerStudio/trackerTemplateService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { PlannerTrackerBlock } from '../tracker/PlannerTrackerBlock';

export function IncomeCashFlowView() {
  const navigate = useNavigate();
  const [incomeTracker, setIncomeTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncomeTracker();
  }, []);

  const loadIncomeTracker = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackers = await listTrackers(false);
      const templates = await listTemplates(false);
      const incomeTemplate = templates.find(t => t.name === 'Income & Cash Flow' && t.scope === 'global');
      
      if (!incomeTemplate) {
        setError('Income & Cash Flow template not found. Please contact support.');
        return;
      }

      const existingTracker = trackers.find(
        t => t.template_id === incomeTemplate.id && !t.archived_at
      );

      if (existingTracker) {
        setIncomeTracker(existingTracker);
      } else {
        setIncomeTracker(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracker = async () => {
    try {
      setCreating(true);
      setError(null);

      const templates = await listTemplates(false);
      const incomeTemplate = templates.find(t => t.name === 'Income & Cash Flow' && t.scope === 'global');
      
      if (!incomeTemplate) {
        setError('Income & Cash Flow template not found');
        return;
      }

      const tracker = await createTrackerFromTemplate({
        template_id: incomeTemplate.id,
        name: 'Income & Cash Flow',
        description: 'Track your income sources and cash flow',
      });

      setIncomeTracker(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create income tracker');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Income & Cash Flow</h2>
            <p className="text-slate-600 mt-1">Track your income sources and cash flow</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading income tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Income & Cash Flow</h2>
            <p className="text-slate-600 mt-1">Track your income sources and cash flow</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={loadIncomeTracker}
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
          <DollarSign className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Income & Cash Flow</h2>
            <p className="text-slate-600 mt-1">Track your income sources and cash flow</p>
          </div>
        </div>
        {incomeTracker && (
          <button
            onClick={() => navigate(`/tracker-studio/tracker/${incomeTracker.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Open in Tracker Studio
          </button>
        )}
      </div>

      {incomeTracker ? (
        <PlannerTrackerBlock trackerId={incomeTracker.id} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <DollarSign size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Income Tracker Yet</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create an income tracker to start tracking your cash flow
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
                  Create Income Tracker
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
