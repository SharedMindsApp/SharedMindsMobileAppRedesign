import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Heart, Plus, Trash2, Edit2, X, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { WellnessGoal } from '../../../lib/selfCareService';

type Category = 'physical' | 'mental' | 'emotional' | 'social';

const categoryColors = {
  physical: 'bg-orange-100 text-orange-700 border-orange-200',
  mental: 'bg-purple-100 text-purple-700 border-purple-200',
  emotional: 'bg-rose-100 text-rose-700 border-rose-200',
  social: 'bg-blue-100 text-blue-700 border-blue-200',
};

export function WellnessGoals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'physical' as Category,
    timeframe: '',
    reflection: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getWellnessGoals(spaceId);
        setGoals(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    try {
      if (editingId) {
        await selfCareService.updateWellnessGoal(editingId, formData);
      } else {
        await selfCareService.createWellnessGoal({
          ...formData,
          household_id: householdId,
        });
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleEdit = (goal: WellnessGoal) => {
    setEditingId(goal.id);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      timeframe: goal.timeframe || '',
      reflection: goal.reflection || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await selfCareService.deleteWellnessGoal(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const toggleActive = async (goal: WellnessGoal) => {
    try {
      await selfCareService.updateWellnessGoal(goal.id, {
        is_active: !goal.is_active,
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'physical',
      timeframe: '',
      reflection: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const activeGoals = goals.filter(g => g.is_active);
  const completedGoals = goals.filter(g => !g.is_active);

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/selfcare')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Self-Care</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Wellness Goals</h1>
                <p className="text-slate-600">Set gentle intentions for your wellbeing</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Goal
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Move more, Sleep better..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this goal mean to you?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400"
                  >
                    <option value="physical">Physical</option>
                    <option value="mental">Mental</option>
                    <option value="emotional">Emotional</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeframe (optional)</label>
                  <input
                    type="text"
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                    placeholder="e.g., This month, Ongoing..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reflection Notes</label>
                <textarea
                  value={formData.reflection}
                  onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                  placeholder="How are you feeling about this goal?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                >
                  {editingId ? 'Update' : 'Create'} Goal
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Active Goals</h2>
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-800">{goal.title}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${categoryColors[goal.category]}`}>
                            {goal.category}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-slate-600 mb-2">{goal.description}</p>
                        )}
                        {goal.timeframe && (
                          <p className="text-xs text-slate-500">Timeframe: {goal.timeframe}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {goal.reflection && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-slate-700">{goal.reflection}</p>
                      </div>
                    )}
                    <button
                      onClick={() => toggleActive(goal)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Mark as Completed
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Completed Goals</h2>
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="bg-slate-50 rounded-lg p-5 border border-slate-200 opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-600">{goal.title}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${categoryColors[goal.category]}`}>
                            {goal.category}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-slate-500">{goal.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleActive(goal)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goals.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No wellness goals yet</h3>
              <p className="text-slate-600 mb-4">Start by setting a gentle intention for your wellbeing</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Create Your First Goal
              </button>
            </div>
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
