import { useEffect, useState } from 'react';
import { Plus, Target, Edit2, Trash2 } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getLongTermGoals,
  createLongTermGoal,
  updateLongTermGoal,
  deleteLongTermGoal,
  type LongTermGoal
} from '../../../lib/visionService';

export function LongTermGoals() {
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    time_horizon: '1-3_years' as LongTermGoal['time_horizon'],
    category: 'personal' as LongTermGoal['category'],
    intent_notes: '',
    status: 'forming' as LongTermGoal['status']
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const data = await getLongTermGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateLongTermGoal(editingId, formData);
      } else {
        await createLongTermGoal({ ...formData, is_active: true });
      }
      await loadGoals();
      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      time_horizon: '1-3_years',
      category: 'personal',
      intent_notes: '',
      status: 'forming'
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(goal: LongTermGoal) {
    setFormData({
      title: goal.title,
      time_horizon: goal.time_horizon || '1-3_years',
      category: goal.category || 'personal',
      intent_notes: goal.intent_notes || '',
      status: goal.status
    });
    setEditingId(goal.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteLongTermGoal(id);
      await loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  }

  const categoryLabels = {
    career: 'Career',
    personal: 'Personal',
    health: 'Health',
    relationships: 'Relationships',
    financial: 'Financial',
    learning: 'Learning',
    other: 'Other'
  };

  const statusLabels = {
    forming: 'Forming',
    active: 'Active',
    evolving: 'Evolving',
    paused: 'Paused'
  };

  const statusColors = {
    forming: 'bg-slate-50 text-slate-700',
    active: 'bg-emerald-50 text-emerald-700',
    evolving: 'bg-blue-50 text-blue-700',
    paused: 'bg-amber-50 text-amber-700'
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Long-Term Goals</h1>
          </div>
          <p className="text-slate-600">High-level goals without pressure or tasks</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
          <p className="text-sm text-slate-700">
            These aren't action items - they're directions. No deadlines required. This feeds your Planning section, it doesn't replace it.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Long-Term Goal
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Goal' : 'New Long-Term Goal'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  placeholder="e.g., Build a creative practice, Develop deeper friendships"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time Horizon</label>
                  <select
                    value={formData.time_horizon}
                    onChange={e => setFormData({ ...formData, time_horizon: e.target.value as LongTermGoal['time_horizon'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="1-3_years">1-3 Years</option>
                    <option value="5_plus_years">5+ Years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as LongTermGoal['category'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Why This Matters</label>
                <textarea
                  value={formData.intent_notes}
                  onChange={e => setFormData({ ...formData, intent_notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  rows={3}
                  placeholder="The intent behind this goal..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as LongTermGoal['status'] })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  {editingId ? 'Update' : 'Save'} Goal
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No long-term goals yet</h3>
              <p className="text-slate-600 mb-4">Start by adding a direction you want to move towards</p>
            </div>
          ) : (
            goals.map(goal => (
              <div
                key={goal.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{goal.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[goal.status]}`}>
                        {statusLabels[goal.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      {goal.category && (
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                          {categoryLabels[goal.category]}
                        </span>
                      )}
                      {goal.time_horizon && (
                        <span>{goal.time_horizon === '1-3_years' ? '1-3 Years' : '5+ Years'}</span>
                      )}
                    </div>
                    {goal.intent_notes && (
                      <p className="text-sm text-slate-700 italic leading-relaxed">{goal.intent_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
