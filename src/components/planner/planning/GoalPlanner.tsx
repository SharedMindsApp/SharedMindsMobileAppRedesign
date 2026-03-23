import { PlannerShell } from '../PlannerShell';
import { Target, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getActiveGoals } from '../../../lib/planningService';
import type { LongTermGoal } from '../../../lib/visionService';

export function GoalPlanner() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await getActiveGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (filterCategory !== 'all' && goal.category !== filterCategory) return false;
    if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
    return true;
  });

  const categoryLabels: Record<string, string> = {
    career: 'Career',
    personal: 'Personal',
    health: 'Health',
    relationships: 'Relationships',
    financial: 'Financial',
    learning: 'Learning',
    other: 'Other'
  };

  const statusLabels: Record<string, string> = {
    forming: 'Forming',
    active: 'Active',
    evolving: 'Evolving',
    paused: 'Paused'
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Goal Planner</h1>
          </div>
          <p className="text-slate-600">Connect long-term goals to active planning</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Filters</h3>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="all">All Categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <option value="all">All Status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No goals found</h3>
              <p className="text-slate-600 mb-4">
                Create long-term goals in the Vision section to see them here
              </p>
            </div>
          ) : (
            filteredGoals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{goal.title}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {categoryLabels[goal.category || 'other']}
                      </span>
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        goal.status === 'forming' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {statusLabels[goal.status]}
                      </span>
                      {goal.time_horizon && (
                        <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                          {goal.time_horizon === '1-3_years' ? '1-3 years' : '5+ years'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {goal.intent_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-1">Why this matters</p>
                    <p className="text-sm text-slate-600">{goal.intent_notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-slate-700">
            This is an orientation view. To create or edit goals, visit the Vision section.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
