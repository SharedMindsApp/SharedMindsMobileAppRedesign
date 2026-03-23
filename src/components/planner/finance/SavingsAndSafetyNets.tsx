import { useEffect, useState } from 'react';
import { Plus, PiggyBank, Target, Edit2, Trash2 } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  type SavingsGoal
} from '../../../lib/financeService';

export function SavingsAndSafetyNets() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal_name: '',
    goal_type: 'emergency_fund' as SavingsGoal['goal_type'],
    target_amount: '',
    current_amount: '0',
    target_date: '',
    purpose: '',
    priority: 0,
    notes: '',
    currency: 'USD',
    is_active: true
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const data = await getSavingsGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading savings goals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        target_date: formData.target_date || undefined
      };

      if (editingId) {
        await updateSavingsGoal(editingId, data);
      } else {
        await createSavingsGoal(data);
      }

      await loadGoals();
      resetForm();
    } catch (error) {
      console.error('Error saving savings goal:', error);
    }
  }

  function resetForm() {
    setFormData({
      goal_name: '',
      goal_type: 'emergency_fund',
      target_amount: '',
      current_amount: '0',
      target_date: '',
      purpose: '',
      priority: 0,
      notes: '',
      currency: 'USD',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(goal: SavingsGoal) {
    setFormData({
      goal_name: goal.goal_name,
      goal_type: goal.goal_type,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || '',
      purpose: goal.purpose || '',
      priority: goal.priority,
      notes: goal.notes || '',
      currency: goal.currency,
      is_active: goal.is_active
    });
    setEditingId(goal.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await deleteSavingsGoal(id);
      await loadGoals();
    } catch (error) {
      console.error('Error deleting savings goal:', error);
    }
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const goalTypeLabels: Record<SavingsGoal['goal_type'], string> = {
    emergency_fund: 'Emergency Fund',
    sinking_fund: 'Sinking Fund',
    short_term: 'Short-term Goal',
    medium_term: 'Medium-term Goal',
    long_term: 'Long-term Goal'
  };

  const goalTypeColors: Record<SavingsGoal['goal_type'], string> = {
    emergency_fund: 'bg-rose-50 text-rose-700',
    sinking_fund: 'bg-amber-50 text-amber-700',
    short_term: 'bg-cyan-50 text-cyan-700',
    medium_term: 'bg-blue-50 text-blue-700',
    long_term: 'bg-purple-50 text-purple-700'
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Savings & Safety Nets</h1>
          <p className="text-slate-600">Build security and prepare for what matters</p>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 mb-8 border border-teal-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-teal-700 font-medium mb-1">Total Saved</p>
              <p className="text-3xl font-bold text-slate-900">${totalSaved.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
              <PiggyBank className="w-8 h-8 text-teal-600" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">of ${totalTarget.toLocaleString()} total target</span>
            <span className="font-semibold text-teal-700">{Math.round(overallProgress)}%</span>
          </div>
          <div className="mt-3 w-full bg-teal-100 rounded-full h-3">
            <div
              className="bg-teal-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Savings Goal
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Savings Goal' : 'New Savings Goal'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.goal_name}
                    onChange={e => setFormData({ ...formData, goal_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Emergency Fund, Vacation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.goal_type}
                    onChange={e => setFormData({ ...formData, goal_type: e.target.value as SavingsGoal['goal_type'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {Object.entries(goalTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.target_amount}
                    onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.current_amount}
                    onChange={e => setFormData({ ...formData, current_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="What is this savings for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
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
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No savings goals yet</h3>
              <p className="text-slate-600 mb-4">Start building your safety net</p>
            </div>
          ) : (
            goals.map(goal => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-teal-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">{goal.goal_name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${goalTypeColors[goal.goal_type]}`}>
                          {goalTypeLabels[goal.goal_type]}
                        </span>
                      </div>
                      {goal.purpose && (
                        <p className="text-sm text-slate-600 mb-3">{goal.purpose}</p>
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
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">
                      ${goal.current_amount.toLocaleString()} of ${goal.target_amount.toLocaleString()}
                    </span>
                    <span className="font-semibold text-teal-700">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  {goal.target_date && (
                    <p className="text-xs text-slate-500 mt-2">
                      Target: {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
